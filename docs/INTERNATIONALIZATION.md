# Internationalization (i18n) Specification

## Overview

This document outlines the internationalization strategy for Bookmark Assistant, enabling support for multiple languages and locales to reach a global audience.

## Target Languages (Q1 2025)

1. **English (en)** - Primary language, default
2. **简体中文 (zh-CN)** - Chinese Simplified
3. **日本語 (ja)** - Japanese

## Technical Architecture

### Chrome Extension i18n

Chrome extensions have built-in i18n support via the `chrome.i18n` API.

#### Directory Structure

```
packages/extension/
├── _locales/
│   ├── en/
│   │   └── messages.json
│   ├── zh_CN/
│   │   └── messages.json
│   └── ja/
│       └── messages.json
└── public/
    └── manifest.json
```

#### Manifest Configuration

```json
{
  "default_locale": "en",
  "name": "__MSG_extension_name__",
  "description": "__MSG_extension_description__"
}
```

#### Message Format

```json
{
  "extension_name": {
    "message": "Bookmark Assistant",
    "description": "Name of the extension"
  },
  "extension_description": {
    "message": "AI-powered bookmark management with Notion sync",
    "description": "Extension description shown in Chrome Web Store"
  },
  "action_sync_now": {
    "message": "Sync Now",
    "description": "Button text for manual sync"
  }
}
```

### React Component i18n

For React components, we'll create a lightweight hook-based system that wraps `chrome.i18n.getMessage()`.

#### Implementation

```typescript
// packages/extension/src/utils/i18n.ts
export function useTranslation() {
  const t = (key: string, substitutions?: string | string[]) => {
    return chrome.i18n.getMessage(key, substitutions);
  };

  const locale = chrome.i18n.getUILanguage();

  return { t, locale };
}

// Usage in components
import { useTranslation } from '@/utils/i18n';

export function ConnectionSection() {
  const { t } = useTranslation();

  return (
    <Button text={t('action_sync_now')} />
  );
}
```

### Backend i18n (Server & Website)

For the Node.js server and Next.js website, we'll use `i18next`:

```bash
pnpm add i18next react-i18next next-i18next
```

#### Server Configuration

```typescript
// packages/server/src/config/i18n.ts
import i18next from 'i18next';

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: require('./locales/en.json') },
    zh: { translation: require('./locales/zh-CN.json') },
    ja: { translation: require('./locales/ja.json') },
  },
});
```

## Translation Keys Structure

### Extension Categories

```
# Navigation & UI
nav_connection = "Connection"
nav_sync_settings = "Sync Settings"
nav_billing = "Billing"

# Actions
action_connect = "Connect to Notion"
action_disconnect = "Disconnect"
action_sync_now = "Sync Now"
action_cancel = "Cancel"
action_save = "Save"

# Status Messages
status_connected = "Connected"
status_syncing = "Syncing..."
status_sync_complete = "Sync complete"

# Errors
error_connection_failed = "Connection failed"
error_sync_failed = "Sync failed"

# Confirmations
confirm_disconnect_title = "Disconnect from Notion?"
confirm_disconnect_message = "This will remove your Notion workspace connection and clear all local settings."
```

## Language Detection

### Extension

```typescript
// Auto-detect browser language
const browserLang = chrome.i18n.getUILanguage(); // e.g., "zh-CN", "en"
```

### Website

```typescript
// Next.js middleware for language detection
import { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const locale = request.headers.get('accept-language')?.split(',')[0] || 'en';
  // Redirect to appropriate locale path
}
```

## Fallback Strategy

1. **User preference** (if saved in settings)
2. **Browser language** (`chrome.i18n.getUILanguage()`)
3. **Default language** (English)

## Implementation Phases

### Phase 1: Core Extension (Week 1-2)

- [x] Setup `_locales` directory structure
- [ ] Create English `messages.json` (baseline)
- [ ] Implement `useTranslation` hook
- [ ] Migrate hardcoded strings in ConnectionSection
- [ ] Migrate hardcoded strings in SyncSettingsSection
- [ ] Migrate hardcoded strings in BillingSection

### Phase 2: Professional Translation (Week 3)

- [ ] Translate to 简体中文
- [ ] Translate to 日本語
- [ ] Review by native speakers
- [ ] Context testing (UI fit, cultural appropriateness)

### Phase 3: Website & Marketing (Week 4)

- [ ] Setup `next-i18next` for landing page
- [ ] Translate marketing content
- [ ] Translate pricing page
- [ ] Translate help documentation

### Phase 4: Backend & Email (Week 5)

- [ ] Implement server-side i18n
- [ ] Translate email templates (payment confirmations, etc.)
- [ ] Translate API error messages

## Translation Workflow

### Tools

- **Chrome Extension**: `_locales/` JSON files (native Chrome i18n)
- **Website**: `next-i18next` with JSON files
- **Management**: Lokalise or Crowdin for collaboration (future)

### Quality Assurance

1. **Context Screenshots**: Provide screenshots for each translation key
2. **Character Length Testing**: Ensure UI doesn't break with longer translations
3. **RTL Consideration**: Plan for Arabic/Hebrew support (future)
4. **Pluralization**: Handle plural forms correctly
   ```json
   {
     "bookmark_count": {
       "message": "$COUNT$ bookmark(s)",
       "placeholders": {
         "count": { "content": "$1" }
       }
     }
   }
   ```

## Testing Strategy

### Automated Tests

```typescript
describe('i18n', () => {
  it('should load correct locale', () => {
    const { t } = useTranslation();
    expect(t('action_sync_now')).toBe('Sync Now');
  });

  it('should fallback to English for missing keys', () => {
    const { t } = useTranslation();
    expect(t('nonexistent_key')).toBe('nonexistent_key');
  });
});
```

### Manual Testing Checklist

- [ ] Switch browser language to Chinese → UI updates
- [ ] Switch browser language to Japanese → UI updates
- [ ] Test all buttons and labels render correctly
- [ ] Test error messages display in correct language
- [ ] Test email templates in all languages
- [ ] Test Chrome Web Store listings in all languages

## Locale-Specific Considerations

### Chinese (zh-CN)

- **Font**: Ensure proper CJK font rendering
- **Date Format**: YYYY年MM月DD日
- **Currency**: ¥29.99 (RMB) or $29.99 USD
- **Content Length**: Chinese text is typically 30-40% shorter than English

### Japanese (ja)

- **Politeness Levels**: Use appropriate keigo (敬語) for UI text
- **Date Format**: YYYY年MM月DD日
- **Currency**: ¥2,990 (JPY) or $29.99 USD
- **Content Length**: Similar to Chinese, ~30-40% shorter

### English (en)

- **Tone**: Professional but friendly
- **Date Format**: MM/DD/YYYY (US) or DD/MM/YYYY (UK)
- **Currency**: $29.99 USD

## Chrome Web Store Listings

Each language requires separate store listing content:

### English

```
Name: Bookmark Assistant
Tagline: AI-powered bookmark management with Notion sync
Description: Transform how you organize bookmarks...
```

### 简体中文

```
Name: 书签助手
Tagline: AI 驱动的书签管理与 Notion 同步
Description: 改变您整理书签的方式...
```

### 日本語

```
Name: ブックマークアシスタント
Tagline: AI搭載のブックマーク管理とNotion同期
Description: ブックマークの整理方法を変革...
```

## Maintenance

### Adding New Keys

1. Add key to `en/messages.json`
2. Update `zh_CN/messages.json` with translation
3. Update `ja/messages.json` with translation
4. Update type definitions if using TypeScript
5. Test in all supported locales

### Translation Updates

- **Version Control**: Track translations in git
- **Change Log**: Document translation changes in commit messages
- **Review Process**: Native speaker review for quality

## Performance Considerations

- **Bundle Size**: Chrome's native i18n doesn't increase bundle size
- **Load Time**: Messages are loaded synchronously at extension startup
- **Caching**: Chrome caches locale messages; no additional optimization needed

## Future Expansion (Q2 2025+)

- [ ] Korean (ko)
- [ ] German (de)
- [ ] French (fr)
- [ ] Spanish (es)
- [ ] Portuguese (pt-BR)
- [ ] Russian (ru)
- [ ] RTL languages (Arabic, Hebrew)

## Resources

- [Chrome Extension i18n Guide](https://developer.chrome.com/docs/extensions/reference/i18n/)
- [next-i18next Documentation](https://github.com/i18next/next-i18next)
- [Unicode CLDR](https://cldr.unicode.org/) - Locale data standards
- [Translation Best Practices](https://www.w3.org/International/questions/qa-i18n)
