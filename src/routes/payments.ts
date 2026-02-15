import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { getActiveServiceById, getServiceOwnerId } from '../db/services.js'
import { insertUsageLedgerEntry } from '../db/usage-ledger.js'
import {
  createPendingApiRequest,
  getApiRequestAuditRecord,
  markApiRequestExecutionFailed,
  markApiRequestExecutionSucceeded,
  markApiRequestVerificationFailed,
  markApiRequestVerified,
} from '../db/api-requests.js'
import { executeDownstreamCall } from '../services/downstream-client.js'
import { verifyPaymentTx } from '../services/payment-verification.js'
import { createSimulatedPayment } from '../services/payment-simulator.js'
import { evaluateServicePolicyForExecute } from '../services/policy-engine.js'
import { requireAgentApiKey } from '../middleware/agent-auth.js'
import { readOwnerIdFromHeader, readRoleFromHeader, requireRoles } from '../middleware/authz.js'

const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'SERVICE_NOT_FOUND',
  'SERVICE_INACTIVE',
  'PAYMENT_NOT_FOUND',
  'PAYMENT_TOKEN_MISMATCH',
  'PAYMENT_INSUFFICIENT',
  'PAYMENT_RECIPIENT_MISMATCH',
  'MEMO_MISMATCH',
  'REPLAY_DETECTED',
  'DOWNSTREAM_ERROR',
  'VERIFICATION_NOT_IMPLEMENTED',
  'POLICY_BLOCKED',
])

type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

const quoteRequestSchema = z.object({
  serviceId: z.string().min(1),
  endpoint: z.string().min(1),
})

const quoteResponseSchema = z.object({
  serviceId: z.string(),
  token: z.string(),
  amount: z.string(),
  decimals: z.number().int().nonnegative(),
  recipient: z.string(),
  memoTemplate: z.string(),
  chainId: z.number().int(),
})

const executeRequestSchema = z.object({
  serviceId: z.string().min(1),
  requestId: z.string().min(1).max(128),
  consumerId: z.string().trim().min(1).max(128).optional(),
  paymentTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'paymentTxHash must be a 32-byte hex transaction hash'),
  payload: z.record(z.string(), z.unknown()),
})

const simulatePaymentSchema = z.object({
  serviceId: z.string().min(1),
  requestId: z.string().min(1).max(128),
  amountAtomic: z.string().regex(/^\d+$/).optional(),
  payerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
})

function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  requestId?: string,
  details?: unknown,
) {
  return reply.status(statusCode).send({
    ok: false,
    requestId,
    error: {
      code,
      message,
      details,
    },
  })
}

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/payments/simulate', { preHandler: requireRoles('admin', 'provider') }, async (request, reply) => {
    if (!env.ENABLE_PAYMENT_SIMULATION) {
      return sendError(reply, 403, 'VERIFICATION_NOT_IMPLEMENTED', 'Payment simulation is disabled')
    }

    const parsed = simulatePaymentSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Invalid simulate payment payload',
        undefined,
        parsed.error.flatten(),
      )
    }

    const { serviceId, requestId } = parsed.data
    const service = await getActiveServiceById(serviceId)
    if (!service) {
      return sendError(reply, 404, 'SERVICE_NOT_FOUND', 'Service does not exist', requestId)
    }
    if (!service.active) {
      return sendError(reply, 403, 'SERVICE_INACTIVE', 'Service is not active', requestId)
    }

    const role = readRoleFromHeader(request)
    if (role === 'provider') {
      const ownerId = readOwnerIdFromHeader(request)
      if (!ownerId) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Missing x-owner-id header for provider access', requestId)
      }
      const serviceOwnerId = await getServiceOwnerId(serviceId)
      if (serviceOwnerId !== undefined && serviceOwnerId !== ownerId) {
        return reply.status(403).send({
          ok: false,
          requestId,
          error: {
            code: 'AUTHZ_FORBIDDEN',
            message: 'Provider cannot simulate payments for services they do not own',
            details: { providedOwnerId: ownerId, serviceOwnerId },
          },
        })
      }
    }

    const simulated = createSimulatedPayment({
      service,
      requestId,
      amountAtomic: parsed.data.amountAtomic ?? service.priceAtomic,
      payerAddress: parsed.data.payerAddress ?? env.SIMULATED_PAYER_ADDRESS,
    })

    return reply.status(201).send({
      ok: true,
      requestId,
      simulation: {
        paymentTxHash: simulated.paymentTxHash,
        payer: simulated.payer,
        recipient: simulated.recipient,
        amountAtomic: simulated.amountAtomic,
        token: simulated.token,
        memo: simulated.memo,
        simulated: true,
      },
    })
  })

  app.get('/requests/:requestId', async (request, reply) => {
    const paramsSchema = z.object({
      requestId: z.string().min(1),
    })
    const querySchema = z.object({
      serviceId: z.string().min(1),
    })

    const parsedParams = paramsSchema.safeParse(request.params)
    const parsedQuery = querySchema.safeParse(request.query)

    if (!parsedParams.success || !parsedQuery.success) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request status query payload')
    }

    const record = await getApiRequestAuditRecord({
      serviceId: parsedQuery.data.serviceId,
      requestId: parsedParams.data.requestId,
    })

    if (!record) {
      return sendError(
        reply,
        404,
        'PAYMENT_NOT_FOUND',
        'No audit record found for this serviceId/requestId',
        parsedParams.data.requestId,
      )
    }

    return reply.status(200).send({
      ok: true,
      requestId: parsedParams.data.requestId,
      audit: record,
    })
  })

  app.post('/payments/quote', async (request, reply) => {
    const parsed = quoteRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Invalid quote request payload',
        undefined,
        parsed.error.flatten(),
      )
    }

    const { serviceId } = parsed.data
    const service = await getActiveServiceById(serviceId)

    if (!service) {
      return sendError(reply, 404, 'SERVICE_NOT_FOUND', 'Service does not exist')
    }

    if (!service.active) {
      return sendError(reply, 403, 'SERVICE_INACTIVE', 'Service is not active')
    }

    const response = {
      serviceId: service.id,
      token: service.tokenAddress,
      amount: service.priceAtomic,
      decimals: 6,
      recipient: service.providerWallet,
      memoTemplate: `keccak256(${service.memoPrefix}:v1:${service.id}:{requestId})`,
      chainId: env.CHAIN_ID,
    }

    const checked = quoteResponseSchema.parse(response)
    return reply.status(200).send(checked)
  })

  app.post('/payments/execute', { preHandler: requireAgentApiKey }, async (request, reply) => {
    const logUsage = async (params: Parameters<typeof insertUsageLedgerEntry>[0]) => {
      try {
        await insertUsageLedgerEntry(params)
      } catch (error) {
        app.log.error({ error }, 'Failed to write usage ledger entry')
      }
    }

    const parsed = executeRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      await logUsage({
        status: 'VALIDATION_FAILED',
        errorCode: 'VALIDATION_ERROR',
        metaJson: parsed.error.flatten(),
      })

      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Invalid execute request payload',
        undefined,
        parsed.error.flatten(),
      )
    }

    const { serviceId, requestId, consumerId, paymentTxHash, payload } = parsed.data
    const service = await getActiveServiceById(serviceId)

    if (!service) {
      await logUsage({
        serviceId,
        requestId,
        paymentTxHash,
        status: 'SERVICE_NOT_FOUND',
        errorCode: 'SERVICE_NOT_FOUND',
      })

      return sendError(reply, 404, 'SERVICE_NOT_FOUND', 'Service does not exist', requestId)
    }

    if (!service.active) {
      await logUsage({
        serviceId,
        requestId,
        paymentTxHash,
        status: 'SERVICE_INACTIVE',
        errorCode: 'SERVICE_INACTIVE',
      })

      return sendError(reply, 403, 'SERVICE_INACTIVE', 'Service is not active', requestId)
    }

    const createRequestResult = await createPendingApiRequest({
      serviceId,
      requestId,
      paymentTxHash,
    })

    if (!createRequestResult.ok) {
      await logUsage({
        serviceId,
        requestId,
        paymentTxHash,
        status: 'REPLAY_BLOCKED',
        errorCode: 'REPLAY_DETECTED',
        metaJson: { replayReason: createRequestResult.replayReason },
      })

      return sendError(
        reply,
        409,
        'REPLAY_DETECTED',
        'Duplicate requestId or paymentTxHash detected',
        requestId,
        { replayReason: createRequestResult.replayReason },
      )
    }

    const policyDecision = await evaluateServicePolicyForExecute({
      serviceId,
      consumerId,
      servicePriceAtomic: service.priceAtomic,
    })

    if (!policyDecision.allowed) {
      await markApiRequestVerificationFailed({
        serviceId,
        requestId,
        errorCode: 'POLICY_BLOCKED',
      })
      await logUsage({
        serviceId,
        requestId,
        paymentTxHash,
        status: 'POLICY_BLOCKED',
        errorCode: policyDecision.policyCode,
        metaJson: {
          consumerId: consumerId ?? null,
          ...policyDecision.details,
        },
      })

      return sendError(reply, 403, 'POLICY_BLOCKED', policyDecision.message, requestId, {
        policyCode: policyDecision.policyCode,
        ...policyDecision.details,
      })
    }

    const verification = await verifyPaymentTx({
      paymentTxHash: paymentTxHash as `0x${string}`,
      requestId,
      service,
    })

    if (!verification.ok) {
      await markApiRequestVerificationFailed({
        serviceId,
        requestId,
        errorCode: verification.code,
      })
      await logUsage({
        serviceId,
        requestId,
        paymentTxHash,
        status: 'VERIFICATION_FAILED',
        errorCode: verification.code,
        metaJson: verification.details,
      })

      return sendError(
        reply,
        verification.code === 'PAYMENT_NOT_FOUND' ? 404 : 402,
        verification.code,
        verification.message,
        requestId,
        verification.details,
      )
    }

    await markApiRequestVerified({
      serviceId,
      requestId,
      payerAddress: verification.details.payer,
      amountAtomic: verification.details.amountAtomic,
      memoRaw: verification.details.memo,
    })

    const downstream = await executeDownstreamCall({
      serviceId,
      requestId,
      payload,
    })

    if (!downstream.ok) {
      await markApiRequestExecutionFailed({
        serviceId,
        requestId,
        errorCode: 'DOWNSTREAM_ERROR',
      })
      await logUsage({
        serviceId,
        requestId,
        paymentTxHash,
        status: 'EXECUTION_FAILED',
        errorCode: 'DOWNSTREAM_ERROR',
        amountAtomic: verification.details.amountAtomic,
        payerAddress: verification.details.payer,
        metaJson: {
          statusCode: downstream.statusCode,
          message: downstream.errorMessage,
        },
      })

      return sendError(
        reply,
        downstream.statusCode >= 400 ? downstream.statusCode : 502,
        'DOWNSTREAM_ERROR',
        downstream.errorMessage ?? 'Downstream execution failed',
        requestId,
      )
    }

    await markApiRequestExecutionSucceeded({
      serviceId,
      requestId,
      responseHash: downstream.responseHash,
    })
    await logUsage({
      serviceId,
      requestId,
      paymentTxHash,
      status: 'EXECUTION_SUCCEEDED',
      amountAtomic: verification.details.amountAtomic,
      payerAddress: verification.details.payer,
      metaJson: {
        responseHash: downstream.responseHash,
      },
    })

    return reply.status(200).send({
      ok: true,
      requestId,
      txHash: paymentTxHash,
      verification: verification.details,
      result: downstream.result,
    })
  })
}
