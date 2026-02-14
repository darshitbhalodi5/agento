# Frontend Smoke Checklist (FE-11)

Use this checklist for repeatable QA before demo.

## Prerequisites
1. Backend running: `http://localhost:3000`
2. Frontend running: `http://localhost:3001`
3. Backend DB migrated.

## Automated Smoke Harness
From repo root:
```bash
npm run test:frontend:smoke
```

What it validates:
- Frontend page availability:
  - `/`
  - `/payments`
  - `/registry`
  - `/orchestrations`
  - `/observability`
- Payments API route path coverage:
  - quote
  - execute
  - status
- Registry API route path coverage:
  - service filter validation
  - role-protected write paths
- Orchestration API route path coverage:
  - run enqueue auth requirement
  - run query validation

## Manual End-to-End Checklist
1. Session controls:
   - set API base to `http://localhost:3000`
   - set role to `provider`
   - set agent key to `agento-dev-agent-key`
2. Payments page:
   - run quote
   - run execute (expect deterministic error without real tx)
   - run status lookup
3. Registry page:
   - apply discovery preset
   - load services and agents
   - run provider write preset and submit writes
4. Orchestrations page:
   - apply happy/error presets
   - enqueue run
   - load runs list
   - fetch summary and timeline for selected run
5. Observability page:
   - refresh observability
   - load billing summary
   - open backend dashboard link

## Result Recording
- Capture pass/fail and timestamp per section.
- If fail, include:
  - page/API step
  - response status
  - payload used
