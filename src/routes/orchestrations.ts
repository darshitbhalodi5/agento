import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  getOrchestrationTimeline,
  listOrchestrationRuns,
} from '../db/orchestration-runs.js'
import { enqueueOrchestrationRun } from '../services/orchestration-queue.js'

const candidateSchema = z.object({
  serviceId: z.string().min(1),
  paymentTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
})

const stepSchema = z.object({
  stepId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  candidates: z.array(candidateSchema).min(1),
})

const runSchema = z.object({
  runId: z.string().min(1).max(128),
  workflowId: z.string().min(1).max(128),
  steps: z.array(stepSchema).min(1).max(10),
})

export const orchestrationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/orchestrations/runs', async (request, reply) => {
    const querySchema = z.object({
      limit: z.coerce.number().int().positive().max(200).default(30),
    })

    const parsed = querySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid run history query params',
          details: parsed.error.flatten(),
        },
      })
    }

    const runs = await listOrchestrationRuns(parsed.data.limit)
    return reply.status(200).send({ ok: true, runs })
  })

  app.get('/orchestrations/runs/:runId', async (request, reply) => {
    const paramsSchema = z.object({
      runId: z.string().min(1),
    })

    const parsed = paramsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid run id params',
          details: parsed.error.flatten(),
        },
      })
    }

    const timeline = await getOrchestrationTimeline(parsed.data.runId)
    if (timeline.length === 0) {
      return reply.status(404).send({
        ok: false,
        error: {
          message: 'Run not found or no timeline data available',
        },
      })
    }

    return reply.status(200).send({
      ok: true,
      runId: parsed.data.runId,
      timeline,
    })
  })

  app.get('/orchestrations/template', async (_request, reply) => {
    return reply.status(200).send({
      ok: true,
      template: {
        runId: `run_${Date.now()}`,
        workflowId: 'wf_agent_commerce_demo',
        steps: [
          {
            stepId: 'step_1_price_discovery',
            payload: { location: 'NYC' },
            candidates: [
              {
                serviceId: 'weather-api',
                paymentTxHash: '0xREPLACE_PRIMARY_TX_HASH',
              },
              {
                serviceId: 'weather-api-fallback',
                paymentTxHash: '0xREPLACE_FALLBACK_TX_HASH',
              },
            ],
          },
          {
            stepId: 'step_2_confirmation',
            payload: { location: 'NYC', mode: 'confirm' },
            candidates: [
              {
                serviceId: 'weather-api',
                paymentTxHash: '0xREPLACE_SECOND_STEP_TX_HASH',
              },
            ],
          },
        ],
      },
    })
  })

  app.post('/orchestrations/run', async (request, reply) => {
    const parsed = runSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid orchestration run payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const enqueued = await enqueueOrchestrationRun(parsed.data)
    if (!enqueued) {
      return reply.status(409).send({
        ok: false,
        error: {
          message: 'Run already exists',
        },
      })
    }

    return reply.status(202).send({
      ok: true,
      runId: parsed.data.runId,
      workflowId: parsed.data.workflowId,
      runStatus: 'queued',
    })
  })
}
