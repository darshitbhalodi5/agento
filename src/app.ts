import Fastify from 'fastify'
import { env } from './config/env.js'
import { agentApiKeyRoutes } from './routes/agent-api-keys.js'
import { billingModelRoutes } from './routes/billing-models.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { downstreamMockRoutes } from './routes/downstream-mock.js'
import { frontendRoutes } from './routes/frontend.js'
import { healthRoutes } from './routes/health.js'
import { paymentRoutes } from './routes/payments.js'
import { billingRoutes } from './routes/billing.js'
import { policyRoutes } from './routes/policies.js'
import { reputationRoutes } from './routes/reputation.js'
import { orchestrationRoutes } from './routes/orchestrations.js'
import { orchestratorUiRoutes } from './routes/orchestrator-ui.js'
import { registryRoutes } from './routes/registry.js'
import { registryUiRoutes } from './routes/registry-ui.js'
import { workflowRoutes } from './routes/workflows.js'

function buildAllowedOrigins() {
  const raw = env.FRONTEND_ORIGINS.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
  const values = new Set(raw)
  try {
    values.add(new URL(env.APP_BASE_URL).origin)
  } catch {
    // APP_BASE_URL is validated as URL, but keep this defensive.
  }
  return values
}

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  })
  const allowedOrigins = buildAllowedOrigins()

  app.addHook('onRequest', async (request, reply) => {
    const originHeader = request.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    const isAllowedOrigin = typeof origin === 'string' && allowedOrigins.has(origin)

    if (isAllowedOrigin && origin) {
      reply.header('Access-Control-Allow-Origin', origin)
      reply.header('Vary', 'Origin')
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
      reply.header(
        'Access-Control-Allow-Headers',
        'content-type,x-agent-api-key,x-user-role,x-internal-api-key,authorization',
      )
      reply.header('Access-Control-Max-Age', '600')
    }

    if (request.method === 'OPTIONS' && request.headers['access-control-request-method']) {
      if (isAllowedOrigin) {
        return reply.status(204).send()
      }
      return reply.status(403).send({
        ok: false,
        error: {
          code: 'CORS_ORIGIN_FORBIDDEN',
          message: 'Origin is not allowed by CORS policy',
        },
      })
    }
  })

  app.register(healthRoutes, { prefix: '/v1' })
  app.register(frontendRoutes, { prefix: '/v1' })
  app.register(orchestratorUiRoutes, { prefix: '/v1' })
  app.register(registryUiRoutes, { prefix: '/v1' })
  app.register(dashboardRoutes, { prefix: '/v1' })
  app.register(agentApiKeyRoutes, { prefix: '/v1' })
  app.register(billingModelRoutes, { prefix: '/v1' })
  app.register(billingRoutes, { prefix: '/v1' })
  app.register(policyRoutes, { prefix: '/v1' })
  app.register(paymentRoutes, { prefix: '/v1' })
  app.register(orchestrationRoutes, { prefix: '/v1' })
  app.register(workflowRoutes, { prefix: '/v1' })
  app.register(reputationRoutes, { prefix: '/v1' })
  app.register(registryRoutes, { prefix: '/v1' })
  app.register(downstreamMockRoutes, { prefix: '/v1' })

  return app
}
