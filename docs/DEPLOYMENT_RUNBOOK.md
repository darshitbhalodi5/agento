# Agento Deployment Runbook

Last updated: 2026-02-14

## Scope
This runbook defines the minimum production handoff flow for:
- Safe deployment
- Post-deploy verification
- Rollback execution
- Incident response checkpoints

Related reliability targets are defined in:
- `docs/SLO_TARGETS.md`

## Environments
- `staging`: pre-release validation with production-like config
- `production`: public/demo-facing environment

## Required Inputs
- Git commit SHA to deploy
- Environment values:
  - `DATABASE_URL`
  - `TEMPO_RPC_URL`
  - `CHAIN_ID`
  - `APP_BASE_URL`
  - `DOWNSTREAM_API_URL`
  - `INTERNAL_API_KEY`
- Database migration status

## Pre-Deploy Checklist
1. Confirm local CI quality gates:
   - `npm run check`
   - `npm run build`
   - `npm test`
2. Confirm migrations are committed and ordered.
3. Confirm deployment branch/commit SHA is final.
4. Confirm secrets are present in target environment.
5. Confirm rollback target SHA is identified.

## Deployment Procedure
1. Build artifact from target commit SHA.
2. Deploy app artifact to `staging`.
3. Run staging DB migrations:
```bash
npm run db:migrate
```
4. Staging smoke checks:
   - `GET /v1/health` returns `200`
   - `GET /v1/orchestrations/runs?limit=5` responds
   - `GET /v1/orchestrations/runs/:runId/summary` route reachable
   - `POST /v1/orchestrations/run` enqueues with valid `x-agent-api-key`
5. Deploy same artifact to `production`.
6. Run production migrations.
7. Run production smoke checks (same as staging).

## Post-Deploy Verification
1. Verify dashboards/metrics:
   - request error rate
   - p95 latency
   - orchestration queue movement (`queued -> running -> completed/failed`)
2. Verify auth controls:
   - write route without `x-user-role` returns `403`
   - execute/orchestration run without `x-agent-api-key` returns `401`
3. Verify at least one orchestration run summary includes `runOutput`.

## Rollback Procedure
1. Trigger rollback to previous known-good SHA.
2. Re-deploy previous artifact.
3. Re-run smoke checks.
4. If migration introduced backward-incompatible schema:
   - freeze writes
   - apply documented manual rollback/data repair steps
   - verify read/write restoration

## Incident Severity Guide
- `SEV-1`: API unavailable, widespread payment/orchestration failure
- `SEV-2`: elevated error rate or degraded orchestration execution
- `SEV-3`: non-critical feature degradation

## Incident Response Checklist
1. Acknowledge alert and classify severity.
2. Verify scope (`health`, key API routes, DB connectivity).
3. Mitigate:
   - rollback deploy if release-correlated
   - disable risky traffic path if needed
4. Communicate status and ETA.
5. Capture timeline and root-cause follow-up actions.

## Ownership
- Release Owner: executes deploy + rollback
- API Owner: validates route behavior and auth controls
- Data Owner: validates migrations and data integrity
