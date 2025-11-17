#!/bin/bash
# Test Paddle Webhook Locally
# This script sends a test webhook payload to your local server

echo "🧪 Testing Paddle Webhook Handler"
echo "=================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3333/health > /dev/null; then
  echo "❌ Server is not running on port 3333"
  echo "Start the server with: pnpm dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Test webhook payload (subscription.created event)
echo "📤 Sending test webhook (subscription.created)..."
echo ""

curl -X POST http://localhost:3333/webhooks/paddle \
  -H "Content-Type: application/json" \
  -H "Paddle-Signature: test-signature" \
  -d '{
    "event_id": "evt_test123",
    "event_type": "subscription.created",
    "occurred_at": "2025-01-13T10:00:00.000Z",
    "notification_id": "ntf_test123",
    "data": {
      "id": "sub_test123",
      "status": "active",
      "customer_id": "ctm_test123",
      "custom_data": {
        "userId": "test-user-id"
      },
      "next_billed_at": "2025-02-13T10:00:00.000Z"
    }
  }'

echo ""
echo ""
echo "Note: This will fail signature verification (expected)"
echo "Use Paddle Dashboard > Events > Webhook Simulator for real testing"
