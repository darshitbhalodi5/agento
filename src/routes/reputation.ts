import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getServiceReputation } from '../db/reputation.js'

export const reputationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/reputation/services', async (request, reply) => {
    const querySchema = z.object({
      limit: z.coerce.number().int().positive().max(200).default(50),
    })

    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid reputation query params',
          details: parsed.error.flatten(),
        },
      })
    }

    const rows = await getServiceReputation(parsed.data.limit)

    return reply.status(200).send({
      ok: true,
      reputation: rows,
    })
  })
}
