import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getServiceOwnerId } from '../db/services.js'
import { listAgents, listRegistryServices, upsertAgent, upsertRegistryService } from '../db/registry.js'
import { readOwnerIdFromHeader, readRoleFromHeader, requireRoles } from '../middleware/authz.js'

const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  endpoint: z.string().url().optional(),
  ownerId: z.string().min(1).max(128).optional(),
  description: z.string().min(1).max(2000).optional(),
  docsUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  version: z.string().min(1).max(64).optional(),
  deprecated: z.boolean().default(false),
  active: z.boolean().default(true),
  capabilities: z.array(z.string().min(1)).default([]),
})

const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  providerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  priceAtomic: z.string().regex(/^\d+$/),
  memoPrefix: z.string().min(1).default('api'),
  active: z.boolean().default(true),
  tags: z.array(z.string().min(1)).default([]),
})

const servicesQuerySchema = z
  .object({
    tag: z.string().min(1).optional(),
    capability: z.string().min(1).optional(),
    active: z.enum(['true', 'false']).optional(),
    price_min: z.string().regex(/^\d+$/).optional(),
    price_max: z.string().regex(/^\d+$/).optional(),
    sort: z.enum(['created_desc', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'rank_desc']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.price_min && data.price_max && BigInt(data.price_min) > BigInt(data.price_max)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'price_min cannot be greater than price_max',
        path: ['price_min'],
      })
    }
  })

function fail(message: string, details?: unknown) {
  return {
    ok: false,
    error: { message, details },
  }
}

export const registryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/registry/agents', async (_request, reply) => {
    const agents = await listAgents()
    return reply.status(200).send({ ok: true, agents })
  })

  app.post('/registry/agents', { preHandler: requireRoles('admin', 'provider') }, async (request, reply) => {
    const parsed = agentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send(fail('Invalid agent payload', parsed.error.flatten()))
    }

    const role = readRoleFromHeader(request)
    if (role === 'provider') {
      const ownerId = readOwnerIdFromHeader(request)
      if (!ownerId) {
        return reply.status(400).send(fail('Missing x-owner-id header for provider access'))
      }

      if (parsed.data.ownerId && parsed.data.ownerId !== ownerId) {
        return reply.status(403).send(
          fail('Provider cannot assign ownership to a different ownerId', {
            providedOwnerId: ownerId,
            payloadOwnerId: parsed.data.ownerId,
          }),
        )
      }

      await upsertAgent({
        ...parsed.data,
        ownerId,
      })
      return reply.status(200).send({ ok: true, agentId: parsed.data.id })
    }

    await upsertAgent(parsed.data)
    return reply.status(200).send({ ok: true, agentId: parsed.data.id })
  })

  app.get('/registry/services', async (request, reply) => {
    const parsed = servicesQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send(fail('Invalid service query payload', parsed.error.flatten()))
    }

    const services = await listRegistryServices({
      tag: parsed.data.tag,
      capability: parsed.data.capability,
      active: parsed.data.active ? parsed.data.active === 'true' : undefined,
      priceMin: parsed.data.price_min,
      priceMax: parsed.data.price_max,
      sort: parsed.data.sort,
    })
    return reply.status(200).send({ ok: true, services })
  })

  app.post('/registry/services', { preHandler: requireRoles('admin', 'provider') }, async (request, reply) => {
    const parsed = serviceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send(fail('Invalid service payload', parsed.error.flatten()))
    }

    const role = readRoleFromHeader(request)
    if (role === 'provider') {
      const ownerId = readOwnerIdFromHeader(request)
      if (!ownerId) {
        return reply.status(400).send(fail('Missing x-owner-id header for provider access'))
      }

      const currentOwnerId = await getServiceOwnerId(parsed.data.id)
      if (currentOwnerId !== undefined && currentOwnerId !== ownerId) {
        return reply.status(403).send(
          fail('Provider cannot modify services owned by a different ownerId', {
            providedOwnerId: ownerId,
            serviceOwnerId: currentOwnerId,
          }),
        )
      }

      await upsertRegistryService({
        ...parsed.data,
        ownerId,
      })
      return reply.status(200).send({ ok: true, serviceId: parsed.data.id })
    }

    await upsertRegistryService(parsed.data)
    return reply.status(200).send({ ok: true, serviceId: parsed.data.id })
  })
}
