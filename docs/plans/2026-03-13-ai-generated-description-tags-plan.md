# Implementation Plan: AI-Generated Description and Tags

## Requirements Restatement

Build an AI-powered feature for Bookmark Assistant that:
- **Generates** AI-powered description summaries and tags for bookmarks
- **Target users**: Pro users only
- **Pricing model**: User provides their own OpenAI API key (BYOK), no additional charges from us
- **Initial provider**: OpenAI (designed for extensibility)
- **Models supported**: GPT-4o, GPT-4o mini, GPT-4 Turbo, GPT-3.5 Turbo

---

## Implementation Phases

### Phase 1: Database & Schema

**Add new fields to User model** (`prisma/schema.prisma`):
- `openaiApiKey` - User's provided OpenAI API key (encrypted)
- `aiModel` - Selected model (default: gpt-4o-mini)
- `aiEnabled` - Boolean to enable/disable AI features

**Migration**:
```sql
ALTER TABLE "User" ADD COLUMN "openaiApiKey" TEXT;
ALTER TABLE "User" ADD COLUMN "aiModel" VARCHAR(50) DEFAULT 'gpt-4o-mini';
ALTER TABLE "User" ADD COLUMN "aiEnabled" BOOLEAN DEFAULT false;
```

### Phase 2: Backend API

**New endpoints** (`src/routes/ai.ts`):
1. `POST /api/ai/settings` - Save user's API key and model preference
   - Input: `{ openaiApiKey: string, model: string }`
   - Validate API key by calling OpenAI API
   - Encrypt key before storing (use AES-256)

2. `GET /api/ai/settings` - Get current AI settings (without exposing key)
   - Returns: `{ aiEnabled: boolean, model: string, hasApiKey: boolean }`

3. `DELETE /api/ai/settings` - Remove stored API key

4. `POST /api/ai/generate` - Generate description and tags for a URL
   - Input: `{ url: string, title: string, existingContent?: string }`
   - Calls OpenAI with user's API key
   - Returns: `{ description: string, tags: string[] }`
   - Rate limiting: 10 requests/minute per user

**Existing files to modify**:
- `src/routes/user.ts` - Add AI settings to profile response
- `src/services/userPrisma.ts` - Add methods for AI settings
- `src/config/index.ts` - Add encryption key for API keys

### Phase 3: Extension - Settings UI

**New component** (`packages/extension/src/options/components/AISection.tsx`):
- Input field for OpenAI API Key (password type with show/hide toggle)
- Model selection dropdown (GPT-4o, GPT-4o mini, GPT-4 Turbo, GPT-3.5 Turbo)
- Enable/Disable toggle for AI features
- Usage tips and pricing info link
- "Test API Key" button with feedback

**Existing files to modify**:
- `packages/extension/src/options/options.tsx` - Add AISection to settings page
- `packages/extension/src/options/store.ts` - Add AI state and actions
- `packages/extension/src/background/config.ts` - Update AI config to read from user settings

### Phase 4: Extension - Sync Integration

**Modify sync flow** (`packages/extension/src/background/sync.ts`):
- During bookmark sync, check if AI is enabled for Pro user
- If enabled, call AI generation API for each bookmark
- Batch requests to avoid rate limits (max 3 concurrent)
- Cache results to avoid re-generating for same URLs

**New file**:
- `packages/extension/src/background/ai-client.ts` - Handle OpenAI API calls with user's key

### Phase 5: i18n Updates

**Add translation keys**:
- `ai_settings_title`, `ai_settings_desc`
- `ai_api_key_label`, `ai_api_key_placeholder`
- `ai_model_label`, `ai_enable_label`, `ai_enable_desc`
- `ai_test_success`, `ai_test_failed`
- `ai_pro_required`, `ai_pro_message`

---

## Technical Design

### Encryption for API Keys

Use AES-256-GCM encryption for storing user's API key:
```typescript
// src/utils/crypto.ts
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY; // 32 bytes

function encrypt(text: string): string { ... }
function decrypt(encrypted: string): string { ... }
```

### AI Prompt Design

```typescript
const SYSTEM_PROMPT = `You are a bookmark organizer. Given a web page title and content, generate:
1. A 2-3 sentence description/summary
2. 3-5 relevant tags

Output as JSON: { "description": "...", "tags": ["...", "..."] }`;
```

### Extensibility Pattern

Design for future model providers:
```typescript
// src/services/ai/ai-provider.ts
interface AIProvider {
  generateDescriptionAndTags(input: GenerateInput): Promise<GenerateOutput);
}

class OpenAIProvider implements AIProvider { ... }
class AnthropicProvider implements AIProvider { ... }  // Future
class GeminiProvider implements AIProvider { ... }    // Future
```

---

## Dependencies

- `openai` npm package for OpenAI API
- Add encryption library (e.g., `crypto-js` or Node's built-in `crypto`)

---

## Risks

- **MEDIUM**: API key storage security - must encrypt at rest
- **MEDIUM**: Rate limiting - OpenAI has 3 RPM for free tier, 500 RPM for paid
- **LOW**: Cost management - users pay their own API costs
- **LOW**: Privacy - user data (URLs) sent to OpenAI, need disclosure

---

## File Changes Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add AI fields |
| `src/routes/ai.ts` | New API endpoints |
| `src/services/userPrisma.ts` | Add AI methods |
| `src/utils/crypto.ts` | New encryption util |
| `packages/extension/src/options/components/AISection.tsx` | New UI component |
| `packages/extension/src/options/options.tsx` | Add AISection |
| `packages/extension/src/options/store.ts` | Add AI state |
| `packages/extension/src/background/ai-client.ts` | New AI client |
| `packages/extension/src/background/sync.ts` | Integrate AI |
| `packages/extension/_locales/*/messages.json` | Add translations |

---

## Estimated Complexity: MEDIUM

- Backend: 4-6 hours
- Frontend: 3-4 hours
- Testing: 2-3 hours
- **Total: 9-13 hours**
