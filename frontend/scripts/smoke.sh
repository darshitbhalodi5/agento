#!/usr/bin/env bash
set -euo pipefail

FRONTEND_BASE="${FRONTEND_BASE:-http://localhost:3001}"
API_BASE="${API_BASE:-http://localhost:3000}"

tmp_file="$(mktemp)"
cleanup() {
  rm -f "$tmp_file"
}
trap cleanup EXIT

check_status() {
  local method="$1"
  local url="$2"
  local expected="$3"
  local body="${4:-}"
  shift 4 || true
  local extra_headers=("$@")

  local curl_args=(-s -o "$tmp_file" -w "%{http_code}" -X "$method" "$url")
  if [[ -n "$body" ]]; then
    curl_args+=(-H "content-type: application/json" -d "$body")
  fi
  for h in "${extra_headers[@]}"; do
    curl_args+=(-H "$h")
  done

  local code
  code="$(curl "${curl_args[@]}")"
  if [[ "$code" != "$expected" ]]; then
    echo "FAIL: $method $url expected $expected got $code"
    echo "--- response ---"
    cat "$tmp_file"
    exit 1
  fi
  echo "PASS: $method $url -> $code"
}

check_contains() {
  local url="$1"
  local token="$2"
  local html
  html="$(curl -s "$url")"
  if ! grep -q "$token" <<<"$html"; then
    echo "FAIL: $url does not contain token: $token"
    exit 1
  fi
  echo "PASS: $url contains $token"
}

echo "[1/4] Frontend page checks"
check_status "GET" "$FRONTEND_BASE/" "200" ""
check_status "GET" "$FRONTEND_BASE/payments" "200" ""
check_status "GET" "$FRONTEND_BASE/registry" "200" ""
check_status "GET" "$FRONTEND_BASE/orchestrations" "200" ""
check_status "GET" "$FRONTEND_BASE/observability" "200" ""
check_contains "$FRONTEND_BASE/payments" "Quote, Execute, and Request Status"
check_contains "$FRONTEND_BASE/registry" "Service Discovery and Writes"
check_contains "$FRONTEND_BASE/orchestrations" "Run and Observe Workflow Executions"
check_contains "$FRONTEND_BASE/observability" "Operational Evidence and Read Models"

echo "[2/4] Payments API smoke"
check_status "POST" "$API_BASE/v1/payments/quote" "400" "{}"
check_status "POST" "$API_BASE/v1/payments/execute" "401" '{"serviceId":"weather-api","requestId":"req_x","paymentTxHash":"0x1111111111111111111111111111111111111111111111111111111111111111","payload":{"location":"NYC"}}'
check_status "GET" "$API_BASE/v1/requests/req_x" "400" ""

echo "[3/4] Registry API smoke"
check_status "GET" "$API_BASE/v1/registry/services?active=yes" "400" ""
check_status "POST" "$API_BASE/v1/registry/agents" "403" '{"id":"agent_smoke","name":"Agent Smoke","capabilities":[]}'
check_status "POST" "$API_BASE/v1/registry/services" "403" '{"id":"service_smoke","name":"Service Smoke","providerWallet":"0x031891A61200FedDd622EbACC10734BC90093B2A","tokenAddress":"0x20c0000000000000000000000000000000000001","priceAtomic":"1000","memoPrefix":"api","tags":[]}'

echo "[4/4] Orchestration API smoke"
check_status "POST" "$API_BASE/v1/orchestrations/run" "401" '{"runId":"run_smoke","workflowId":"wf_smoke","steps":[{"stepId":"s1","payload":{"x":1},"candidates":[{"serviceId":"weather-api","paymentTxHash":"0x1111111111111111111111111111111111111111111111111111111111111111"}]}]}'
check_status "GET" "$API_BASE/v1/orchestrations/runs?runStatus=unknown" "400" ""

echo "Frontend smoke checks passed."
