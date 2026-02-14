import type { ApiEnvelope, ApiErrorPayload, ApiRequestOptions, ApiResult } from './types'

function readBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  return base && base.length > 0 ? base : 'http://localhost:3000'
}

function buildUrl(path: string, baseUrl?: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl || readBaseUrl()}${normalizedPath}`
}

function normalizeError(payload: unknown, fallbackMessage: string): ApiErrorPayload {
  if (!payload || typeof payload !== 'object') {
    return { message: fallbackMessage }
  }

  const maybeEnvelope = payload as ApiEnvelope<unknown>
  if (maybeEnvelope.error && typeof maybeEnvelope.error === 'object') {
    return {
      code: typeof maybeEnvelope.error.code === 'string' ? maybeEnvelope.error.code : undefined,
      message: typeof maybeEnvelope.error.message === 'string' ? maybeEnvelope.error.message : fallbackMessage,
      details: maybeEnvelope.error.details,
    }
  }

  if (typeof (payload as { message?: unknown }).message === 'string') {
    return { message: (payload as { message: string }).message }
  }

  return { message: fallbackMessage }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<ApiResult<T>> {
  const url = buildUrl(path, options.baseUrl)
  const headers: HeadersInit = {
    'content-type': 'application/json',
    ...(options.headers ?? {}),
  }

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    signal: options.signal,
  }

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body)
  }

  try {
    const response = await fetch(url, init)
    const payload = (await response.json().catch(() => ({}))) as unknown

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        data: payload as T,
      }
    }

    return {
      ok: false,
      status: response.status,
      error: normalizeError(payload, `Request failed with status ${response.status}`),
      raw: payload,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: {
        code: 'NETWORK_ERROR',
        message: `Network request failed: ${String(error)}`,
      },
    }
  }
}

export function apiGet<T>(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
  return apiRequest<T>(path, { ...options, method: 'GET' })
}

export function apiPost<T>(path: string, body: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
  return apiRequest<T>(path, { ...options, method: 'POST', body })
}

export function apiPut<T>(path: string, body: unknown, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) {
  return apiRequest<T>(path, { ...options, method: 'PUT', body })
}
