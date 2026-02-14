# Agento SLO Targets

Last updated: 2026-02-14

## Scope
These SLOs define production reliability targets for core user-facing API paths:
- `POST /v1/payments/execute`
- `POST /v1/orchestrations/run` (enqueue path)
- `GET /v1/health` (availability guardrail)

## SLI Definitions
1. Availability (per endpoint):
   - `successful_requests / total_requests`
   - success means expected 2xx/4xx contract behavior
   - platform-level 5xx/timeouts are failures
2. Latency:
   - measured as server-side request duration
   - tracked at p95 and p99
3. Error Rate:
   - percentage of 5xx responses over total responses

## SLO Targets (30-day rolling window)
| Endpoint | Availability | p95 Latency | p99 Latency | 5xx Error Rate |
| --- | --- | --- | --- | --- |
| `GET /v1/health` | 99.95% | < 150ms | < 300ms | < 0.1% |
| `POST /v1/payments/execute` | 99.5% | < 1500ms | < 3000ms | < 0.5% |
| `POST /v1/orchestrations/run` | 99.5% | < 1000ms | < 2000ms | < 0.5% |

## Error Budget Policy
- Monthly budget for 99.5% SLO: 0.5% unavailable requests.
- Monthly budget for 99.95% SLO: 0.05% unavailable requests.
- Burn alerts:
  - fast burn: > 10% of monthly budget consumed in 1 hour
  - slow burn: > 25% of monthly budget consumed in 24 hours

## Alerting Rules
1. Page immediately:
   - `GET /v1/health` availability below 99.9% in a 15-minute window
   - sustained 5xx error rate > 2% for 10 minutes on execute/orchestration
2. Ticket + investigate:
   - p95 latency over target for 30 minutes
   - budget burn exceeds slow-burn threshold

## Operational Response
1. Validate scope with `/v1/health`, DB connectivity, queue movement.
2. Roll back release if regression is release-correlated.
3. Apply traffic controls or temporary feature throttles if rollback is insufficient.
4. Document incident timeline and remediation action items.

## Review Cadence
- Weekly: inspect trend charts for latency/error drift.
- Monthly: review SLO attainment and adjust targets only with explicit sign-off.
