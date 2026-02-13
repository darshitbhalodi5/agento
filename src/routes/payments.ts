import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'
import { getActiveServiceById } from '../db/services.js'

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

export const paymentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/payments/quote', async (request, reply) => {
    const parsed = quoteRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid quote request payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const { serviceId } = parsed.data
    const service = await getActiveServiceById(serviceId)

    if (!service) {
      return reply.status(404).send({
        ok: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: 'Service does not exist',
        },
      })
    }

    if (!service.active) {
      return reply.status(403).send({
        ok: false,
        error: {
          code: 'SERVICE_INACTIVE',
          message: 'Service is not active',
        },
      })
    }

    const response = {
      serviceId: service.id,
      token: service.tokenAddress,
      amount: service.priceAtomic,
      decimals: 6,
      recipient: service.providerWallet,
      memoTemplate: `${service.memoPrefix}:v1:${service.id}:{requestId}:{nonce}`,
      chainId: env.CHAIN_ID,
    }

    const checked = quoteResponseSchema.parse(response)
    return reply.status(200).send(checked)
  })
}
