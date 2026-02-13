import { pool } from './pool.js'

export interface ServiceReputation {
  serviceId: string
  serviceName: string
  active: boolean
  totalRuns: number
  successRuns: number
  failedRuns: number
  successRatePct: number
  failureRatePct: number
  medianLatencyMs: number | null
  lastRunAt: string | null
}

export async function getServiceReputation(limit = 50): Promise<ServiceReputation[]> {
  const result = await pool.query<{
    service_id: string
    service_name: string
    active: boolean
    total_runs: string
    success_runs: string
    failed_runs: string
    success_rate_pct: string
    failure_rate_pct: string
    median_latency_ms: string | null
    last_run_at: string | null
  }>(
    `
      SELECT
        s.id AS service_id,
        s.name AS service_name,
        s.active,
        COUNT(ar.*)::text AS total_runs,
        COUNT(ar.*) FILTER (WHERE ar.execution_status = 'SUCCEEDED')::text AS success_runs,
        COUNT(ar.*) FILTER (WHERE ar.execution_status = 'FAILED')::text AS failed_runs,
        CASE
          WHEN COUNT(ar.*) = 0 THEN '0'
          ELSE ROUND((COUNT(ar.*) FILTER (WHERE ar.execution_status = 'SUCCEEDED')::numeric / COUNT(ar.*)::numeric) * 100, 2)::text
        END AS success_rate_pct,
        CASE
          WHEN COUNT(ar.*) = 0 THEN '0'
          ELSE ROUND((COUNT(ar.*) FILTER (WHERE ar.execution_status = 'FAILED')::numeric / COUNT(ar.*)::numeric) * 100, 2)::text
        END AS failure_rate_pct,
        CASE
          WHEN COUNT(ar.*) FILTER (WHERE ar.completed_at IS NOT NULL) = 0 THEN NULL
          ELSE ROUND(
            percentile_cont(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (ar.completed_at - ar.created_at)) * 1000
            )::numeric,
            2
          )::text
        END AS median_latency_ms,
        MAX(ar.created_at)::text AS last_run_at
      FROM services s
      LEFT JOIN api_requests ar ON ar.service_id = s.id
      GROUP BY s.id, s.name, s.active
      ORDER BY success_rate_pct::numeric DESC, total_runs::numeric DESC, s.id ASC
      LIMIT $1
    `,
    [limit],
  )

  return result.rows.map((row) => ({
    serviceId: row.service_id,
    serviceName: row.service_name,
    active: row.active,
    totalRuns: Number(row.total_runs),
    successRuns: Number(row.success_runs),
    failedRuns: Number(row.failed_runs),
    successRatePct: Number(row.success_rate_pct),
    failureRatePct: Number(row.failure_rate_pct),
    medianLatencyMs: row.median_latency_ms === null ? null : Number(row.median_latency_ms),
    lastRunAt: row.last_run_at,
  }))
}
