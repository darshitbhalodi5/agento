import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { getActiveServiceById } from '../db/services.js'
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
  paymentTxHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'paymentTxHash must be a 32-byte hex transaction hash'),
  payload: z.record(z.string(), z.unknown()),
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

  app.post('/payments/execute', async (request, reply) => {
    const parsed = executeRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return sendError(
        reply,
        400,
        'VALIDATION_ERROR',
        'Invalid execute request payload',
        undefined,
        parsed.error.flatten(),
      )
    }

    const { serviceId, requestId, paymentTxHash, payload } = parsed.data
    const service = await getActiveServiceById(serviceId)

    if (!service) {
      return sendError(reply, 404, 'SERVICE_NOT_FOUND', 'Service does not exist', requestId)
    }

    if (!service.active) {
      return sendError(reply, 403, 'SERVICE_INACTIVE', 'Service is not active', requestId)
    }

    const createRequestResult = await createPendingApiRequest({
      serviceId,
      requestId,
      paymentTxHash,
    })

    if (!createRequestResult.ok) {
      return sendError(
        reply,
        409,
        'REPLAY_DETECTED',
        'Duplicate requestId or paymentTxHash detected',
        requestId,
        { replayReason: createRequestResult.replayReason },
      )
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

    return reply.status(200).send({
      ok: true,
      requestId,
      txHash: paymentTxHash,
      verification: verification.details,
      result: downstream.result,
    })
  })
}
