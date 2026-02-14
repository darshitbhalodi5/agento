import { buildApp } from './app.js'
import { env } from './config/env.js'
import { startOrchestratorWorker } from './services/orchestrator-worker.js'

async function start() {
  const app = buildApp()
  const worker = startOrchestratorWorker({ logger: app.log })
  app.addHook('onClose', async () => {
    worker.stop()
  })

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    })
  } catch (error) {
    worker.stop()
    app.log.error(error)
    process.exit(1)
  }
}

void start()
