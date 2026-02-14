export interface ApiErrorPayload {
  code?: string
  message?: string
  details?: unknown
}

export interface ApiEnvelope<T> {
  ok?: boolean
  error?: ApiErrorPayload
  [key: string]: unknown
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface ApiSuccess<T> {
  ok: true
  status: number
  data: T
}

export interface ApiFailure {
  ok: false
  status: number
  error: ApiErrorPayload
  raw?: unknown
}

export type ApiResult<T> = ApiSuccess<T> | ApiFailure
