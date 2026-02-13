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
