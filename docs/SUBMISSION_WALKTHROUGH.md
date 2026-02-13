# Agento Submission Walkthrough

## Demo Objective
Show that Agento enforces payment verification before API execution and provides auditable request telemetry.

## Prerequisites
1. App running locally:
```bash
npm run dev
```
2. Database migrated and seeded with at least one active service (`weather-api`).
3. Optional for happy path: real Tempo transaction hash with matching memo hash.

## Primary Demo Route
- Frontend app: `http://localhost:3000/v1/app`
- Telemetry dashboard: `http://localhost:3000/v1/dashboard`

## 3-Minute Demo Script
1. Open `/v1/app`.
2. Click `Preset: Error Path Inputs`.
3. Run `Run Quote`.
4. Click `Verify + Execute` to show controlled verification failure.
5. Run `Run Status Lookup` to show persisted audit state.
6. Open `/v1/dashboard` in new tab and show counters + recent request row.
7. Switch to `Preset: Happy Path Inputs`, replace tx hash with real Tempo tx, run execute.
8. Show successful status + dashboard update.

## Screenshot Checklist
Capture these for submission:
1. Frontend app with all three panels visible.
2. Quote response panel showing token/amount/recipient/memo template.
3. Execute response panel showing verification success OR controlled failure code.
4. Request status panel showing stored audit details.
5. Dashboard showing aggregate counters and recent requests.

## Suggested Submission Copy (Short)
Agento is a Tempo-native pay-per-API gateway for autonomous agents. Each request is executed only after on-chain payment verification (receipt, token, recipient, amount, memo binding) with replay protection and audit logs. The product includes a live demo UI and telemetry dashboard for transparent proof.

## Troubleshooting
- `SERVICE_NOT_FOUND`: ensure `services` seed exists.
- `PAYMENT_NOT_FOUND`: use real Tempo tx hash or demonstrate error-path mode.
- `REPLAY_DETECTED`: use a new request ID and/or new tx hash.
