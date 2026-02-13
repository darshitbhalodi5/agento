# Agento Build Steps (Push After Each Step)

## Step 1 (current)
- Initialize repository structure
- Add README and build steps
- Add .gitignore

## Step 2
- Scaffold Fastify TypeScript app
- Add health route
- Add environment config module

## Step 3
- Add Postgres connection + base schema migration
- Add `services` and `api_requests` tables

## Step 4
- Implement `POST /v1/payments/quote`

## Step 5
- Implement `POST /v1/payments/execute` skeleton (validation + error model)

## Step 6
- Add Tempo payment verification (receipt/event parsing)

## Step 7
- Add replay protection and audit logging

## Step 8
- Integrate downstream protected API call

## Step 9
- Add minimal read-only dashboard

## Step 10
- Add tests + demo script + final polish
