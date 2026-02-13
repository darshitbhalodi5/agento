import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { getBillingSummary, listBillingUsage } from '../db/billing.js'

const statusEnum = z.enum([
  'VALIDATION_FAILED',
  'SERVICE_NOT_FOUND',
  'SERVICE_INACTIVE',
  'REPLAY_BLOCKED',
  'VERIFICATION_FAILED',
  'EXECUTION_FAILED',
  'EXECUTION_SUCCEEDED',
  'POLICY_BLOCKED',
])

const usageQuerySchema = z.object({
  serviceId: z.string().min(1).optional(),
  status: statusEnum.optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const summaryQuerySchema = z.object({
  serviceId: z.string().min(1).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
})

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/billing/usage', async (request, reply) => {
    const parsed = usageQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid billing usage query payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const rows = await listBillingUsage(parsed.data)
    return reply.status(200).send({
      ok: true,
      usage: rows,
      count: rows.length,
    })
  })

  app.get('/billing/summary', async (request, reply) => {
    const parsed = summaryQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid billing summary query payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const summary = await getBillingSummary(parsed.data)
    return reply.status(200).send({
      ok: true,
      summary,
      count: summary.length,
    })
  })
}

