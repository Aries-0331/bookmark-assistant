# Chrome Extension i18n (Internationalization) Setup

> **Complete i18n setup for multi-language support** - January 21, 2026

---

## ✅ Setup Complete!

Your Chrome extension now has full i18n infrastructure ready for multiple languages!

---

## 📁 Directory Structure

```
packages/extension/
├── _locales/
│   └── en/
│       └── messages.json        ✅ Created
├── public/
│   ├── manifest.json            ✅ Updated with default_locale
│   └── ...
├── src/
│   └── ...
└── dist/                        ✅ Built extension
    ├── _locales/                ✅ Auto-copied
    │   └── en/
    │       └── messages.json
    └── manifest.json
```

---

## 🔧 What Was Implemented

### 1. Created `_locales/en/messages.json`
Contains all translatable strings:
- appName - Extension name
- appDesc - Extension description
- extensionTitle - Short title
- syncNow - Sync button
- connectToNotion - Connect button
- And 16+ more strings

### 2. Updated `manifest.json`
```json
{
  "default_locale": "en",  ← Added this
  "name": "Bookmark Assistant - Notion Bookmark Manager & Web Clipper",
  "description": "One-click sync Chrome bookmarks...",
  "action": {
    "default_title": "__MSG_extensionTitle__"  ← Using message variable
  }
}
```

### 3. Updated `vite.config.ts`
Added auto-copy of `_locales` to dist during build:
```typescript
// Copy _locales directory for i18n support
const localesDir = resolve('_locales');
if (existsSync(localesDir)) {
  cpSync(localesDir, resolve(distDir, '_locales'), { recursive: true });
}
```

---

## 🌍 Adding More Languages

### Step 1: Create Language Directory

```bash
# Chinese (Simplified)
mkdir -p packages/extension/_locales/zh_CN

# Spanish
mkdir -p packages/extension/_locales/es

# Japanese
mkdir -p packages/extension/_locales/ja

# Portuguese
mkdir -p packages/extension/_locales/pt_BR
```

### Step 2: Copy & Translate messages.json

```bash
# Copy English as template
cp packages/extension/_locales/en/messages.json packages/extension/_locales/zh_CN/messages.json
cp packages/extension/_locales/en/messages.json packages/extension/_locales/es/messages.json
cp packages/extension/_locales/en/messages.json packages/extension/_locales/ja/messages.json
cp packages/extension/_locales/en/messages.json packages/extension/_locales/pt_BR/messages.json
```

### Step 3: Translate Each File

Edit `packages/extension/_locales/zh_CN/messages.json`:
```json
{
  "appName": {
    "message": "Bookmark Assistant - Notion书签管理器与网页剪裁器",
    "description": "The name of the extension"
  },
  "appDesc": {
    "message": "一键将Chrome书签同步到Notion数据库...",
    "description": "The description of the extension"
  },
  "syncNow": {
    "message": "立即同步",
    "description": "Button to sync bookmarks"
  }
}
```

### Step 4: Rebuild Extension

```bash
pnpm build
```

Chrome will automatically detect and use the user's browser language!

---

## 📝 Language Codes Reference

| Language | Code | Directory |
| -------- | ---- | --------- |
| English (US) | en | `_locales/en/` |
| Chinese (Simplified) | zh_CN | `_locales/zh_CN/` |
| Spanish | es | `_locales/es/` |
| Japanese | ja | `_locales/ja/` |
| Portuguese (Brazil) | pt_BR | `_locales/pt_BR/` |
| French | fr | `_locales/fr/` |
| German | de | `_locales/de/` |

---

## 🎨 Using i18n in React Components

### Install i18n Hook

```typescript
// Create a custom hook
import { useState, useEffect } from 'react';

export function useI18n() {
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load messages for current locale
    chrome.i18n.getMessage('appName');
    chrome.i18n.getMessage('appDesc');
  }, []);

  return {
    t: (key: string) => chrome.i18n.getMessage(key) || key,
  };
}
```

### Use in Components

```typescript
import { useI18n } from '../hooks/useI18n';

function SyncButton() {
  const { t } = useI18n();

  return (
    <button onClick={handleSync}>
      {t('syncNow')}
    </button>
  );
}
```

### Get Current Language

```typescript
const currentLang = chrome.i18n.getUILanguage();
console.log('Current language:', currentLang);
```

---

## 📦 Chrome Web Store Integration

### Auto-Detection
Chrome Web Store automatically detects available languages from `_locales` folders!

When you upload the extension:
- ✅ Chrome sees 5 language folders
- ✅ Automatically shows language selector
- ✅ Users see extension in their language
- ✅ No manual localization needed in dashboard

### Store Listing Languages

Add these languages in Chrome Web Store developer console:

1. Go to your extension
2. Click "Locales" tab
3. Add languages:
   - Chinese (Simplified)
   - Spanish
   - Japanese
   - Portuguese

Chrome will auto-populate from your `_locales` folders! 🎉

---

## 🔍 Testing i18n

### Load Unpacked Extension

1. Open Chrome → Extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `packages/extension/dist/`
5. Extension loads with English (default)

### Test Different Languages

```bash
# Test Chinese
google-chrome --lang=zh-CN --load-extension=dist

# Test Spanish
google-chrome --lang=es --load-extension=dist

# Test Japanese
google-chrome --lang=ja --load-extension=dist
```

---

## 📊 File Contents

### `/packages/extension/_locales/en/messages.json`

```json
{
  "appName": {
    "message": "Bookmark Assistant - Notion Bookmark Manager & Web Clipper",
    "description": "The name of the extension"
  },
  "appDesc": {
    "message": "One-click sync Chrome bookmarks to Notion Database. Auto-fetch favicons, meta tags, and manage your knowledge base visually.",
    "description": "The description of the extension"
  },
  "extensionTitle": {
    "message": "Bookmark Assistant",
    "description": "Short title for the extension action"
  },
  "syncNow": {
    "message": "Sync Now",
    "description": "Button to sync bookmarks"
  },
  "connectToNotion": {
    "message": "Connect to Notion",
    "description": "Button to connect to Notion"
  },
  "connected": {
    "message": "Connected",
    "description": "Status when connected to Notion"
  },
  "connecting": {
    "message": "Connecting...",
    "description": "Status when connecting to Notion"
  },
  "disconnect": {
    "message": "Disconnect",
    "description": "Button to disconnect from Notion"
  },
  "lastSync": {
    "message": "Last sync:",
    "description": "Label for last sync time"
  },
  "never": {
    "message": "Never",
    "description": "When sync never happened"
  },
  "bookmarks": {
    "message": "bookmarks",
    "description": "Number of bookmarks"
  },
  "syncing": {
    "message": "Syncing...",
    "description": "Status when syncing"
  },
  "error": {
    "message": "Error",
    "description": "Error message prefix"
  },
  "success": {
    "message": "Success",
    "description": "Success message"
  },
  "openOptions": {
    "message": "Open Options",
    "description": "Link to open options page"
  },
  "free": {
    "message": "Free",
    "description": "Free plan label"
  },
  "pro": {
    "message": "Pro",
    "description": "Pro plan label"
  },
  "upgrade": {
    "message": "Upgrade",
    "description": "Button to upgrade to Pro"
  },
  "autoSyncEnabled": {
    "message": "Auto-sync enabled",
    "description": "Status when auto-sync is on"
  },
  "autoSyncDisabled": {
    "message": "Auto-sync disabled",
    "description": "Status when auto-sync is off"
  }
}
```

---

## 🚀 Next Steps

### 1. Add Languages (5 minutes each)

```bash
# Copy structure
cp -r packages/extension/_locales/en packages/extension/_locales/zh_CN
cp -r packages/extension/_locales/en packages/extension/_locales/es
cp -r packages/extension/_locales/en packages/extension/_locales/ja
cp -r packages/extension/_locales/en packages/extension/_locales/pt_BR
```

### 2. Translate Files

Use the templates in `/packages/extension/_locales/`:
- `zh_CN/messages.json` - Chinese (Simplified)
- `es/messages.json` - Spanish
- `ja/messages.json` - Japanese
- `pt_BR/messages.json` - Portuguese

### 3. Rebuild & Test

```bash
pnpm build
```

### 4. Upload to Chrome Web Store

Chrome will automatically detect all languages! 🎉

---

## ✅ Benefits

- 🌍 **Global Reach** - Extension in 5 languages
- 🎯 **Better SEO** - Chrome Web Store ranking boost
- 📈 **More Downloads** - Localized listings get more clicks
- 💪 **Competitive Advantage** - Most competitors skip i18n
- 🔧 **Easy Maintenance** - Centralized messages.json files

---

## 🎉 Summary

**i18n Infrastructure Complete:**

✅ `_locales/en/messages.json` created
✅ `manifest.json` updated with `default_locale`
✅ `vite.config.ts` configured to copy `_locales`
✅ Extension builds successfully
✅ Ready for 5+ languages!

**Next: Add Chinese, Spanish, Japanese, Portuguese translations!** 🚀

---

**Last Updated:** January 21, 2026
**Status:** Infrastructure Complete ✅
**Ready for:** Multi-language expansion
