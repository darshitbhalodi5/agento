#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000}"
SERVICE_ID="${SERVICE_ID:-weather-api}"
REQUEST_ID="${REQUEST_ID:-req_demo_001}"
PAYMENT_TX_HASH="${PAYMENT_TX_HASH:-0x1111111111111111111111111111111111111111111111111111111111111111}"

echo "[1/5] Health check"
curl -s "$API_BASE/v1/health" | jq

echo "[2/5] Quote request"
curl -s -X POST "$API_BASE/v1/payments/quote" \
  -H 'content-type: application/json' \
  -d "{\"serviceId\":\"$SERVICE_ID\",\"endpoint\":\"/forecast/7d\"}" | jq

echo "[3/5] Execute request (replace PAYMENT_TX_HASH with a real Tempo tx for full success path)"
curl -s -X POST "$API_BASE/v1/payments/execute" \
  -H 'content-type: application/json' \
  -d "{\"serviceId\":\"$SERVICE_ID\",\"requestId\":\"$REQUEST_ID\",\"paymentTxHash\":\"$PAYMENT_TX_HASH\",\"payload\":{\"location\":\"NYC\"}}" | jq

echo "[4/5] Audit lookup"
curl -s "$API_BASE/v1/requests/$REQUEST_ID?serviceId=$SERVICE_ID" | jq

echo "[5/5] Dashboard"
echo "Open: $API_BASE/v1/dashboard"
