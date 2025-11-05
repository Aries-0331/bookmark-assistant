# Notion Bookmark Sync - Landing Page Design Specification

## Table of Contents
1. [Layout Overview](#layout-overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Component Specifications](#component-specifications)
6. [Responsive Breakpoints](#responsive-breakpoints)
7. [Animations](#animations)

---

## Layout Overview

### Page Structure (Top to Bottom)
1. **Fixed Navigation Bar** (h: 72px)
2. **Hero Section** (pt: 128px, pb: 80px)
3. **Features Section** (py: 80px, bg: gray-50)
4. **How It Works Section** (py: 80px, bg: white)
5. **Pricing Section** (py: 80px, bg: gray-50)
6. **FAQ Section** (py: 80px, bg: white)
7. **Final CTA Section** (py: 80px, bg: gradient dark)
8. **Footer** (py: 48px, bg: gray-50)

### Container
- Max-width: 1280px (max-w-7xl)
- Horizontal padding: 24px (px-6)
- Centered with `mx-auto`

---

## Color Palette

### Primary Colors
```css
/* Backgrounds */
--white: #ffffff
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-900: #111827
--gray-800: #1f2937

/* Text Colors */
--text-primary: #111827 (gray-900)
--text-secondary: #4b5563 (gray-600)
--text-tertiary: #6b7280 (gray-500)
--text-on-dark: #ffffff

/* Borders */
--border-light: #e5e7eb (gray-200)
--border-medium: #d1d5db (gray-300)
```

### Accent Colors
```css
/* Blue (Primary CTA) */
--blue-50: #eff6ff
--blue-200: #bfdbfe
--blue-500: #3b82f6
--blue-600: #2563eb
--blue-700: #1d4ed8

/* Amber (Pro Plan) */
--amber-50: #fffbeb
--amber-100: #fef3c7
--amber-500: #f59e0b
--amber-600: #d97706
--amber-700: #b45309

/* Green (Success) */
--green-50: #f0fdf4
--green-100: #dcfce7
--green-600: #16a34a

/* Purple, Cyan, Indigo (Feature Icons) */
--purple-50: #faf5ff
--purple-600: #9333ea
--cyan-50: #ecfeff
--cyan-600: #0891b2
--indigo-50: #eef2ff
--indigo-600: #4f46e5
--violet-50: #f5f3ff
--emerald-50: #ecfdf5
--orange-50: #fff7ed
--pink-50: #fdf2f8
```

---

## Typography

### Font Family
- Primary: System font stack (inherits from globals.css)
- Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

### Font Sizes & Weights
```css
/* Headings */
h1:
  - Desktop: 60px (text-6xl), line-height: 1.1, font-weight: 500
  - Mobile: 48px (text-5xl)

h2:
  - Size: 36px (text-4xl), line-height: 1.2, font-weight: 500

h3:
  - Size: 20px (text-xl), line-height: 1.5, font-weight: 500

h4:
  - Size: 18px (text-lg), line-height: 1.5, font-weight: 500

/* Body Text */
p (large): 20px (text-xl), line-height: 1.5, font-weight: 400
p (base): 16px (text-base), line-height: 1.5, font-weight: 400
p (small): 14px (text-sm), line-height: 1.5, font-weight: 400

/* Buttons */
button: 16px (text-base), line-height: 1.5, font-weight: 500
```

### Special Typography
```css
/* Gradient Text (Hero) */
background: linear-gradient(to right, #2563eb, #4f46e5)
-webkit-background-clip: text
-webkit-text-fill-color: transparent
```

---

## Spacing System

### Padding Scale
```
px-2: 8px
px-3: 12px
px-4: 16px
px-6: 24px
px-8: 32px

py-1: 4px
py-2: 8px
py-4: 16px
py-6: 24px
py-8: 32px
py-12: 48px
py-20: 80px
```

### Gap Scale
```
gap-1: 4px
gap-2: 8px
gap-3: 12px
gap-4: 16px
gap-6: 24px
gap-8: 32px
gap-12: 48px
```

### Border Radius
```
rounded-lg: 8px
rounded-xl: 12px
rounded-2xl: 16px
rounded-full: 9999px
```

---

## Component Specifications

### 1. Navigation Bar

**Dimensions:**
- Height: 72px (py-4 with padding)
- Position: fixed, top-0, full-width, z-index: 50
- Background: white/80% opacity with backdrop-blur
- Border-bottom: 1px solid gray-200

**Layout:**
```
[Logo + Text] --------- [Nav Links] --------- [CTA Button]
  (flex left)            (flex center)         (flex right)
```

**Logo:**
- NotionBookmarkLogoBlue component: 40px × 40px (w-10 h-10)
- Text: "Notion Bookmark Sync", text-base, gray-900

**Nav Links (Desktop only, hidden on mobile):**
- Links: Features, How It Works, Pricing, FAQ
- Gap: 32px (gap-8)
- Color: gray-600, hover: gray-900
- Transition: color 150ms

**CTA Button:**
- Padding: 12px 24px (px-6)
- Background: gray-900, hover: gray-800
- Text: white, text-base, font-weight: 500
- Border-radius: 8px (rounded-lg)
- Icon: Chrome (16px × 16px, mr-2)

---

### 2. Hero Section

**Dimensions:**
- Padding-top: 128px (pt-32, accounts for fixed nav)
- Padding-bottom: 80px (pb-20)
- Background: white

**Layout Grid:**
- 2 columns on large screens (lg:grid-cols-2)
- 1 column on mobile
- Gap: 48px (gap-12)
- Align: items-center

**Left Column (Content):**

1. **Badge:**
   - Background: blue-50
   - Text: blue-700
   - Border: blue-200, 1px
   - Padding: 4px 12px
   - Border-radius: full
   - Icon: Sparkles (12px × 12px)
   - Margin-bottom: 16px

2. **H1 Heading:**
   - Size: 60px on desktop (text-6xl), 48px on mobile (text-5xl)
   - Color: gray-900
   - Line-height: tight (1.1)
   - Margin-bottom: 24px
   - Gradient word "Notion": blue-600 → indigo-600

3. **Subtitle (p):**
   - Size: 20px (text-xl)
   - Color: gray-600
   - Line-height: relaxed (1.5)
   - Margin-bottom: 32px

4. **Button Group:**
   - Layout: flex column on mobile, flex row on desktop (sm:flex-row)
   - Gap: 16px (gap-4)

   **Primary Button:**
   - Background: gray-900, hover: gray-800
   - Padding: 24px 32px (px-8 py-6)
   - Text: white, text-base
   - Border-radius: 8px
   - Icons: Chrome (20px left) + ArrowRight (16px right)

   **Secondary Button:**
   - Background: white, hover: gray-50
   - Border: 1px gray-300
   - Padding: 24px 32px
   - Text: gray-900
   - Border-radius: 8px

5. **Trust Indicators:**
   - Layout: flex row, gap: 24px (gap-6)
   - Font-size: 14px (text-sm)
   - Color: gray-600
   - Icon: CheckCircle2 (16px × 16px, green-600)
   - Margin-top: 32px

**Right Column (Image + Card):**

1. **Main Image Container:**
   - Border-radius: 16px (rounded-2xl)
   - Shadow: 2xl
   - Border: 1px gray-200
   - Overflow: hidden
   - Position: relative
   - Overlay gradient: from gray-900/20 to transparent (top to bottom)

2. **Floating Stats Card:**
   - Position: absolute, bottom: -24px, left: -24px
   - Background: white
   - Padding: 16px
   - Border-radius: 12px (rounded-xl)
   - Shadow: xl
   - Border: 1px gray-200

   **Card Content:**
   - Layout: flex row, gap: 12px (gap-3)
   - Icon container: 40px × 40px, green-100 bg, rounded-lg
   - Icon: RefreshCw (20px, green-600)
   - Text top: "Synced today" (text-sm, gray-600)
   - Text bottom: "1,247 bookmarks" (text-base, gray-900)

---

### 3. Features Section

**Dimensions:**
- Padding: 80px 0 (py-20)
- Background: gray-50

**Header:**
1. **Badge:**
   - Background: gray-100
   - Text: gray-700
   - Border: gray-300
   - Padding: 4px 12px
   - Margin-bottom: 16px
   - Centered (text-center)

2. **H2:**
   - Text: "Everything you need to organize"
   - Size: 36px (text-4xl)
   - Color: gray-900
   - Margin-bottom: 16px
   - Centered

3. **Subtitle:**
   - Size: 20px (text-xl)
   - Color: gray-600
   - Max-width: 672px (max-w-2xl)
   - Centered with mx-auto
   - Margin-bottom: 64px

**Feature Grid:**
- Grid: 3 columns on large (lg:grid-cols-3), 2 on medium (md:grid-cols-2), 1 on mobile
- Gap: 24px (gap-6)

**Feature Card Specifications:**
- Background: white
- Border: 1px gray-200
- Border-radius: 12px (rounded-xl)
- Padding: 24px (p-6)
- Height: full (h-full)
- Hover: shadow-lg transition

**Card Structure:**
1. **Icon Container:**
   - Size: 48px × 48px (w-12 h-12)
   - Border-radius: 8px (rounded-lg)
   - Background: gradient (varies by feature)
   - Margin-bottom: 16px

   **Icon Colors by Feature:**
   - One-Click Sync: from-blue-50 to-indigo-50, icon: blue-600
   - Rich Metadata: from-purple-50 to-pink-50, icon: purple-600
   - Auto Sync: from-green-50 to-emerald-50, icon: green-600
   - Secure OAuth: from-amber-50 to-orange-50, icon: amber-600
   - OSS Mode: from-cyan-50 to-blue-50, icon: cyan-600
   - Folder Sync: from-indigo-50 to-violet-50, icon: indigo-600

2. **Title (h3):**
   - Size: 20px (text-xl)
   - Color: gray-900
   - Margin-bottom: 8px

3. **Description (p):**
   - Size: 16px (text-base)
   - Color: gray-600
   - Line-height: 1.5

---

### 4. How It Works Section

**Dimensions:**
- Padding: 80px 0 (py-20)
- Background: white

**Header:** (Same structure as Features section)
- Badge: "How It Works"
- H2: "Get started in 3 simple steps"
- Subtitle: "Setting up takes less than 2 minutes..."

**Step Grid:**
- Grid: 3 columns on medium+ (md:grid-cols-3), 1 on mobile
- Gap: 32px (gap-8)

**Step Card Specifications:**
- Background: white
- Border: 2px gray-200 (border-2)
- Border-radius: 12px (rounded-xl)
- Padding: 32px (p-8)
- Height: full
- Hover: border-gray-300
- Position: relative

**Card Structure:**
1. **Number Badge:**
   - Position: absolute, top: -16px, left: -16px
   - Size: 40px × 40px (w-10 h-10)
   - Background: gray-900
   - Color: white
   - Border-radius: full
   - Text: step number (1, 2, 3)
   - Shadow: lg
   - Font-size: 16px, font-weight: 500
   - Centered (flex items-center justify-center)

2. **Icon:**
   - Size: 32px × 32px (h-8 w-8)
   - Colors: Chrome (blue-600), Lock (green-600), RefreshCw (purple-600)
   - Margin-bottom: 16px

3. **Title (h3):**
   - Size: 20px (text-xl)
   - Color: gray-900
   - Margin-bottom: 8px

4. **Description (p):**
   - Size: 16px (text-base)
   - Color: gray-600

---

### 5. Pricing Section

**Dimensions:**
- Padding: 80px 0 (py-20)
- Background: gray-50

**Header:** (Same structure as previous sections)
- Badge: "Pricing"
- H2: "Simple, transparent pricing"
- Subtitle: "Start free, upgrade when you need more power."

**Billing Toggle:**
- Container:
  - Background: white
  - Border: 1px gray-200
  - Border-radius: 8px (rounded-lg)
  - Padding: 4px (p-1)
  - Display: inline-flex
  - Gap: 12px (gap-3)
  - Margin-bottom: 48px

- Buttons:
  - Padding: 8px 16px (px-4 py-2)
  - Border-radius: 6px (rounded-md)
  - Font-size: 16px (text-base)
  - Transition: all 150ms

  **Active State:**
  - Background: gray-900
  - Color: white

  **Inactive State:**
  - Background: transparent
  - Color: gray-600
  - Hover: gray-900

- Yearly Button Badge:
  - Background: green-100
  - Text: green-700
  - Text: "Save 20%"
  - Padding: 2px 8px
  - Font-size: 12px (text-xs)
  - Border: none

**Pricing Grid:**
- Grid: 2 columns on medium+ (md:grid-cols-2), 1 on mobile
- Gap: 32px (gap-8)
- Max-width: 1024px (max-w-5xl)
- Centered (mx-auto)

**Free Plan Card:**
- Background: white
- Border: 2px gray-200 (border-2)
- Border-radius: 16px (rounded-2xl)
- Padding: 32px (p-8)

**Pro Plan Card:**
- Background: white
- Border: 2px blue-500 (border-2 border-blue-500)
- Border-radius: 16px (rounded-2xl)
- Padding: 32px (p-8)
- Position: relative
- "Most Popular" badge: absolute top-4 right-4

**Card Structure:**

1. **Icon + Title Section:**
   - Layout: flex row, gap: 8px (gap-2)
   - Margin-bottom: 16px

   **Icon Container:**
   - Free: 40px × 40px, gray-100 bg, gray-200 border, rounded-lg
   - Pro: 40px × 40px, gradient amber-500 to amber-600, rounded-lg

   **Icon:**
   - Free: Sparkles (20px, gray-500)
   - Pro: Crown (20px, white)

   **Text:**
   - Title: "Free" or "Pro" (h3, gray-900)
   - Subtitle: "For individuals" or "For power users" (text-sm, gray-600)

2. **Pricing:**
   - Price: text-5xl, gray-900
   - Unit: "/month" (text-base, gray-600)
   - Margin-bottom: 24px

   **Yearly Note (Pro only):**
   - Text: "Billed $86.40 yearly"
   - Font-size: 14px (text-sm)
   - Color: gray-600
   - Margin-top: 4px

3. **CTA Button:**
   - Width: full (w-full)
   - Padding: 24px 16px (py-6 px-4)
   - Border-radius: 8px (rounded-lg)
   - Font-size: 16px (text-base)
   - Margin-bottom: 24px

   **Free Button:**
   - Background: gray-900
   - Hover: gray-800
   - Text: white
   - Text: "Get Started Free"

   **Pro Button:**
   - Background: gradient amber-500 to amber-600
   - Hover: gradient amber-600 to amber-700
   - Text: white
   - Shadow: md, hover: lg
   - Icon: Crown (16px, mr-2)
   - Text: "Upgrade to Pro"

4. **Feature List:**
   - Space-y: 12px (gap between items)

   **Feature Item:**
   - Layout: flex row, gap: 12px (gap-3)
   - Align: items-center

   **Checkmark Container:**
   - Size: 20px × 20px (w-5 h-5)
   - Border-radius: full
   - Free features: gray-100 bg
   - Pro features: amber-100 bg

   **Checkmark Icon:**
   - Size: 12px × 12px (h-3 w-3)
   - Free: gray-600
   - Pro: amber-600

   **Feature Text:**
   - Font-size: 16px (text-base)
   - Color: gray-700

**Feature Lists:**

Free Plan:
- 50 bookmarks per day
- Manual token authentication
- Basic sync features
- Community support
- Open source mode

Pro Plan:
- Unlimited bookmarks
- OAuth integration
- Auto-sync in background
- Priority support
- Advanced features
- Custom database mapping

---

### 6. FAQ Section

**Dimensions:**
- Padding: 80px 0 (py-20)
- Background: white
- Max-width: 768px (max-w-3xl)
- Centered (mx-auto)

**Header:** (Same structure as previous sections)
- Badge: "FAQ"
- H2: "Frequently asked questions"

**Accordion:**
- Space-y: 16px (gap-4 between items)

**Accordion Item:**
- Background: white
- Border: 1px gray-200
- Border-radius: 8px (rounded-lg)
- Padding: 0 24px (px-6)

**Accordion Trigger:**
- Color: gray-900
- Hover: gray-700
- Font-size: 16px (text-base)
- Font-weight: 500
- Padding: 16px 0
- Width: full
- Text-align: left
- Display: flex justify-between

**Accordion Content:**
- Color: gray-600
- Font-size: 16px (text-base)
- Line-height: 1.5
- Padding-bottom: 16px

**FAQ Questions:**
1. What's the difference between OAuth and OSS mode?
2. Is my data secure?
3. Can I try Pro features before purchasing?
4. What happens to my bookmarks if I cancel Pro?
5. Can I sync existing bookmarks from Chrome?

---

### 7. Final CTA Section

**Dimensions:**
- Padding: 80px 0 (py-20)
- Background: gradient from-gray-900 to-gray-800 (diagonal)
- Max-width: 896px (max-w-4xl)
- Centered (mx-auto)
- Text-align: center

**Content:**

1. **H2:**
   - Text: "Ready to organize your bookmarks?"
   - Size: 48px on desktop (text-5xl), 36px on mobile (text-4xl)
   - Color: white
   - Margin-bottom: 24px

2. **Subtitle:**
   - Text: "Join thousands of users building their knowledge base in Notion."
   - Size: 20px (text-xl)
   - Color: gray-300
   - Margin-bottom: 32px

3. **CTA Button:**
   - Background: white
   - Hover: gray-100
   - Text: gray-900
   - Padding: 24px 32px (px-8 py-6)
   - Border-radius: 8px (rounded-lg)
   - Font-size: 18px (text-lg)
   - Icons: Chrome (20px left) + ArrowRight (20px right)

---

### 8. Footer

**Dimensions:**
- Padding: 48px 24px (py-12 px-6)
- Background: gray-50
- Border-top: 1px gray-200

**Layout:**
- Grid: 4 columns on medium+ (md:grid-cols-4), 1 on mobile
- Gap: 32px (gap-8)
- Margin-bottom: 32px

**Column 1 (Branding):**
1. **Logo + Text:**
   - Logo: NotionBookmarkLogoBlue (32px × 32px, w-8 h-8)
   - Text: "Notion Bookmark Sync" (text-base, gray-900)
   - Layout: flex row, gap: 8px (gap-2)
   - Margin-bottom: 16px

2. **Description:**
   - Text: "Seamlessly sync your Chrome bookmarks to Notion."
   - Font-size: 14px (text-sm)
   - Color: gray-600

**Columns 2-4 (Link Groups):**

**Heading (h4):**
- Text: "Product", "Resources", "Legal"
- Color: gray-900
- Margin-bottom: 12px
- Font-size: 16px (text-base)

**Link List:**
- Space-y: 8px (gap-2)
- Font-size: 14px (text-sm)
- Color: gray-600
- Hover: gray-900
- Transition: color 150ms

**Links:**
- Product: Features, Pricing, FAQ
- Resources: Documentation, Support, GitHub
- Legal: Privacy Policy, Terms of Service

**Copyright:**
- Padding-top: 32px (pt-8)
- Border-top: 1px gray-200
- Text-align: center
- Font-size: 14px (text-sm)
- Color: gray-600
- Text: "© 2025 Notion Bookmark Sync. All rights reserved."

---

## Responsive Breakpoints

### Tailwind Breakpoints
```css
sm: 640px   (small devices)
md: 768px   (medium devices)
lg: 1024px  (large devices)
xl: 1280px  (extra large devices)
2xl: 1536px (2x large devices)
```

### Key Responsive Changes

**Mobile (< 640px):**
- Navigation: Hide nav links, show only logo + CTA button
- Hero: Stack vertically, heading 48px → 36px
- Feature grid: 1 column
- How It Works: 1 column
- Pricing: 1 column
- Button groups: Stack vertically (flex-col)
- Floating card: smaller, bottom: -12px, left: -12px

**Tablet (640px - 1023px):**
- Feature grid: 2 columns
- How It Works: 2 columns (or 1 column for better spacing)
- Pricing: 1 column (cards stack)
- Hero: Can start showing side-by-side at 768px+

**Desktop (1024px+):**
- Full 3-column feature grid
- Full 3-column How It Works
- 2-column pricing side-by-side
- Hero: Full 2-column layout
- All horizontal button groups

---

## Animations

### Motion (Framer Motion) Specifications

**Fade In Up (Hero, CTA Section):**
```javascript
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.6 }
```

**Fade In Right (Hero Image):**
```javascript
initial: { opacity: 0, x: 20 }
animate: { opacity: 1, x: 0 }
transition: { duration: 0.6, delay: 0.2 }
```

**Floating Card (Hero):**
```javascript
initial: { opacity: 0, y: 20 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.6, delay: 0.4 }
```

**Scroll Animations (Feature Cards, Steps):**
```javascript
initial: { opacity: 0, y: 20 }
whileInView: { opacity: 1, y: 0 }
transition: { duration: 0.5 }
viewport: { once: true }
```

**Hover Transitions:**
- Buttons: transition-all duration-150
- Cards: transition-shadow duration-200
- Links: transition-colors duration-150
- Borders: transition-colors duration-200

---

## Shadow System

```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25)
```

**Usage:**
- Cards: shadow-none → shadow-lg on hover
- Floating elements: shadow-xl
- Hero image: shadow-2xl
- Buttons (Pro): shadow-md → shadow-lg on hover

---

## Icon Specifications

### Icon Library
- Source: lucide-react
- Default size: 16px (h-4 w-4) for inline
- Button icons: 16-20px (h-4 w-4 or h-5 w-5)
- Feature icons: 24px (h-6 w-6)
- Step icons: 32px (h-8 w-8)

### Icon List
- Chrome: Navigation, CTA buttons
- Sparkles: Free plan badge, Free plan icon
- Crown: Pro plan badge, Pro plan icon
- ArrowRight: CTA buttons
- CheckCircle2: Trust indicators
- RefreshCw: Floating card, Auto sync feature, Step 3
- Zap: One-Click Sync feature
- BookmarkPlus: Rich Metadata feature
- Shield: Secure OAuth feature
- Code: OSS Mode feature
- Lock: Step 2 (Connect to Notion)
- Cloud: Folder Sync feature
- Check: Pricing feature checkmarks
- ChevronDown: FAQ accordion toggle

---

## Badge Specifications

### Section Badges
- Padding: 4px 12px (px-3 py-1 or similar)
- Border-radius: full (9999px)
- Font-size: 14px (text-sm)
- Font-weight: 400
- Display: inline-flex items-center
- Gap: 4px (gap-1) between icon and text

**Variants:**
1. **Primary (Hero):**
   - Background: blue-50
   - Text: blue-700
   - Border: 1px blue-200
   - Icon: Sparkles

2. **Neutral (Section headers):**
   - Background: gray-100
   - Text: gray-700
   - Border: 1px gray-300

3. **Success (Yearly toggle):**
   - Background: green-100
   - Text: green-700
   - Border: none
   - Text: "Save 20%"

4. **Primary CTA (Pro popular):**
   - Background: blue-500
   - Text: white
   - Border: none
   - Text: "Most Popular"

---

## Button Specifications

### Primary Button (Dark)
```css
background: gray-900
hover:background: gray-800
color: white
padding: 12px 24px (or 24px 32px for large)
border-radius: 8px
font-size: 16px
font-weight: 500
transition: all 150ms
shadow: none → optional shadow on hover
```

### Secondary Button (Light)
```css
background: white
hover:background: gray-50
color: gray-900
border: 1px gray-300
padding: 12px 24px (or 24px 32px for large)
border-radius: 8px
font-size: 16px
font-weight: 500
transition: all 150ms
```

### Pro Button (Gradient)
```css
background: linear-gradient(to right, #f59e0b, #d97706)
hover:background: linear-gradient(to right, #d97706, #b45309)
color: white
padding: 24px 16px (full width)
border-radius: 8px
font-size: 16px
font-weight: 500
shadow: md
hover:shadow: lg
transition: all 200ms
```

### CTA on Dark Background
```css
background: white
hover:background: gray-100
color: gray-900
padding: 24px 32px
border-radius: 8px
font-size: 18px
font-weight: 500
transition: all 150ms
```

---

## Image Specifications

### Hero Image
- Source: Unsplash productivity dashboard
- URL: https://images.unsplash.com/photo-1549930585-0e530dd1afd4?...
- Alt text: "Notion Dashboard"
- Width: 100% of container
- Height: auto
- Border-radius: 16px (rounded-2xl)
- Border: 1px gray-200
- Shadow: 2xl
- Overlay: gradient from-gray-900/20 to-transparent (top to bottom)

### Component
- Use: ImageWithFallback component
- Import: from './components/figma/ImageWithFallback'

---

## Z-Index Layers

```css
z-0: Base layer (default)
z-10: Floating elements
z-20: Demo toggle buttons (development only)
z-50: Fixed navigation bar
```

---

## Accessibility Notes

1. **Navigation Links:**
   - Use semantic `<a>` tags with href="#section-id"
   - Smooth scroll behavior
   - Clear focus states

2. **Buttons:**
   - Semantic `<button>` elements
   - Descriptive text + icons
   - Clear hover and focus states
   - Min touch target: 44px × 44px

3. **Headings:**
   - Proper hierarchy: h1 → h2 → h3 → h4
   - Single h1 per page (Hero heading)

4. **Color Contrast:**
   - Text on white: gray-900 (AAA), gray-600 (AA)
   - Text on dark: white (AAA)
   - Links: Clear hover states with color change

5. **Images:**
   - Always include alt text
   - Decorative images: alt=""

6. **Interactive Elements:**
   - Keyboard navigable (Tab key)
   - Focus visible (outline-ring)
   - Clear interactive states

---

## Implementation Checklist

### Phase 1: Structure
- [ ] Create navigation bar with fixed positioning
- [ ] Set up hero section with 2-column grid
- [ ] Create features section with 3-column grid
- [ ] Build how it works section with step cards
- [ ] Implement pricing section with toggle
- [ ] Add FAQ section with accordion
- [ ] Create final CTA section
- [ ] Build footer with 4-column layout

### Phase 2: Styling
- [ ] Apply color palette consistently
- [ ] Set up typography system
- [ ] Add spacing and padding
- [ ] Apply border radius to all cards
- [ ] Implement shadow system
- [ ] Add gradient backgrounds where specified

### Phase 3: Components
- [ ] Integrate NotionBookmarkLogoBlue
- [ ] Use Lucide icons consistently
- [ ] Implement Badge component
- [ ] Use Button component with variants
- [ ] Add Card components
- [ ] Integrate Accordion component

### Phase 4: Responsiveness
- [ ] Test and adjust mobile layout (< 640px)
- [ ] Test tablet layout (640px - 1023px)
- [ ] Test desktop layout (1024px+)
- [ ] Verify navigation collapses properly
- [ ] Check image scaling and positioning
- [ ] Test button groups stack/row behavior

### Phase 5: Animations
- [ ] Add fade-in-up animations to hero
- [ ] Implement scroll-triggered animations
- [ ] Add hover transitions to cards
- [ ] Add button hover effects
- [ ] Test animation performance

### Phase 6: Interactions
- [ ] Wire up smooth scroll navigation
- [ ] Implement billing toggle functionality
- [ ] Connect CTA buttons (placeholder actions)
- [ ] Test accordion expand/collapse
- [ ] Verify hover states work correctly

### Phase 7: Polish
- [ ] Test all links and buttons
- [ ] Verify icon sizes and colors
- [ ] Check spacing consistency
- [ ] Test on different screen sizes
- [ ] Optimize images
- [ ] Add loading states if needed

---

## Developer Notes

### Key Dependencies
```json
{
  "motion/react": "For animations",
  "lucide-react": "For icons",
  "shadcn/ui": "Button, Card, Badge, Accordion components"
}
```

### Import Structure
```javascript
// Motion
import { motion } from "motion/react";

// Icons
import {
  BookmarkPlus, Zap, Shield, RefreshCw, CheckCircle2,
  ArrowRight, Chrome, Sparkles, Crown, Code, Lock,
  Cloud, Check, ChevronDown
} from "lucide-react";

// Components
import { NotionBookmarkLogoBlue } from "./icons/NotionBookmarkLogoBlue";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { ImageWithFallback } from "./figma/ImageWithFallback";
```

### State Management
```javascript
const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
```

### Smooth Scroll Function
```javascript
const handleGetStarted = () => {
  window.open("https://chrome.google.com/webstore", "_blank");
};

const handleLearnMore = () => {
  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
};
```

---

## Final Notes

This specification provides pixel-perfect implementation details for the Notion Bookmark Sync landing page. All measurements, colors, and interactions have been precisely defined to match the Notion aesthetic established in the extension.

**Key Design Principles:**
1. **Clean & Minimal:** Generous white space, subtle borders
2. **Notion Aesthetic:** Neutral grays, rounded corners, soft shadows
3. **Clear Hierarchy:** Bold headings, readable body text, clear CTAs
4. **Trust Building:** Social proof, clear pricing, transparent FAQ
5. **Performance:** Optimized animations, efficient layouts

For questions or clarifications, refer to the implemented component at `/components/LandingPage.tsx`.

Last updated: November 5, 2025
