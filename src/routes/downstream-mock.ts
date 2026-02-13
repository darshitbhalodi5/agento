import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { env } from '../config/env.js'

const downstreamRequestSchema = z.object({
  serviceId: z.string().min(1),
  requestId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
})

export const downstreamMockRoutes: FastifyPluginAsync = async (app) => {
  app.post('/internal/mock/execute', async (request, reply) => {
    const internalApiKey = request.headers['x-internal-api-key']
    if (internalApiKey !== env.INTERNAL_API_KEY) {
      return reply.status(401).send({
        ok: false,
        message: 'Unauthorized downstream call',
      })
    }

    const parsed = downstreamRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        message: 'Invalid downstream payload',
        details: parsed.error.flatten(),
      })
    }

    const { serviceId, requestId, payload } = parsed.data
    const location = typeof payload.location === 'string' ? payload.location : 'unknown'

    return reply.status(200).send({
      ok: true,
      serviceId,
      requestId,
      forecast: {
        location,
        summary: 'Stable conditions with low volatility',
        tempC: 22,
      },
      generatedAt: new Date().toISOString(),
    })
  })
}
