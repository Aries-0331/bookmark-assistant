---
title: 实现国际化(i18n)支持
type: feat
status: active
date: 2026-03-05
---

## Enhancement Summary

**Deepened on:** 2026-03-05
**Research agents used:** best-practices-researcher, framework-docs-researcher, kieran-typescript-reviewer, julik-frontend-races-reviewer, Context7 Chrome Extensions

### Key Improvements

1. **TypeScript 类型安全** - 添加了完整的类型定义，避免使用 `any` 类型
2. **开发环境兼容** - 必须在 chrome mock 中添加 i18n 支持，否则开发环境会崩溃
3. **错误处理修正** - Chrome i18n 返回空字符串而非抛出错误，改用空字符串检查
4. **性能优化** - 不需要缓存翻译，Chrome 已优化 `getMessage()`
5. **测试基础设施** - 建议在测试 mock 中添加 i18n helper

### New Considerations Discovered

- `chrome.i18n.getMessage()` 对缺失 key 返回空字符串，不是错误
- 不需要 React hook，使用简单函数更高效
- 开发环境没有 chrome.i18n，必须有 mock
- Placeholder 使用 `$1`, `$2` 格式，最多 9 个

---

# 实现国际化(i18n)支持

## Overview

在 Bookmark Assistant Chrome 扩展中实现完整的国际化支持，包括创建开发分支和完成 Phase 1 的核心翻译功能。

## Problem Statement

Bookmark Assistant 目前仅有英文界面，需要支持多语言以服务全球用户。现有的 `docs/INTERNATIONALIZATION.md` 已完成架构设计，但实际翻译工作尚未开始。

## Proposed Solution

1. 创建新的功能分支 `feat/i18n-support`
2. 按照现有 i18n 规范完成 Phase 1 的核心实现
3. 创建英文 messages.json 基线
4. 实现 useTranslation hook
5. 迁移现有组件中的硬编码字符串

## Technical Approach

### Phase 1 任务清单（来自 docs/INTERNATIONALIZATION.md）

根据现有文档，Phase 1 需要完成：

- [x] Setup `_locales` directory structure (已完成)
- [ ] Create English `messages.json` (baseline)
- [ ] Implement `useTranslation` hook
- [ ] Migrate hardcoded strings in ConnectionSection
- [ ] Migrate hardcoded strings in SyncSettingsSection
- [ ] Migrate hardcoded strings in BillingSection

### 目录结构

```
packages/extension/
├── _locales/
│   ├── en/
│   │   └── messages.json
│   ├── zh_CN/
│   │   └── messages.json
│   └── ja/
│       └── messages.json
└── src/
    └── utils/
        └── i18n.ts  (useTranslation hook)
```

### 关键文件

| 文件 | 说明 |
|------|------|
| `packages/extension/_locales/en/messages.json` | 英文翻译基线 |
| `packages/extension/src/utils/i18n.ts` | useTranslation hook |
| `packages/extension/public/manifest.json` | 更新 default_locale |

## System-Wide Impact

### Interaction Graph

- `useTranslation` hook 被所有 UI 组件使用
- Chrome i18n API 通过 `chrome.runtime.sendRequest` 获取消息

### API Surface Parity

- 需要为所有硬编码字符串创建翻译 key
- 保持中英文 key 一致性

## Acceptance Criteria

### 分支管理

- [ ] 创建新分支 `feat/i18n-support`
- [ ] 分支基于 main/master

### 核心实现

- [ ] 创建 `packages/extension/src/utils/i18n.ts` (createTranslator 函数)
- [ ] 创建 `packages/extension/src/types/i18n.ts` (类型定义)
- [ ] 添加开发环境 chrome.i18n mock 到 `chrome-mock.ts` (Vite 兼容)
- [ ] 完善 `messages.json` 包含所有 UI 字符串 (100+ keys)
- [ ] 更新测试 helper 添加 i18n mock 支持

### 组件迁移

- [ ] ConnectionSection 使用翻译字符串
- [ ] SyncSettingsSection 使用翻译字符串
- [ ] BillingSection 使用翻译字符串
- [ ] OverviewSection 使用翻译字符串 (扩展范围)
- [ ] Sidebar 使用翻译字符串 (扩展范围)
- [ ] AboutSection 使用翻译字符串 (扩展范围)

### 测试

- [ ] 手动测试：切换浏览器语言，UI 正确显示
- [ ] 单元测试：useTranslation hook 测试
- [ ] 验证缺失 key 的 fallback 行为

## Dependencies & Risks

### 依赖

- Chrome i18n API (内置)
- 无需额外 npm 包

### 风险与解决方案

| 风险 | 解决方案 |
|------|----------|
| 开发环境无 chrome.i18n | 添加 Vite mock polyfill |
| 动态字符串变量替换 | 使用 chrome.i18n placeholders |
| 缺失 key 的 fallback | 返回原始 key 或英文 fallback |
| 组件覆盖不完整 | 扩展到 OverviewSection, Sidebar, AboutSection |

## Implementation Guide

### 1. 创建翻译工具函数 (推荐方案)

由于 `chrome.i18n` 在运行时不会改变，使用简单函数比 React hook 更高效:

```typescript
// packages/extension/src/utils/i18n.ts
import type { I18nSubstitution } from '../types/i18n';

/**
 * 创建翻译器实例
 * 使用方式: const { t, locale } = createTranslator();
 */
export function createTranslator() {
  const isAvailable = typeof chrome !== 'undefined' && !!chrome.i18n;

  const t = (key: string, substitutions?: I18nSubstitution): string => {
    if (!isAvailable) {
      // 开发环境返回 key 作为 fallback
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[i18n] Dev mode, returning key: ${key}`);
      }
      return key;
    }

    const message = chrome.i18n.getMessage(key, substitutions);
    // Chrome 对缺失的 key 返回空字符串，需要检查
    return message || key;
  };

  const locale = isAvailable ? chrome.i18n.getUILanguage() : 'en';

  return { t, locale, isAvailable };
}
```

**类型定义 (packages/extension/src/types/i18n.ts):**
```typescript
export type I18nSubstitution = string | string[];

export interface Translator {
  (key: string, substitutions?: I18nSubstitution): string;
}

export interface TranslationContext {
  t: Translator;
  locale: string;
  isAvailable: boolean;
}

export interface MessageCatalog {
  [key: string]: {
    message: string;
    description?: string;
    placeholders?: Record<string, {
      content: string;
      example?: string;
    }>;
  };
}
```

### 2. 开发环境 Mock

**重要: 必须添加到现有的 chrome mock 文件中:**

```typescript
// packages/extension/src/dev/chrome-mock.ts 或 tests/helpers/chrome-mock.ts
export function setupChromeI18nMock() {
  return {
    i18n: {
      getMessage: (key: string, substitutions?: string | string[]) => {
        // 返回 key 作为 fallback - 模拟缺失的翻译
        return key;
      },
      getAcceptLanguages: async () => ['en'],
      getUILanguage: () => 'en',
    },
  };
}
```

### 3. 错误处理策略

**关键点:** `chrome.i18n.getMessage()` 不会抛出错误，而是对缺失的 key 返回空字符串。

```typescript
// 正确的错误处理方式
const t = (key: string, substitutions?: I18nSubstitution): string => {
  if (typeof chrome === 'undefined' || !chrome.i18n) {
    console.warn(`i18n not available, returning key: ${key}`);
    return key;
  }

  const message = chrome.i18n.getMessage(key, substitutions);
  return message || key;  // 检查空字符串而不是 try/catch
};
```

### 4. Placeholder 使用方式

Chrome i18n 支持最多 9 个占位符:

```json
// _locales/en/messages.json
{
  "welcome_message": {
    "message": "Welcome, $1!",
    "description": "Greeting with user name"
  },
  "bookmark_count": {
    "message": "You have $1 bookmark(s)",
    "description": "Count with plural handling"
  }
}
```

```typescript
// 使用方式
t('welcome_message', ['John']);  // "Welcome, John!"
t('bookmark_count', [5]);        // "You have 5 bookmark(s)"
```

### 5. 翻译 Key 命名规范

使用下划线分隔的描述性命名:

```json
{
  "nav_connection": "Connection",
  "action_sync_now": "Sync Now",
  "status_connected": "Connected",
  "error_connection_failed": "Connection failed"
}
```

### 4. 需要迁移的字符串数量

| 组件 | 预计翻译 key 数量 |
|------|------------------|
| ConnectionSection | ~30 |
| SyncSettingsSection | ~15 |
| BillingSection | ~40 |
| OverviewSection | ~10 |
| Sidebar | ~5 |
| AboutSection | ~10 |
| **总计** | **~110** |

## Sources & References

- **i18n 规范文档:** [docs/INTERNATIONALIZATION.md](../INTERNATIONALIZATION.md)
- **现有 hook 设计:** docs/INTERNATIONALIZATION.md:69-91
- **Translation Keys 结构:** docs/INTERNATIONALIZATION.md:118-147
- **Chrome i18n API:** https://developer.chrome.com/docs/extensions/reference/api/i18n
- **React i18next:** https://www.i18next.com/
- **Chrome Extensions Docs:** https://developer.chrome.com/docs/extensions/develop/ui/i18n
