import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  scenarios: {
    health_smoke: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || '60s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<250', 'avg<120'],
  },
}

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  const res = http.get(`${baseUrl}/v1/health`)
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has ok true': (r) => r.json('ok') === true,
  })
  sleep(0.1)
}
