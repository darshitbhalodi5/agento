# Agento Frontend Demo Runbook (Next.js)

## Goal
Run a complete judge/demo walkthrough from the separate Next.js frontend while using the existing backend APIs.

## 1) Start Backend
In terminal A:
```bash
cd /home/db/agento
cp .env.example .env
npm install
npm run db:migrate
npm run dev:backend
```

Required backend env notes:
- `FRONTEND_ORIGINS=http://localhost:3001`
- `APP_BASE_URL=http://127.0.0.1:3000`

## 2) Start Frontend
In terminal B:
```bash
cd /home/db/agento
npm run install:frontend
cp frontend/.env.example frontend/.env.local
npm run dev:frontend
```

Frontend URL:
- `http://localhost:3001`

## 3) Session Controls (Top of UI)
Set:
- API Base URL: `http://localhost:3000`
- Agent API Key: `agento-dev-agent-key`
- User Role: `provider` (switch to `admin` when needed)

## 4) Guided Demo Sequence
1. Payments (`/payments`)
   - Apply happy or error preset.
   - Run Quote -> Execute -> Status.
2. Registry (`/registry`)
   - Apply discovery preset and load services.
   - Apply provider write preset and submit write forms.
3. Orchestrations (`/orchestrations`)
   - Apply happy/error run preset.
   - Enqueue run, load run history, summary, timeline.
4. Observability (`/observability`)
   - Refresh observability data.
   - Load billing summary.
   - Open backend dashboard link.

## 5) Automated Smoke (Optional)
```bash
cd /home/db/agento
npm run test:frontend:smoke
```

## 6) Troubleshooting
- Browser CORS error:
  - confirm backend `FRONTEND_ORIGINS` includes `http://localhost:3001`
- `401` on execute/orchestration:
  - set `Agent API Key` in session controls
- `403` on registry writes:
  - set `User Role` to `provider` or `admin`
- `SERVICE_NOT_FOUND`:
  - seed demo service in DB
