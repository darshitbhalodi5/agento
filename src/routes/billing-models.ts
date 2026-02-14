import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getBillingModelByServiceId, upsertBillingModel } from '../db/billing-models.js'
import { requireRoles } from '../middleware/authz.js'

const querySchema = z.object({
  serviceId: z.string().min(1),
})

const upsertSchema = z
  .object({
    serviceId: z.string().min(1),
    modelType: z.enum(['fixed', 'tiered', 'hybrid']),
    fixedPriceAtomic: z.string().regex(/^\d+$/).nullable().optional(),
    freeQuota: z.coerce.number().int().min(0).default(0),
    tierJson: z.unknown().default([]),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if ((data.modelType === 'fixed' || data.modelType === 'hybrid') && !data.fixedPriceAtomic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fixedPriceAtomic is required for fixed/hybrid models',
        path: ['fixedPriceAtomic'],
      })
    }
  })

export const billingModelRoutes: FastifyPluginAsync = async (app) => {
  app.get('/billing/models', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid billing model query payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const record = await getBillingModelByServiceId(parsed.data.serviceId)
    if (!record) {
      return reply.status(404).send({
        ok: false,
        error: {
          message: 'Billing model not found for service',
        },
      })
    }

    return reply.status(200).send({ ok: true, billingModel: record })
  })

  app.post('/billing/models', { preHandler: requireRoles('admin') }, async (request, reply) => {
    const parsed = upsertSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid billing model payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const record = await upsertBillingModel({
      serviceId: parsed.data.serviceId,
      modelType: parsed.data.modelType,
      fixedPriceAtomic: parsed.data.fixedPriceAtomic ?? null,
      freeQuota: parsed.data.freeQuota,
      tierJson: parsed.data.tierJson,
      active: parsed.data.active,
    })

    return reply.status(200).send({ ok: true, billingModel: record })
  })
}
