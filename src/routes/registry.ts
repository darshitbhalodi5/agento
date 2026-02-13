import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { listAgents, listRegistryServices, upsertAgent, upsertRegistryService } from '../db/registry.js'

const agentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  endpoint: z.string().url().optional(),
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

  app.post('/registry/agents', async (request, reply) => {
    const parsed = agentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send(fail('Invalid agent payload', parsed.error.flatten()))
    }

    await upsertAgent(parsed.data)
    return reply.status(200).send({ ok: true, agentId: parsed.data.id })
  })

  app.get('/registry/services', async (_request, reply) => {
    const services = await listRegistryServices()
    return reply.status(200).send({ ok: true, services })
  })

  app.post('/registry/services', async (request, reply) => {
    const parsed = serviceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send(fail('Invalid service payload', parsed.error.flatten()))
    }

    await upsertRegistryService(parsed.data)
    return reply.status(200).send({ ok: true, serviceId: parsed.data.id })
  })
}
