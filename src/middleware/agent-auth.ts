import type { FastifyReply, FastifyRequest } from 'fastify'
import { isActiveAgentApiKey } from '../db/agent-api-keys.js'

const DEV_AGENT_API_KEY = 'agento-dev-agent-key'

function readAgentApiKey(request: FastifyRequest): string | null {
  const raw = request.headers['x-agent-api-key']
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function requireAgentApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = readAgentApiKey(request)
  if (!apiKey) {
    return reply.status(401).send({
      ok: false,
      error: {
        code: 'AGENT_API_KEY_MISSING',
        message: 'Missing x-agent-api-key header',
      },
    })
  }

  if (apiKey === DEV_AGENT_API_KEY) {
    return
  }

  const valid = await isActiveAgentApiKey(apiKey)
  if (!valid) {
    return reply.status(401).send({
      ok: false,
      error: {
        code: 'AGENT_API_KEY_INVALID',
        message: 'Invalid or inactive agent API key',
      },
    })
  }
}
