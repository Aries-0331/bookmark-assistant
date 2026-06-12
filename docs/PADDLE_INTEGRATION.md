# Paddle Payment Integration

> **Pro 订阅支付集成 - 使用 Paddle Billing 平台**

> **注意：** Website 仅展示价格信息，升级流程仅在 Chrome 扩展内进行。

## 📐 设计原则

1. **Extension-First Checkout** - 扩展直接打开 Paddle 托管结账页
2. **服务端验证** - Webhook 验证签名，确保安全
3. **灵活升级路径** - 支持月付和终身买断
4. **用户友好对账** - 通过 userId 和 email 双重匹配
5. **Website 简化** - 网站只展示价格，不处理支付

---

## 🏗 架构设计

### 支付流程架构

```mermaid
graph TB
    subgraph "Frontend"
        UI[Options/Website UI]
        Store[Zustand Store]
    end

    subgraph "Backend API"
        API["/api/paddle/checkout-url"]
        Webhook["/api/paddle/webhooks/paddle"]
        DB[(PostgreSQL)]
    end

    subgraph "Paddle Platform"
        PaddleAPI[Paddle API]
        PaddleCheckout[Hosted Checkout]
        PaddleWebhook[Webhook Events]
    end

    UI -->|1. Request checkout| API
    API -->|2. Create transaction| PaddleAPI
    PaddleAPI -->|3. Return checkout URL| API
    API -->|4. Return URL| UI
    UI -->|5. Open in new tab| PaddleCheckout

    PaddleCheckout -->|6. User completes payment| PaddleWebhook
    PaddleWebhook -->|7. Send events| Webhook
    Webhook -->|8. Verify signature| Webhook
    Webhook -->|9. Update user plan| DB

    UI -.->|10. Poll for entitlements| Store
    Store -.->|11. Refresh Pro status| UI

    style UI fill:#e3f2fd
    style API fill:#fff9c4
    style DB fill:#f3e5f5
    style PaddleCheckout fill:#c8e6c9
```

---

## 💳 定价方案

### 当前价格

| 方案         | 价格          | 特点                   |
| ------------ | ------------- | ---------------------- |
| **Monthly**  | $2.50/月      | 按月付费，随时取消     |
| **Lifetime** | $30 一次性    | 永久访问，包含未来更新 |

### 功能对比

| 功能     | Free          | Pro ($2.50/月) |
| -------- | ------------- | -------------- |
| 手动同步 | ✅ 不限书签数量 | ✅ 不限书签数量 |
| 自动同步 | ❌            | ✅ 6小时最小间隔 |
| 智能去重 | ❌            | ✅ 指纹识别      |
| AI 标签  | ❌            | 规划中           |
| AI 摘要  | ❌            | 规划中           |
| 支持     | 社区          | 优先响应         |

---

## 🔄 核心流程

### 1. 购买流程（Extension）

```mermaid
sequenceDiagram
    actor User
    participant UI as BillingSection
    participant Server as Backend API
    participant Paddle as Paddle Billing
    participant DB as Database

    User->>UI: 点击 "Upgrade to Pro"
    UI->>Server: POST /checkout-url<br/>{pricing, userId, email}
    Server->>Paddle: Create Transaction<br/>with custom_data
    Paddle-->>Server: Return checkout URL
    Server-->>UI: { checkoutUrl }
    UI->>Paddle: Open URL in new tab

    Note over Paddle: User enters payment info

    Paddle->>Server: Webhook: transaction.completed
    Server->>Server: Verify signature
    Server->>DB: UPDATE users<br/>SET plan='pro'
    Server-->>Paddle: 200 OK

    Note over UI: Redirect to /success?upgraded=true

    UI->>Server: Refresh entitlements
    Server-->>UI: { isPro: true }
    UI->>UI: Show success toast
```

### 2. Webhook 处理逻辑

```mermaid
graph TD
    Start[Webhook Event Received] --> VerifySig{Verify<br/>Signature?}
    VerifySig -->|Invalid| Reject[Return 400]
    VerifySig -->|Valid| CheckType{Event Type?}

    CheckType -->|transaction.completed| FindUser1[Find User]
    CheckType -->|subscription.*| FindUser2[Find User]
    CheckType -->|Other| Ignore[Log & Return 200]

    FindUser1 --> Match1{Found<br/>by userId?}
    Match1 -->|Yes| UpdatePro1[Set plan='pro'<br/>purchaseType='lifetime']
    Match1 -->|No| MatchEmail1{Found<br/>by email?}
    MatchEmail1 -->|Yes| UpsertUser1[Upsert User]
    MatchEmail1 -->|No| CreateLicense[Create license key]

    FindUser2 --> Match2{Found<br/>by userId?}
    Match2 -->|Yes| UpdateSub[Update subscription status]
    Match2 -->|No| MatchCustomer{Found by<br/>customerId?}
    MatchCustomer -->|Yes| UpdateSub
    MatchCustomer -->|No| MatchEmail2{Found<br/>by email?}
    MatchEmail2 -->|Yes| UpsertUser2[Upsert User]
    MatchEmail2 -->|No| LogWarning[Log warning]

    UpdatePro1 --> Success[Return 200 OK]
    UpsertUser1 --> Success
    CreateLicense --> Success
    UpdateSub --> Success
    UpsertUser2 --> Success
    LogWarning --> Success
    Ignore --> Success

    style Start fill:#e3f2fd
    style Success fill:#c8e6c9
    style Reject fill:#ffcdd2
    style UpdatePro1 fill:#fff9c4
```

### 3. 订阅管理（Monthly Only）

```mermaid
sequenceDiagram
    actor User
    participant UI as BillingSection
    participant Server as Backend API
    participant Paddle as Paddle API
    participant DB as Database

    User->>UI: 点击 "Manage Subscription"
    UI->>Server: POST /portal-session
    Server->>DB: Get paddleCustomerId<br/>& subscriptionId
    DB-->>Server: Return IDs
    Server->>Paddle: Create Portal Session
    Paddle-->>Server: Return portal URL
    Server-->>UI: { url }
    UI->>Paddle: Open portal in new tab

    Note over Paddle: User updates payment<br/>or cancels subscription

    Paddle->>Server: Webhook: subscription.updated
    Server->>DB: Update user status
    Server-->>Paddle: 200 OK
```

---

## 🔧 技术实现

### Extension: paddle.ts

**核心函数**:

```typescript
openPaddleCheckout({
  pricing: 'monthly' | 'lifetime',
  userId: string,
  userEmail?: string,
  successUrl: string
})
```

**实现策略**:

- ❌ 不使用 `@paddle/paddle-js`（CDN 资源违反 CSP）
- ✅ 服务端生成 checkout URL，前端打开新标签页
- ✅ 通过 `custom_data` 传递 `userId` 进行用户匹配

### Server: paddle.ts Routes

| 端点                   | 方法 | 用途                 |
| ---------------------- | ---- | -------------------- |
| `/checkout-url`        | POST | 创建 Paddle 结账会话 |
| `/webhooks/paddle`     | POST | 处理 Paddle 事件回调 |
| `/portal-session`      | POST | 生成订阅管理门户链接 |
| `/cancel-subscription` | POST | 取消月付订阅         |
| `/subscription-info`   | GET  | 获取订阅详情         |

### Webhook 事件处理

**监听事件**:

- `transaction.completed` - 终身购买完成
- `subscription.created` - 月付订阅创建
- `subscription.activated` - 订阅激活
- `subscription.updated` - 订阅更新
- `subscription.canceled` - 订阅取消
- `subscription.past_due` - 支付逾期
- `subscription.paused` - 订阅暂停

**匹配优先级**:

1. **customData.userId** - 扩展传递的内部用户 ID（CUID）
2. **paddleCustomerId** - Paddle Customer ID（用于续费/取消）
3. **email** - 邮箱匹配（Fallback，用于 upsert）

### 安全机制

```mermaid
graph LR
    Webhook[Paddle Webhook] -->|1. Include signature| Server
    Server -->|2. Extract signature| Header[paddle-signature header]
    Server -->|3. Verify with secret| Verify{Valid?}
    Verify -->|No| Reject[400 Bad Request]
    Verify -->|Yes| Process[Process Event]
    Process --> DB[(Update Database)]
    DB --> Success[200 OK]

    style Webhook fill:#c8e6c9
    style Verify fill:#fff9c4
    style Reject fill:#ffcdd2
    style Success fill:#e3f2fd
```

**保护措施**:

- ✅ Webhook 签名验证（`paddle-signature` header）
- ✅ API Key 仅服务端存储
- ✅ Client Token 安全（浏览器端可用）
- ✅ Custom Data 传递 userId 避免依赖 email

---

## 🧪 测试配置

### 环境变量

**Server** (`packages/server/.env`):

```bash
# Paddle API
PADDLE_API_KEY=test_xxxxx
PADDLE_ENVIRONMENT=sandbox
PADDLE_WEBHOOK_SECRET=<paddle-webhook-secret>
PADDLE_PRO_MONTHLY_PRICE_ID=pri_xxxxx
PADDLE_PRO_LIFETIME_PRICE_ID=pri_xxxxx

# Pricing Fallback
PRICE_MONTHLY_USD=2.99
PRICE_LIFETIME_USD=29.99
```

**Extension** (`packages/extension/.env`):

```bash
VITE_PADDLE_CLIENT_TOKEN=test_xxxxx
VITE_PADDLE_ENVIRONMENT=sandbox
VITE_OAUTH_SERVER_URL=http://localhost:3000
VITE_WEBSITE_URL=http://localhost:3001
```

### 快速测试

**1. 设置 Paddle Sandbox**:

- 注册: https://sandbox-login.paddle.com/signup
- 创建产品 "Bookmark Sync Pro"
- 创建 Monthly 和 Lifetime 价格
- 复制 Price ID 到 `.env`

**2. 配置 Webhook**:

```bash
# 启动服务
pnpm dev:server

# 启动 ngrok
ngrok http 3000

# Paddle Dashboard 添加 Webhook:
# URL: https://your-ngrok.ngrok.io/api/paddle/webhooks/paddle
# Events: All transaction & subscription events
```

**3. 测试购买流程**:

```bash
# 加载扩展
pnpm build:extension

# 在 Chrome 中:
1. 连接 Notion
2. 进入 Billing 页面
3. 点击 "Upgrade to Pro"
4. 使用测试卡: 4242 4242 4242 4242
5. 完成支付
6. 检查 webhook logs
7. 刷新 Options 页面，验证 Pro 状态
```

### 测试卡号

| 卡号                | 场景           | 结果        |
| ------------------- | -------------- | ----------- |
| 4242 4242 4242 4242 | 正常支付       | ✅ 成功     |
| 4000 0000 0000 0002 | 卡被拒绝       | ❌ 失败     |
| 4000 0025 0000 3155 | 需要 3D Secure | 🔐 需要验证 |

### 验证 Webhook

**检查日志**:

```bash
# Server logs
🎫 Creating Paddle checkout URL...
✅ Checkout URL created: https://...
📥 Webhook: transaction.completed
✅ Updated user xxx to pro via webhook
```

**验证数据库**:

```sql
SELECT id, email, plan, purchase_type, paddle_customer_id
FROM users
WHERE plan = 'pro';
```

---

## 📊 状态管理

### Database Schema

```typescript
User {
  id: string (CUID)
  email: string
  plan: 'free' | 'pro'
  purchaseType?: 'monthly' | 'lifetime'
  paddleCustomerId?: string
  paddleSubscriptionId?: string
  licenseKey?: string
}
```

### Extension Storage

```typescript
ChromeLocalCache {
  is_pro: boolean
  purchase_type?: 'monthly' | 'lifetime'
  user_id: string
  user_email: string
}
```

---

## 🔗 相关文档

- [Paddle Developer Docs](https://developer.paddle.com/)
- [Paddle Sandbox Dashboard](https://sandbox-vendors.paddle.com/)
- [Testing Payment Methods](https://developer.paddle.com/concepts/payment-methods/credit-debit-card)
- [Webhook Events Reference](https://developer.paddle.com/webhooks/overview)
- [Testing Checklist](../TESTING_CHECKLIST.md)
