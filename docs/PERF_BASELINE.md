# Agento Performance Baseline

Last updated: 2026-02-14

## Scope
This baseline tracks reproducible throughput and latency checks for key routes:
- `GET /v1/health`
- `POST /v1/orchestrations/run` (enqueue path)

## Preconditions
1. Start app locally:
```bash
cd /home/db/agento
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```
2. Ensure `BASE_URL` points to the running app (default: `http://localhost:3000`).
3. For orchestration perf script, set `AGENT_API_KEY` if not using default dev key.

## Run Commands
Health endpoint baseline:
```bash
k6 run tests/perf/health.k6.js
```

Orchestration enqueue baseline:
```bash
AGENT_API_KEY=agento-dev-agent-key k6 run tests/perf/orchestrations-run.k6.js
```

Optional overrides:
```bash
BASE_URL=http://localhost:3000 VUS=30 DURATION=90s k6 run tests/perf/health.k6.js
```

## Threshold Targets
Health (`tests/perf/health.k6.js`):
- `http_req_failed < 1%`
- `p95 latency < 250ms`
- `avg latency < 120ms`

Orchestrations enqueue (`tests/perf/orchestrations-run.k6.js`):
- `http_req_failed < 5%`
- `p95 latency < 1200ms`
- `avg latency < 700ms`

## Baseline Result Table
Fill this table after each measured run.

| Date (UTC) | Environment | Script | VUs | Duration | RPS (avg) | p95 (ms) | Error Rate | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-02-14 | local | health.k6.js | 20 | 60s | TBD | TBD | TBD | Pending |
| 2026-02-14 | local | orchestrations-run.k6.js | 10 | 45s | TBD | TBD | TBD | Pending |

## Notes
- `POST /v1/orchestrations/run` is async; this benchmark measures enqueue responsiveness, not full run completion latency.
- In environments without DB connectivity, enqueue route may return `500`; treat that as infrastructure setup failure, not app perf regression.
