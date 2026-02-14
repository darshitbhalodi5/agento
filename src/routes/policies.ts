import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getServicePolicyByServiceId, listServicePolicies, upsertServicePolicy } from '../db/service-policies.js'
import { getServiceOwnerId } from '../db/services.js'
import { readOwnerIdFromHeader, readRoleFromHeader, requireRoles } from '../middleware/authz.js'

const getQuerySchema = z.object({
  serviceId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

const upsertSchema = z.object({
  serviceId: z.string().min(1),
  active: z.boolean().default(true),
  maxCallsPerMinute: z.coerce.number().int().min(0).nullable().optional(),
  maxSpendPerHourAtomic: z.string().regex(/^\d+$/).nullable().optional(),
  maxSpendPerDayAtomic: z.string().regex(/^\d+$/).nullable().optional(),
  allowlistConsumerIds: z.array(z.string().min(1)).default([]),
  blocklistConsumerIds: z.array(z.string().min(1)).default([]),
})

export const policyRoutes: FastifyPluginAsync = async (app) => {
  app.get('/policies', async (request, reply) => {
    const parsed = getQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid policy query payload',
          details: parsed.error.flatten(),
        },
      })
    }

    if (parsed.data.serviceId) {
      const policy = await getServicePolicyByServiceId(parsed.data.serviceId)
      if (!policy) {
        return reply.status(404).send({
          ok: false,
          error: {
            message: 'Policy not found for service',
          },
        })
      }

      return reply.status(200).send({
        ok: true,
        policy,
      })
    }

    const policies = await listServicePolicies(parsed.data.limit)
    return reply.status(200).send({
      ok: true,
      policies,
      count: policies.length,
    })
  })

  app.post('/policies', { preHandler: requireRoles('admin', 'provider') }, async (request, reply) => {
    const parsed = upsertSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid policy payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const role = readRoleFromHeader(request)
    if (role === 'provider') {
      const ownerId = readOwnerIdFromHeader(request)
      if (!ownerId) {
        return reply.status(400).send({
          ok: false,
          error: {
            message: 'Missing x-owner-id header for provider access',
          },
        })
      }

      const serviceOwnerId = await getServiceOwnerId(parsed.data.serviceId)
      if (serviceOwnerId === undefined) {
        return reply.status(404).send({
          ok: false,
          error: {
            message: 'Service not found',
          },
        })
      }

      if (serviceOwnerId !== ownerId) {
        return reply.status(403).send({
          ok: false,
          error: {
            code: 'AUTHZ_FORBIDDEN',
            message: 'Provider cannot update policy for service they do not own',
            details: {
              providedOwnerId: ownerId,
              serviceOwnerId,
            },
          },
        })
      }
    }

    const record = await upsertServicePolicy({
      serviceId: parsed.data.serviceId,
      active: parsed.data.active,
      maxCallsPerMinute: parsed.data.maxCallsPerMinute ?? null,
      maxSpendPerHourAtomic: parsed.data.maxSpendPerHourAtomic ?? null,
      maxSpendPerDayAtomic: parsed.data.maxSpendPerDayAtomic ?? null,
      allowlistConsumerIds: parsed.data.allowlistConsumerIds,
      blocklistConsumerIds: parsed.data.blocklistConsumerIds,
    })

    return reply.status(200).send({
      ok: true,
      policy: record,
    })
  })
}
