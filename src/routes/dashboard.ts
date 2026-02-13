import type { FastifyPluginAsync } from 'fastify'
import { getDashboardStats, getRecentRequests } from '../db/api-requests.js'

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`
}

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/dashboard', async (_request, reply) => {
    const [stats, recent] = await Promise.all([getDashboardStats(), getRecentRequests(25)])

    const rows = recent
      .map((row) => {
        return `<tr>
  <td>${esc(row.serviceId)}</td>
  <td>${esc(row.requestId)}</td>
  <td title="${esc(row.paymentTxHash)}">${esc(shortHash(row.paymentTxHash))}</td>
  <td>${esc(row.verificationStatus)}</td>
  <td>${esc(row.executionStatus)}</td>
  <td>${esc(row.errorCode ?? '-')}</td>
  <td>${esc(new Date(row.createdAt).toLocaleString())}</td>
</tr>`
      })
      .join('\n')

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agento Dashboard</title>
  <style>
    :root {
      --agento-navy: #0B1220;
      --agento-cyan: #19C2FF;
      --agento-mint: #19D3A2;
      --agento-surface: #F8FAFC;
      --agento-slate-700: #334155;
      --agento-slate-500: #64748B;
      --agento-slate-200: #E2E8F0;
      --agento-white: #FFFFFF;
      --agento-success: #16A34A;
      --agento-error: #DC2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", system-ui, -apple-system, Segoe UI, sans-serif;
      color: var(--agento-slate-700);
      background: radial-gradient(circle at top right, #dff5ff 0, #f8fafc 45%, #eef7f2 100%);
    }
    .wrap {
      max-width: 1100px;
      margin: 24px auto;
      padding: 0 16px;
    }
    .hero {
      background: linear-gradient(135deg, #0B1220 0%, #0E1E3A 45%, #19C2FF 100%);
      color: var(--agento-white);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
    }
    .hero h1 { margin: 0 0 6px; font-size: 28px; }
    .hero p { margin: 0; opacity: .9; }
    .grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .card {
      background: var(--agento-white);
      border: 1px solid var(--agento-slate-200);
      border-radius: 12px;
      padding: 12px;
    }
    .k { color: var(--agento-slate-500); font-size: 12px; margin-bottom: 6px; }
    .v { color: var(--agento-navy); font-size: 22px; font-weight: 700; }
    .ok { color: var(--agento-success); }
    .bad { color: var(--agento-error); }
    .table-wrap {
      background: var(--agento-white);
      border: 1px solid var(--agento-slate-200);
      border-radius: 12px;
      overflow: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid var(--agento-slate-200); white-space: nowrap; }
    th { background: #f1f5f9; color: var(--agento-slate-700); position: sticky; top: 0; }
    .foot {
      margin-top: 10px;
      font-size: 12px;
      color: var(--agento-slate-500);
    }
    @media (max-width: 900px) {
      .grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Agento Dashboard</h1>
      <p>Read-only gateway telemetry for payment verification and execution flow.</p>
    </section>

    <section class="grid">
      <article class="card"><div class="k">Total Requests</div><div class="v">${stats.totalRequests}</div></article>
      <article class="card"><div class="k">Verified Payments</div><div class="v ok">${stats.verifiedPayments}</div></article>
      <article class="card"><div class="k">Replay Blocks</div><div class="v">${stats.replayBlocks}</div></article>
      <article class="card"><div class="k">Execution Success</div><div class="v ok">${stats.executionSucceeded}</div></article>
      <article class="card"><div class="k">Execution Failed</div><div class="v bad">${stats.executionFailed}</div></article>
    </section>

    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Request ID</th>
            <th>Tx Hash</th>
            <th>Verification</th>
            <th>Execution</th>
            <th>Error</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7">No requests yet.</td></tr>'}
        </tbody>
      </table>
    </section>

    <div class="foot">Route: /v1/dashboard | Updated on page load only.</div>
  </div>
</body>
</html>`

    return reply.type('text/html; charset=utf-8').send(html)
  })
}
