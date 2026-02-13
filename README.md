# Agento

Agento is a Tempo-native pay-per-API gateway for autonomous agents.

## Goal
Execute API requests only after verified on-chain payment proof.

## Stack (MVP)
- Backend: Fastify (TypeScript)
- Database: Postgres
- Chain integration: viem + Tempo actions
- Dashboard: minimal read-only

## Incremental Delivery
We ship in small slices and push after every slice.
See `docs/BUILD_STEPS.md`.

## Local Commands
- `npm run dev` - run Fastify in watch mode
- `npm run check` - TypeScript type-check
- `npm run build` - compile to `dist/`
- `npm run db:check` - verify Postgres connectivity
- `npm run db:migrate` - apply SQL migrations
- `npm test` - run route tests
- `npm run demo` - run demo curl flow script

## Quote API Quick Test
1. Insert one active service in Postgres:
```sql
INSERT INTO services (id, name, provider_wallet, token_address, price_atomic, memo_prefix, active)
VALUES (
  'weather-api',
  'Weather API',
  '0x031891A61200FedDd622EbACC10734BC90093B2A',
  '0x20c0000000000000000000000000000000000001',
  '1000',
  'api',
  true
)
ON CONFLICT (id) DO NOTHING;
```

2. Call quote endpoint:
```bash
curl -s -X POST http://localhost:3000/v1/payments/quote \
  -H 'content-type: application/json' \
  -d '{"serviceId":"weather-api","endpoint":"/forecast/7d"}' | jq
```

## Execute API Flow (Step 8)
Current behavior:
- validates payload and service status
- verifies payment transaction receipt + `TransferWithMemo` log on Tempo
- validates token, recipient wallet, amount, and memo binding
- calls protected downstream API when verification succeeds
- writes execution success/failure into audit log
- returns structured error model on any failure path

Example:
```bash
curl -s -X POST http://localhost:3000/v1/payments/execute \
  -H 'content-type: application/json' \
  -d '{"serviceId":"weather-api","requestId":"req_001","paymentTxHash":"0x1111111111111111111111111111111111111111111111111111111111111111","payload":{"location":"NYC"}}' | jq
```

Memo rule used for verification in Step 6:
`memo = keccak256(\"api:v1:{serviceId}:{requestId}\")`

## Replay + Audit (Step 7)
- Replay protection is enforced at DB level using unique constraints:
  - `(service_id, request_id)`
  - `(payment_tx_hash)`
- Every execute attempt creates/updates an `api_requests` audit record.

Audit lookup:
```bash
curl -s \"http://localhost:3000/v1/requests/req_001?serviceId=weather-api\" | jq
```

## Downstream Mock (Protected)
Environment variables:
- `DOWNSTREAM_API_URL` (default: `http://localhost:3000/v1/internal/mock/execute`)
- `INTERNAL_API_KEY` (default: `agento-dev-key`)

The execute endpoint forwards verified requests to the protected mock downstream route using `x-internal-api-key`.

## Dashboard (Step 9)
Read-only dashboard route:
```bash
open http://localhost:3000/v1/dashboard
```

It shows:
- total requests
- verified payments
- replay blocks
- execution success/failure
- recent request table with statuses and error codes

## Frontend Direction
- lightweight demo frontend for quote/execute/status flow
- `/v1/dashboard` remains operational telemetry UI

Why this is included:
- judges can follow the problem-solution flow faster
- reduces dependence on raw curl commands during live demo

## Frontend Demo App (Step 11)
UI route:
```bash
http://localhost:3000/v1/app
```

Includes:
- Quote form (`POST /v1/payments/quote`)
- Execute form (`POST /v1/payments/execute`)
- Request status lookup (`GET /v1/requests/:requestId?serviceId=...`)
- Quick links to telemetry dashboard and health endpoint

## Agent Registry + Catalog (Step 13)
UI route:
```bash
http://localhost:3000/v1/registry
```

Backend routes:
- `GET /v1/registry/agents`
- `POST /v1/registry/agents`
- `GET /v1/registry/services`
- `POST /v1/registry/services`

Includes:
- agent registration with capabilities
- service registration with price/status/tags
- live service catalog and agent directory

## Agent Metadata Expansion (T-18.1)
Agent registry now supports optional provider metadata fields:
- `ownerId`
- `description`
- `docsUrl`
- `websiteUrl`
- `version`
- `deprecated`

Backward compatibility:
- existing agent payloads continue to work
- all metadata fields are optional with safe defaults

## Reputation Module (Step 14)
API route:
- `GET /v1/reputation/services?limit=50`

Frontend:
- reputation cards rendered in `/v1/registry`
- metrics per service:
  - success rate
  - failure rate
  - median latency
  - last run timestamp

## Multi-Agent Orchestration MVP (Step 15)
UI route:
- `GET /v1/orchestrator`

API routes:
- `GET /v1/orchestrations/template`
- `POST /v1/orchestrations/run`

Behavior:
- supports 2-3+ step workflow payloads
- each step can define multiple candidates (primary + fallback)
- executes candidates in order until one succeeds
- returns per-step attempt details (service, requestId, txHash, status)

## Workflow History + Observability (Step 16)
API routes:
- `GET /v1/orchestrations/runs?limit=20`
- `GET /v1/orchestrations/runs/:runId`

Includes:
- persistent orchestration run history
- per-step outcome persistence
- attempt timeline with tx hash, status code, and error code
- run history + timeline panels on `/v1/orchestrator`

## Billing Models (T-17.1)
API routes:
- `GET /v1/billing/models?serviceId=weather-api`
- `POST /v1/billing/models`

Payload example (`POST /v1/billing/models`):
```json
{
  "serviceId": "weather-api",
  "modelType": "fixed",
  "fixedPriceAtomic": "1000",
  "freeQuota": 0,
  "tierJson": [],
  "active": true
}
```

## Usage Ledger (T-17.2)
Persistence:
- migration: `migrations/005_usage_ledger.sql`
- table: `usage_ledger`

Behavior:
- writes one usage record for every major execute outcome:
  - `VALIDATION_FAILED`
  - `SERVICE_NOT_FOUND`
  - `SERVICE_INACTIVE`
  - `REPLAY_BLOCKED`
  - `VERIFICATION_FAILED`
  - `EXECUTION_FAILED`
  - `EXECUTION_SUCCEEDED`

## Policy Engine Core (T-17.3)
Persistence:
- migration: `migrations/006_service_policies.sql`
- table: `service_policies`

Behavior:
- executes policy evaluation before chain verification in `POST /v1/payments/execute`
- blocks deterministically with `POLICY_BLOCKED` when:
  - consumer is blocklisted
  - consumer is not allowlisted (when allowlist exists)
  - per-minute call limit is exceeded
  - projected hourly/daily spend limit is exceeded
- writes `POLICY_BLOCKED` row into `usage_ledger` with detailed policy code

Request extension:
- `consumerId` is now supported as an optional execute payload field for allow/block list checks.

## Billing and Policy APIs (T-17.4)
Routes:
- `GET /v1/billing/usage`
- `GET /v1/billing/summary`
- `GET /v1/policies`
- `POST /v1/policies`

Billing usage query params:
- `serviceId` (optional)
- `status` (optional)
- `from` / `to` (optional ISO datetime)
- `limit` (optional, default 50, max 200)

Billing summary query params:
- `serviceId` (optional)
- `from` / `to` (optional ISO datetime)

Policy payload (`POST /v1/policies`) fields:
- `serviceId` (required)
- `active` (optional, default true)
- `maxCallsPerMinute` (optional)
- `maxSpendPerHourAtomic` (optional)
- `maxSpendPerDayAtomic` (optional)
- `allowlistConsumerIds` (optional, default empty)
- `blocklistConsumerIds` (optional, default empty)

## Step 12 Polish
Added:
- guided demo mode presets (happy-path and error-path inputs) in `/v1/app`
- one-click helpers for quote and status actions
- submission walkthrough/checklist doc

Walkthrough doc:
- `docs/SUBMISSION_WALKTHROUGH.md`

## Step 10 Test Coverage
Current automated tests cover:
- `GET /v1/health` success path
- downstream mock unauthorized path
- downstream mock authorized path

Run:
```bash
npm test
```

## Step 10 Demo Script
Script:
```bash
scripts/demo_flow.sh
```

Run:
```bash
npm run demo
```

Notes:
- set `PAYMENT_TX_HASH` to a real Tempo transfer hash for end-to-end execute success
- set `REQUEST_ID` for unique runs
