# Agento Build Steps (Push After Each Step)

## Step 1 (done)
- Initialize repository structure
- Add README and build steps
- Add .gitignore

## Step 2 (done)
- Scaffold Fastify TypeScript app
- Add health route
- Add environment config module

## Step 3 (done)
- Add Postgres connection + base schema migration
- Add `services` and `api_requests` tables

## Step 4 (done)
- Implement `POST /v1/payments/quote`

## Step 5 (done)
- Implement `POST /v1/payments/execute` skeleton (validation + error model)

## Step 6 (done)
- Add Tempo payment verification (receipt/event parsing)

## Step 7 (done)
- Add replay protection and audit logging

## Step 8 (done)
- Integrate downstream protected API call

## Step 9 (done)
- Add minimal read-only dashboard

## Step 10 (done)
- Add tests + demo script + final polish

## Step 11 (done)
- Build lightweight frontend app for demo flow
- Add Quote form (`/v1/payments/quote`)
- Add Execute form (`/v1/payments/execute`)
- Add Request status lookup (`/v1/requests/:requestId`)
- Keep `/v1/dashboard` as read-only telemetry panel

## Step 12 (done)
- Frontend polish for hackathon demo
- Add guided demo mode with prefilled inputs
- Add submission screenshots and short walkthrough

## Step 13 (done)
- Add Agent Registry backend + UI
- Agent/service capability CRUD
- Service catalog list with price, status, and tags

## Step 14 (done)
- Add Reputation module
- Compute success rate, failure rate, and median latency per service
- Show reputation cards in frontend

## Step 15 (next)
- Add Multi-Agent Orchestration MVP
- Define 2-3 step workflow execution
- Step-level payment + fallback handling

## Step 16
- Add Workflow Run History + Observability
- Persist orchestration runs and per-step outcomes
- Add run timeline view with tx hashes and error reasons
