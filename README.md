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

## Execute API Skeleton (Step 5)
Current behavior:
- validates payload and service status
- returns structured error model
- returns `VERIFICATION_NOT_IMPLEMENTED` until Step 6/8 are done

Example:
```bash
curl -s -X POST http://localhost:3000/v1/payments/execute \
  -H 'content-type: application/json' \
  -d '{"serviceId":"weather-api","requestId":"req_001","paymentTxHash":"0x1111111111111111111111111111111111111111111111111111111111111111","payload":{"location":"NYC"}}' | jq
```
