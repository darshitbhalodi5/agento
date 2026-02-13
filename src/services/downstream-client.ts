import { keccak256, stringToHex } from 'viem'
import { env } from '../config/env.js'

export interface DownstreamExecuteInput {
  serviceId: string
  requestId: string
  payload: Record<string, unknown>
}

export type DownstreamExecuteResult =
  | {
      ok: true
      statusCode: number
      result: unknown
      responseHash: `0x${string}`
    }
  | {
      ok: false
      statusCode: number
      errorMessage: string
    }

export async function executeDownstreamCall(
  input: DownstreamExecuteInput,
): Promise<DownstreamExecuteResult> {
  const response = await fetch(env.DOWNSTREAM_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-api-key': env.INTERNAL_API_KEY,
    },
    body: JSON.stringify(input),
  }).catch((error) => {
    return {
      ok: false,
      status: 503,
      json: async () => ({ message: `Downstream fetch failed: ${String(error)}` }),
    } as Response
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    return {
      ok: false,
      statusCode: response.status,
      errorMessage:
        (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : `Downstream responded with status ${response.status}`),
    }
  }

  const responseHash = keccak256(stringToHex(JSON.stringify(body ?? {})))

  return {
    ok: true,
    statusCode: response.status,
    result: body,
    responseHash,
  }
}
