import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    orchestrations_enqueue: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '45s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1200', 'avg<700'],
  },
}

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'
const agentApiKey = __ENV.AGENT_API_KEY || 'agento-dev-agent-key'

function runPayload() {
  const vu = __VU
  const iter = __ITER
  const runId = `k6_run_${vu}_${iter}`
  return {
    runId,
    workflowId: 'wf_k6_observability',
    steps: [
      {
        stepId: 'step_1',
        payload: { location: 'NYC' },
        candidates: [
          {
            serviceId: 'weather-api',
            paymentTxHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
          },
        ],
      },
    ],
  }
}

export default function () {
  const payload = JSON.stringify(runPayload())
  const res = http.post(`${baseUrl}/v1/orchestrations/run`, payload, {
    headers: {
      'content-type': 'application/json',
      'x-agent-api-key': agentApiKey,
    },
  })

  check(res, {
    'status accepted or db unavailable': (r) => r.status === 202 || r.status === 500,
  })

  sleep(0.2)
}
