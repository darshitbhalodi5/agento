import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createAgentApiKey,
  listAgentApiKeys,
  revokeAgentApiKeyById,
  rotateAgentApiKeyById,
} from '../db/agent-api-keys.js'
import { requireRoles } from '../middleware/authz.js'

const listQuerySchema = z.object({
  agentId: z.string().min(1).optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const createBodySchema = z.object({
  agentId: z.string().min(1).max(128),
  apiKey: z.string().min(16).max(256).optional(),
})

const paramsSchema = z.object({
  keyId: z.coerce.number().int().positive(),
})

export const agentApiKeyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/agent-keys', { preHandler: requireRoles('admin') }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid agent key query payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const keys = await listAgentApiKeys({
      agentId: parsed.data.agentId,
      active: parsed.data.active === undefined ? undefined : parsed.data.active === 'true',
      limit: parsed.data.limit,
    })

    return reply.status(200).send({
      ok: true,
      keys,
      count: keys.length,
    })
  })

  app.post('/agent-keys', { preHandler: requireRoles('admin') }, async (request, reply) => {
    const parsed = createBodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid agent key payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const created = await createAgentApiKey(parsed.data).catch((error: unknown) => {
      const maybePg = error as { code?: string }
      if (maybePg?.code === '23505') {
        return null
      }
      throw error
    })

    if (!created) {
      return reply.status(409).send({
        ok: false,
        error: {
          message: 'API key already exists',
        },
      })
    }

    return reply.status(201).send({
      ok: true,
      key: created.record,
      apiKey: created.apiKey,
    })
  })

  app.post('/agent-keys/:keyId/revoke', { preHandler: requireRoles('admin') }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid key id params',
          details: parsed.error.flatten(),
        },
      })
    }

    const revoked = await revokeAgentApiKeyById(parsed.data.keyId)
    if (!revoked) {
      return reply.status(404).send({
        ok: false,
        error: {
          message: 'Agent key not found',
        },
      })
    }

    return reply.status(200).send({
      ok: true,
      key: revoked,
    })
  })

  app.post('/agent-keys/:keyId/rotate', { preHandler: requireRoles('admin') }, async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid key id params',
          details: parsed.error.flatten(),
        },
      })
    }

    const rotated = await rotateAgentApiKeyById(parsed.data.keyId)
    if (!rotated) {
      return reply.status(404).send({
        ok: false,
        error: {
          message: 'Agent key not found',
        },
      })
    }

    return reply.status(200).send({
      ok: true,
      revoked: rotated.revoked,
      created: rotated.created,
      apiKey: rotated.apiKey,
    })
  })
}
