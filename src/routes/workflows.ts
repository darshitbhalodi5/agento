import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createWorkflowTemplate,
  getWorkflowTemplateById,
  listWorkflowTemplates,
  updateWorkflowTemplate,
} from '../db/workflow-templates.js'

interface PgErrorLike {
  code?: string
}

const jsonObjectSchema = z.object({}).passthrough()

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return undefined
      }
      return value === 'true'
    }),
})

const paramsSchema = z.object({
  workflowId: z.string().min(1).max(128),
})

const createSchema = z.object({
  workflowId: z.string().min(1).max(128),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).nullable().optional(),
  stepGraph: jsonObjectSchema,
  defaultPolicies: jsonObjectSchema.default({}),
  active: z.boolean().default(true),
})

const updateSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    description: z.string().max(2000).nullable().optional(),
    stepGraph: jsonObjectSchema.optional(),
    defaultPolicies: jsonObjectSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.stepGraph !== undefined ||
      value.defaultPolicies !== undefined ||
      value.active !== undefined,
    {
      message: 'At least one field is required to update template',
    },
  )

export const workflowRoutes: FastifyPluginAsync = async (app) => {
  app.get('/workflows', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid workflow list query payload',
          details: parsed.error.flatten(),
        },
      })
    }

    const templates = await listWorkflowTemplates({
      limit: parsed.data.limit,
      active: parsed.data.active,
    })

    return reply.status(200).send({
      ok: true,
      templates,
      count: templates.length,
    })
  })

  app.get('/workflows/:workflowId', async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid workflow id params',
          details: parsed.error.flatten(),
        },
      })
    }

    const template = await getWorkflowTemplateById(parsed.data.workflowId)
    if (!template) {
      return reply.status(404).send({
        ok: false,
        error: {
          message: 'Workflow template not found',
        },
      })
    }

    return reply.status(200).send({
      ok: true,
      template,
    })
  })

  app.post('/workflows', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid workflow template payload',
          details: parsed.error.flatten(),
        },
      })
    }

    try {
      const template = await createWorkflowTemplate({
        workflowId: parsed.data.workflowId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        stepGraph: parsed.data.stepGraph,
        defaultPolicies: parsed.data.defaultPolicies,
        active: parsed.data.active,
      })

      return reply.status(201).send({
        ok: true,
        template,
      })
    } catch (error: unknown) {
      const pgError = error as PgErrorLike
      if (pgError?.code === '23505') {
        return reply.status(409).send({
          ok: false,
          error: {
            message: 'Workflow template already exists',
          },
        })
      }
      throw error
    }
  })

  app.put('/workflows/:workflowId', async (request, reply) => {
    const paramsParsed = paramsSchema.safeParse(request.params)
    if (!paramsParsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid workflow id params',
          details: paramsParsed.error.flatten(),
        },
      })
    }

    const bodyParsed = updateSchema.safeParse(request.body)
    if (!bodyParsed.success) {
      return reply.status(400).send({
        ok: false,
        error: {
          message: 'Invalid workflow template update payload',
          details: bodyParsed.error.flatten(),
        },
      })
    }

    const template = await updateWorkflowTemplate({
      workflowId: paramsParsed.data.workflowId,
      name: bodyParsed.data.name,
      description: bodyParsed.data.description,
      stepGraph: bodyParsed.data.stepGraph,
      defaultPolicies: bodyParsed.data.defaultPolicies,
      active: bodyParsed.data.active,
    })

    if (!template) {
      return reply.status(404).send({
        ok: false,
        error: {
          message: 'Workflow template not found',
        },
      })
    }

    return reply.status(200).send({
      ok: true,
      template,
    })
  })
}
