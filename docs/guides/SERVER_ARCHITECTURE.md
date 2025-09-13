# 🔐 Secure OAuth Server Implementation

## Express.js OAuth Token Exchange Server

This server handles secure OAuth token exchange for the Bookmark Notion Sync Chrome extension.

### 🏗️ Architecture Overview

```
Chrome Extension → Your Server → Notion API
     (code)      →   (secure)  →  (tokens)
```

### 🔧 Setup Instructions

1. **Environment Variables**

   ```bash
   NODE_ENV=production
   PORT=3000
   NOTION_CLIENT_ID=your_client_id
   NOTION_CLIENT_SECRET=your_client_secret
   ALLOWED_EXTENSION_ID=your_chrome_extension_id
   DATABASE_URL=your_database_connection_string
   JWT_SECRET=your_jwt_secret_for_sessions
   ```

2. **Install Dependencies**

   ```bash
   npm install express cors helmet dotenv jsonwebtoken bcrypt
   npm install --save-dev @types/node @types/express typescript ts-node
   ```

3. **Database Schema**
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     extension_user_id VARCHAR(255) UNIQUE,
     notion_access_token TEXT,
     notion_refresh_token TEXT,
     notion_bot_id VARCHAR(255),
     notion_workspace_id VARCHAR(255),
     duplicated_template_id VARCHAR(255),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

### 🛡️ Security Features

- **CORS Protection**: Only allows requests from your Chrome extension
- **Rate Limiting**: Prevents abuse and brute force attacks
- **Input Validation**: Validates all incoming data
- **Secure Token Storage**: Encrypted storage of sensitive tokens
- **Session Management**: JWT-based user sessions
- **Audit Logging**: Tracks all OAuth operations

### 🎯 API Endpoints

| Endpoint              | Method | Purpose                  | Auth Required |
| --------------------- | ------ | ------------------------ | ------------- |
| `/oauth/exchange`     | POST   | Exchange code for tokens | Extension ID  |
| `/oauth/refresh`      | POST   | Refresh expired tokens   | JWT Session   |
| `/notion/databases`   | GET    | List user's databases    | JWT Session   |
| `/notion/create-page` | POST   | Create bookmark page     | JWT Session   |
| `/notion/query`       | POST   | Query database           | JWT Session   |

### 🔄 OAuth Flow Implementation

1. **Extension** → `POST /oauth/exchange` with authorization code
2. **Server** → Validates extension, exchanges code with Notion
3. **Server** → Stores tokens securely, returns session JWT
4. **Extension** → Uses JWT for subsequent API calls

### 🎨 Template Integration

The server automatically handles OAuth template integration:

- Detects `duplicated_template_id` in Notion's response
- Associates template with user's account
- Provides template validation endpoints

---

**Next Steps**: Deploy this server and update your extension to use it!
