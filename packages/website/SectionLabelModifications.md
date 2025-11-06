# Section Label Redesign - Modification Details

## Overview
Replace the simple Badge components used for section labels with elegant decorative eyebrow labels featuring gradient lines and more contextual text.

## Design Specifications

### Visual Style
- **Typography**: Uppercase text with `tracking-widest` (letter-spacing)
- **Font Size**: `text-xs` (12px)
- **Color**: `text-gray-500`
- **Layout**: Inline-flex with horizontal gradient lines on both sides
- **Lines**: 1px height (`h-px`), 32px width (`w-8`), gradient from transparent to color

### Color Theme per Section
Each section has a unique color to create visual identity:
- **Features Section**: Blue (`to-blue-400`)
- **How It Works Section**: Green (`to-green-400`)
- **Pricing Section**: Amber/Gold (`to-amber-400`)
- **FAQ Section**: Purple (`to-purple-400`)

---

## Code Modifications

### 1. Features Section (Line ~160-165)

**REMOVE THIS:**
```tsx
<Badge className="mb-4 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300">
  Features
</Badge>
```

**REPLACE WITH:**
```tsx
<div className="inline-flex items-center gap-2 mb-4">
  <div className="h-px w-8 bg-gradient-to-r from-transparent to-blue-400"></div>
  <span className="text-xs tracking-widest text-gray-500 uppercase">What You Get</span>
  <div className="h-px w-8 bg-gradient-to-l from-transparent to-blue-400"></div>
</div>
```

**Location**: Inside `<section id="features">` → `<div className="text-center mb-16">`

---

### 2. How It Works Section (Line ~220-225)

**REMOVE THIS:**
```tsx
<Badge className="mb-4 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300">
  How It Works
</Badge>
```

**REPLACE WITH:**
```tsx
<div className="inline-flex items-center gap-2 mb-4">
  <div className="h-px w-8 bg-gradient-to-r from-transparent to-green-400"></div>
  <span className="text-xs tracking-widest text-gray-500 uppercase">Quick Setup</span>
  <div className="h-px w-8 bg-gradient-to-l from-transparent to-green-400"></div>
</div>
```

**Location**: Inside `<section id="how-it-works">` → `<div className="text-center mb-16">`

---

### 3. Pricing Section (Line ~260-262)

**REMOVE THIS:**
```tsx
<Badge className="mb-4 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300">
  Pricing
</Badge>
```

**REPLACE WITH:**
```tsx
<div className="inline-flex items-center gap-2 mb-4">
  <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-400"></div>
  <span className="text-xs tracking-widest text-gray-500 uppercase">Plans & Pricing</span>
  <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-400"></div>
</div>
```

**Location**: Inside `<section id="pricing">` → `<div className="text-center mb-12">`

---

### 4. FAQ Section (Line ~380-383)

**REMOVE THIS:**
```tsx
<Badge className="mb-4 bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300">
  FAQ
</Badge>
```

**REPLACE WITH:**
```tsx
<div className="inline-flex items-center gap-2 mb-4">
  <div className="h-px w-8 bg-gradient-to-r from-transparent to-purple-400"></div>
  <span className="text-xs tracking-widest text-gray-500 uppercase">Support</span>
  <div className="h-px w-8 bg-gradient-to-l from-transparent to-purple-400"></div>
</div>
```

**Location**: Inside `<section id="faq">` → `<div className="text-center mb-12">`

---

## Tailwind Classes Breakdown

### Wrapper Container
```tsx
className="inline-flex items-center gap-2 mb-4"
```
- `inline-flex`: Creates inline flexbox container
- `items-center`: Vertically centers all children
- `gap-2`: 8px spacing between elements
- `mb-4`: 16px bottom margin

### Gradient Lines (Left & Right)
```tsx
className="h-px w-8 bg-gradient-to-r from-transparent to-blue-400"
className="h-px w-8 bg-gradient-to-l from-transparent to-blue-400"
```
- `h-px`: 1px height (thin line)
- `w-8`: 32px width
- `bg-gradient-to-r`: Gradient flows left to right
- `bg-gradient-to-l`: Gradient flows right to left (mirror)
- `from-transparent`: Starts transparent
- `to-[color]-400`: Ends with color (blue/green/amber/purple)

### Text Label
```tsx
className="text-xs tracking-widest text-gray-500 uppercase"
```
- `text-xs`: 12px font size
- `tracking-widest`: Maximum letter spacing (0.1em)
- `text-gray-500`: Medium gray text color
- `uppercase`: Transforms text to uppercase

---

## Label Text Changes

| Section | Old Label | New Label | Rationale |
|---------|-----------|-----------|-----------|
| Features | "Features" | "What You Get" | More benefit-focused, user-centric |
| How It Works | "How It Works" | "Quick Setup" | Emphasizes speed and simplicity |
| Pricing | "Pricing" | "Plans & Pricing" | More comprehensive and descriptive |
| FAQ | "FAQ" | "Support" | More approachable, less technical |

---

## Visual Effect

### Before:
```
┌─────────────┐
│  Features   │  ← Simple gray badge
└─────────────┘
```

### After:
```
────────  WHAT YOU GET  ────────
 ↑ gradient lines with uppercase spaced text ↑
```

The gradient lines create a sophisticated "eyebrow" effect that:
1. Draws attention to the section header
2. Creates visual rhythm across the page
3. Provides color-coding for each section
4. Maintains Notion's minimal aesthetic

---

## Implementation Checklist

- [ ] Remove Badge import if no longer used elsewhere
- [ ] Replace Features section label (blue theme)
- [ ] Replace How It Works section label (green theme)
- [ ] Replace Pricing section label (amber theme)
- [ ] Replace FAQ section label (purple theme)
- [ ] Verify spacing and alignment
- [ ] Test responsive behavior on mobile
- [ ] Ensure text transforms to uppercase correctly

---

## Additional Notes

### Responsive Considerations
The design works well on all screen sizes:
- Lines scale proportionally
- Text remains readable at small sizes
- Inline-flex ensures proper centering
- No media queries needed

### Accessibility
- Text is semantic HTML (span element)
- Color is not the only indicator (text provides context)
- Sufficient color contrast (gray-500 on white background)
- Letter-spacing improves readability when uppercase

### Customization Options
To adjust the design, you can modify:
- **Line width**: Change `w-8` to `w-6`, `w-12`, etc.
- **Line color**: Change `to-blue-400` to any Tailwind color
- **Text spacing**: Change `tracking-widest` to `tracking-wide`, etc.
- **Gap size**: Change `gap-2` to `gap-3`, `gap-4`, etc.

---

## File Location
`/components/LandingPage.tsx`

## Lines to Modify
- Line ~163-165 (Features section)
- Line ~222-224 (How It Works section)
- Line ~260-262 (Pricing section)
- Line ~381-383 (FAQ section)
