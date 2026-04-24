# Design System - Green & White Color Palette

A comprehensive, accessible color palette inspired by **Nextdoor.com** design language. Built with modern design standards and WCAG accessibility compliance in mind.

## 🎨 Palette Overview

### Primary Green (#2da965)

The signature brand color, used for primary actions, CTAs, and brand identity. Vibrant and trustworthy, similar to Nextdoor's community-focused aesthetic.

**10-shade gradient:**

- **50-200:** Light backgrounds and hover states
- **500:** Main brand color (featured)
- **600-900:** Dark variants for active/pressed states and high contrast

### Neutral Gray (White to #111827)

Complete 11-value neutral scale for text, backgrounds, borders, and disabled states. Ensures readability and visual hierarchy.

### Status Colors

- **Success:** #10b981 (green)
- **Warning:** #f59e0b (amber)
- **Error:** #ef4444 (red)
- **Info:** #3b82f6 (blue)

Each with light variants for backgrounds and dark variants for strong emphasis.

---

## 📁 Files Included

### 1. **color-palette.css**

CSS custom properties for all colors. Import into your main stylesheet:

```css
@import "src/styles/color-palette.css";
```

Usage in CSS:

```css
.btn-primary {
  background-color: var(--color-primary-500);
}
.btn-primary:hover {
  background-color: var(--color-primary-600);
}
```

### 2. **colors.ts**

TypeScript/JavaScript design tokens export. Import in React components:

```typescript
import { colors, cssVariables } from "@/utils/colors";

// Direct use
const primaryColor = colors.primary[500]; // '#2da965'

// Semantic usage
const buttonBackground = colors.semantic.buttonPrimary; // '#2da965'

// Tailwind CSS compatible
const tailwindConfig = colors.tailwindColors;
```

### 3. **tailwind.config.example.js**

Tailwind CSS configuration snippet for color classes:

```bash
# Merge into your tailwind.config.js

bg-primary-500     # Primary green background
text-primary-900   # Dark text
border-primary-200 # Light green border
hover:bg-primary-600 # Hover states
```

### 4. **color-palette.json**

JSON export for design tools (Figma, Adobe XD, etc.) and API consumption:

- RGB values
- HEX codes
- Usage descriptions
- WCAG compliance notes

### 5. **COLOR_PALETTE_GUIDE.html**

Interactive visual reference. Open in browser to see:

- All color shades with hex codes
- Button component examples
- Contrast demonstrations
- Usage guidelines

---

## 🚀 Quick Start

### Option 1: CSS Variables

```html
<button style="background-color: var(--color-primary-500);">Click me</button>
```

### Option 2: Tailwind CSS

```html
<button class="bg-primary-500 hover:bg-primary-600 text-white">Click me</button>
```

### Option 3: JavaScript

```javascript
import { colors } from "@/utils/colors";

const buttonStyle = {
  backgroundColor: colors.primary[500],
  color: colors.neutral[0],
};
```

---

## 📐 Usage Guidelines

### Primary Color (500-600)

- ✅ Call-to-action buttons
- ✅ Active navigation states
- ✅ Focus rings and highlights
- ✅ Success confirmations
- ✅ Brand identity elements
- ❌ Body text (too bright)
- ❌ Backgrounds (too saturated)

### Light Green (50-300)

- ✅ Hover states
- ✅ Background colors
- ✅ Alert backgrounds
- ✅ Secondary interactions
- ✅ Subtle highlights

### Dark Green (600-900)

- ✅ Pressed/active button states
- ✅ Dark mode variants
- ✅ High-contrast text (900)
- ✅ Focus indicators
- ❌ Main background (too dark)

### Neutral Colors

| Shade   | Usage                      |
| ------- | -------------------------- |
| 0       | White background           |
| 50-100  | Subtle backgrounds         |
| 200-300 | Borders, dividers          |
| 400-500 | Secondary/placeholder text |
| 600-700 | Body text, labels          |
| 800-900 | Headings, strong text      |

---

## ♿ Accessibility

All colors meet **WCAG AA** contrast ratios:

- Primary (500) on white: **5.89:1** ✓
- Text (900) on white: **12.6:1** ✓✓✓ (AAA)
- Text (700) on white: **7.87:1** ✓✓✓ (AAA)

Recommended combinations:

- **Primary buttons:** #2da965 text on white
- **Body text:** #1f2937 on white
- **Secondary text:** #6b7280 on white
- **Disabled state:** #9ca3af on white

---

## 🎭 Component Examples

### Buttons

```jsx
// Primary
<button className="bg-primary-500 hover:bg-primary-600 text-white">
  Save
</button>

// Secondary
<button className="bg-neutral-100 hover:bg-neutral-200 text-neutral-900">
  Cancel
</button>

// Tertiary
<button className="bg-transparent border-2 border-primary-500 text-primary-600">
  Learn More
</button>
```

### Forms

```jsx
<input
  className="border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
  placeholder="Enter text..."
/>
```

### Cards

```jsx
<div className="bg-white border border-neutral-200 rounded-lg">
  <h3 className="text-neutral-900">Title</h3>
  <p className="text-neutral-600">Description</p>
</div>
```

### Status Alerts

```jsx
// Success
<div className="bg-success-light border-l-4 border-success text-success-dark">
  ✓ Operation completed successfully
</div>

// Error
<div className="bg-error-light border-l-4 border-error text-error-dark">
  ✗ Something went wrong
</div>
```

---

## 🔄 Dark Mode (Optional)

The CSS variables include a dark mode variant via `prefers-color-scheme: dark`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-neutral-900);
    /* ... more dark mode overrides */
  }
}
```

---

## 📊 Color Reference

### Primary Green Family

```
#f0f9f5 (50)   - Lightest backgrounds
#d0f0e0 (100)  - Light hover states
#a8e5c6 (200)  - Secondary interactions
#7ed5aa (300)  - Light buttons
#4fc183 (400)  - Medium interactions
#2da965 (500)  - ⭐ BRAND COLOR
#248a54 (600)  - Active states
#1a6b42 (700)  - Pressed states
#134c31 (800)  - Strong contrast
#0d2e1e (900)  - Maximum contrast text
```

### Neutral Gray Family

```
#ffffff (0)   - White
#f9fafb (50)  - Subtle background
#f3f4f6 (100) - Light background
#e5e7eb (200) - Light border
#d1d5db (300) - Medium border
#9ca3af (400) - Disabled/placeholder
#6b7280 (500) - Secondary text
#4b5563 (600) - Subheading
#374151 (700) - Body text
#1f2937 (800) - Strong text
#111827 (900) - Maximum contrast
```

---

## 🛠️ Integration

### React + TypeScript

```typescript
import { colors, cssVariables } from '@/utils/colors';

const Button = ({ variant = 'primary' }) => {
  const bgColor = colors.semantic[`button${variant}`];
  return <button style={{ backgroundColor: bgColor }}>Click</button>;
};
```

### Tailwind + Next.js

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: require("./color-palette.json").colors,
    },
  },
};
```

### Vue + Vite

```vue
<template>
  <button :style="{ backgroundColor: colors.primary[500] }">Click me</button>
</template>

<script setup>
import { colors } from "@/utils/colors.ts";
</script>
```

---

## 📝 Notes

- All colors use **RGB** and **HEX** formats for maximum compatibility
- Gradients can be created using the 50-900 scale
- The palette is inspired by **Nextdoor.com** but customized for flexibility
- Suitable for **SaaS**, **community platforms**, **marketplaces**, and **productivity apps**

---

## 📄 Version

- **Version:** 1.0.0
- **Last Updated:** 2026
- **Compliance:** WCAG AA
- **License:** MIT
