import type { FastifyReply, FastifyRequest } from 'fastify'

export type AppRole = 'admin' | 'provider' | 'viewer'

function readRoleFromHeader(request: FastifyRequest): AppRole {
  const raw = request.headers['x-user-role']
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'admin' || value === 'provider' || value === 'viewer') {
    return value
  }
  return 'viewer'
}

export function requireRoles(...allowed: AppRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const role = readRoleFromHeader(request)
    if (allowed.includes(role)) {
      return
    }

    return reply.status(403).send({
      ok: false,
      error: {
        code: 'AUTHZ_FORBIDDEN',
        message: 'Insufficient role for this operation',
        required: allowed,
        provided: role,
      },
    })
  }
}
