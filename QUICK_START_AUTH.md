# Quick Start: Testing Auth & Upgrade Flow

## 🚀 Start Development Servers

```bash
# Terminal 1: Start backend server
pnpm dev:server

# Terminal 2: Start extension dev server  
cd packages/extension && pnpm dev

# Terminal 3 (optional): Start ngrok for webhooks
ngrok http 3333
```

## 🔍 Test OAuth Flow

1. **Load Extension**
   - Go to `chrome://extensions`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select `packages/extension/dist`

2. **Connect to Notion**
   - Click extension icon → Opens options page
   - Click "Connect to Notion"
   - Complete OAuth flow

3. **Verify State**
   ```javascript
   // Open DevTools Console on options page
   chrome.storage.local.get(['user_id', 'user_email', 'is_pro', 'features'], console.log);
   
   // Check Zustand store
   useAppStore.getState();
   ```

Expected output:
```javascript
{
  user_id: "chrome-extension-id-here",
  user_email: "your-email@example.com",  // NEW!
  is_pro: false,
  features: []
}
```

## 💳 Test Payment Upgrade

### Setup Paddle Sandbox (One-time)

1. Create account: https://sandbox-login.paddle.com/signup
2. Create product "Bookmark Sync Pro"
3. Create prices:
   - Monthly: $10/month
   - Yearly: $72/year (40% off)
4. Get credentials:
   - Settings → Developer Tools → API Keys
   - Settings → Webhooks → Webhook Secrets
5. Configure environment (see `PADDLE_SETUP.md`)

### Test Upgrade Flow

1. **Open Billing Section**
   - Extension options page → Billing tab
   - Should show "Free" plan

2. **Verify User Context**
   ```javascript
   // In BillingSection, userId and userEmail should be populated
   const { userId, userEmail } = useAppStore();
   console.log({ userId, userEmail });
   ```

3. **Click "Upgrade to Pro"**
   - Paddle checkout should open
   - Custom data should include your userId
   - Email should be pre-filled

4. **Complete Test Payment**
   - Use test card: `4242 4242 4242 4242`
   - CVV: `100`
   - Any future expiry date

5. **After Payment Success**
   - Redirects to `options.html?upgraded=true`
   - Automatically refreshes entitlements
   - UI should update to show "Pro" plan

6. **Verify Upgrade**
   ```javascript
   // Check storage
   chrome.storage.local.get(['is_pro', 'features'], console.log);
   
   // Expected:
   // { is_pro: true, features: ["auto-sync", "advanced-settings"] }
   ```

## 🐛 Debugging

### User ID/Email Not Available

```javascript
// Check OAuth response was stored
chrome.storage.local.get(['user_id', 'user_email'], (result) => {
  console.log('Storage:', result);
});

// Check Zustand store
console.log('Store:', useAppStore.getState());

// Manually set if needed (for testing)
useAppStore.getState().setUserInfo('test-user-id', 'test@example.com');
```

### Entitlements Not Refreshing

```javascript
// Manually trigger refresh
await useAppStore.getState().refreshEntitlements();

// Check message handler
const response = await chrome.runtime.sendMessage({ 
  type: 'GET_ENTITLEMENTS' 
});
console.log('Entitlements:', response);

// Check server endpoint directly
const token = (await chrome.storage.local.get('session_token')).session_token;
fetch('http://localhost:3333/v1/entitlements', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

### Webhook Not Received

```bash
# Check ngrok is running
curl http://localhost:4040/api/tunnels

# Test webhook manually
curl -X POST http://localhost:3333/webhooks/paddle \
  -H "Content-Type: application/json" \
  -H "Paddle-Signature: test" \
  -d '{
    "event_type": "subscription.created",
    "data": {
      "id": "sub_test",
      "status": "active",
      "customer_id": "ctm_test",
      "custom_data": { "userId": "YOUR_USER_ID" }
    }
  }'
```

## 📊 State Inspection

### Chrome DevTools

```javascript
// View all extension storage
chrome.storage.local.get(null, console.log);

// Watch for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  console.log('Storage changed:', changes, area);
});

// View Zustand store
useAppStore.getState();

// Subscribe to store changes
useAppStore.subscribe(console.log);
```

### Server Logs

```bash
# Watch server logs
tail -f /Users/aries/dev/bookmark-notion-sync/packages/server/logs/server.log

# Or just watch terminal where pnpm dev:server is running
```

### Database Inspection

```bash
# Connect to database
cd packages/server
pnpm prisma studio

# Or use SQL client
psql $DATABASE_URL

# Check user plan
SELECT user_id, email, plan, "paddleCustomerId", "subscriptionStatus" 
FROM "User" 
WHERE user_id = 'YOUR_USER_ID';
```

## ✅ Success Criteria

After OAuth:
- ✅ `user_id` stored in chrome.storage
- ✅ `user_email` stored in chrome.storage
- ✅ Zustand store shows `userId` and `userEmail`
- ✅ `is_pro = false`, `features = []`
- ✅ BillingSection shows "Free" plan

After Upgrade:
- ✅ Paddle checkout opened with correct user context
- ✅ Webhook received and processed by server
- ✅ Database updated: `plan = "pro"`
- ✅ `is_pro = true` in chrome.storage
- ✅ Zustand store shows `isPro = true`
- ✅ BillingSection shows "Pro" plan
- ✅ Pro features enabled (auto-sync, advanced settings)

## 📚 Related Docs

- **Detailed Flow**: [`docs/AUTH_UPGRADE_FLOW.md`](docs/AUTH_UPGRADE_FLOW.md)
- **Optimization Summary**: [`docs/AUTH_UPGRADE_OPTIMIZATION.md`](docs/AUTH_UPGRADE_OPTIMIZATION.md)
- **Paddle Setup**: [`docs/PADDLE_SETUP.md`](docs/PADDLE_SETUP.md)
- **Full Testing**: [`docs/TESTING_CHECKLIST.md`](docs/TESTING_CHECKLIST.md)

## 🎯 Quick Commands

```bash
# Rebuild extension after changes
cd packages/extension && pnpm build

# Type check all packages
pnpm tsc --noEmit

# Run server migrations
cd packages/server && pnpm prisma migrate deploy

# Generate Prisma client
cd packages/server && pnpm prisma generate

# View Prisma Studio
cd packages/server && pnpm prisma studio
```

---

**Ready to test?** Start with OAuth flow, then move to payment upgrade! 🚀
