# Shared Package

> Shared utilities, design tokens, and common configurations

This package contains shared resources used across all packages in the monorepo.

## 📦 Contents

### Design Tokens

- **`tokens.js`** - Shared design system tokens (colors, spacing, typography)
- **`tailwind-preset.js`** - Tailwind CSS preset configuration
- **`brand.json`** - Brand configuration and metadata

## 🎨 Design System

### Color Palette

The shared package provides a unified color palette used across the extension, website, and server:

```javascript
// Example usage from tokens.js
export const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    // ... full palette
    900: '#0c4a6e',
  },
  // ... more colors
};
```

### Typography

Shared typography scale for consistent text styling:

```javascript
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['Fira Code', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    // ... full scale
  },
};
```

## 🔧 Usage

### In Extension

```typescript
import { colors } from '@bookmark-assistant/shared/tokens';
```

### In Website

```typescript
import { typography } from '@bookmark-assistant/shared/tokens';
```

### In Server

```typescript
import { brand } from '@bookmark-assistant/shared/brand.json';
```

## 📋 Available Tokens

| Token Type | File | Purpose |
| ---------- | ---- | ------- |
| Colors | `tokens.js` | Color palette for UI |
| Spacing | `tokens.js` | Spacing scale |
| Typography | `tokens.js` | Font families and sizes |
| Shadows | `tokens.js` | Shadow definitions |
| Border Radius | `tokens.js` | Border radius scale |
| Brand | `brand.json` | Brand metadata |

## 🎯 Best Practices

1. **Use shared tokens** for all styling decisions
2. **Don't duplicate** colors, spacing, or typography
3. **Update in one place** - Change shared tokens, not individual packages
4. **Document new tokens** when adding to the design system

## 📦 Dependencies

- None (pure configuration)

## 🔄 Version

This package version should match the main project version.

---

**Last Updated:** January 21, 2026
**Package:** @bookmark-assistant/shared
