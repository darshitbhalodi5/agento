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
