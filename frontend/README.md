# Agento Frontend (Next.js)

Standalone frontend app for demo and interaction flows, using the existing backend APIs.

## Prerequisites
- Node.js 20+
- Backend app running (`/home/db/agento`) on port `3000`

## Setup
```bash
cd /home/db/agento/frontend
npm install
cp .env.example .env.local
```

## Run
```bash
npm run dev
```

App URL:
- `http://localhost:3001`

## Environment
- `NEXT_PUBLIC_API_BASE_URL` (default from `.env.example`: `http://localhost:3000`)
- Ensure backend `.env` includes `FRONTEND_ORIGINS=http://localhost:3001` (or your frontend origin) for CORS.

## QA
Automated smoke harness:
```bash
npm run test:smoke
```

Manual checklist:
- `frontend/tests/SMOKE_CHECKLIST.md`

## Current Status
- FE-01 bootstrap completed.
- Feature pages and API integrations are tracked in `/home/db/agento-frontend-executable-tickets.md`.
