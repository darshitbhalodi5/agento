import Fastify from 'fastify'
import { env } from './config/env.js'
import { billingModelRoutes } from './routes/billing-models.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { downstreamMockRoutes } from './routes/downstream-mock.js'
import { frontendRoutes } from './routes/frontend.js'
import { healthRoutes } from './routes/health.js'
import { paymentRoutes } from './routes/payments.js'
import { reputationRoutes } from './routes/reputation.js'
import { orchestrationRoutes } from './routes/orchestrations.js'
import { orchestratorUiRoutes } from './routes/orchestrator-ui.js'
import { registryRoutes } from './routes/registry.js'
import { registryUiRoutes } from './routes/registry-ui.js'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  })

  app.register(healthRoutes, { prefix: '/v1' })
  app.register(frontendRoutes, { prefix: '/v1' })
  app.register(orchestratorUiRoutes, { prefix: '/v1' })
  app.register(registryUiRoutes, { prefix: '/v1' })
  app.register(dashboardRoutes, { prefix: '/v1' })
  app.register(billingModelRoutes, { prefix: '/v1' })
  app.register(paymentRoutes, { prefix: '/v1' })
  app.register(orchestrationRoutes, { prefix: '/v1' })
  app.register(reputationRoutes, { prefix: '/v1' })
  app.register(registryRoutes, { prefix: '/v1' })
  app.register(downstreamMockRoutes, { prefix: '/v1' })

  return app
}
