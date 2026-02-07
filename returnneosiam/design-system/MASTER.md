# Neosiam Return - Design System Master

> Generated using UI/UX Pro Max Skill + Frontend Design Skill + Vercel React Best Practices

---

## 🎨 Design Philosophy

**Product Type:** Enterprise SaaS / Logistics Operations Dashboard  
**Industry:** Logistics & Supply Chain Management  
**Tone:** Professional, Modern, Efficient, Data-Driven  
**Theme:** Dark Sidebar + Light Content Area (Hybrid Mode)

---

## 🎯 Color Palette

### Primary Colors

| Name | Hex | Usage |
| ------ | ----- | ------- |
| **Primary** | `#4f46e5` (Indigo-600) | CTAs, Active states, Links |
| **Primary Hover** | `#4338ca` (Indigo-700) | Hover states |
| **Primary Light** | `#e0e7ff` (Indigo-100) | Backgrounds, Badges |

### Semantic Colors

| Name | Hex | Usage |
| ------ | ----- | ------- |
| **Success** | `#22c55e` (Green-500) | Restock, Completed, Approved |
| **Warning** | `#f59e0b` (Amber-500) | RTV, Pending, Attention |
| **Danger** | `#ef4444` (Red-500) | Recycle, Errors, Alerts |
| **Info** | `#3b82f6` (Blue-500) | Claim, Information |
| **Purple** | `#a855f7` (Purple-500) | Internal Use, Special |

### Neutral Colors

| Name | Hex | Usage |
| ------ | ----- | ------- |
| **Slate-900** | `#0f172a` | Sidebar background |
| **Slate-800** | `#1e293b` | Sidebar borders |
| **Slate-700** | `#334155` | Secondary text dark |
| **Slate-600** | `#475569` | Muted text light mode |
| **Slate-500** | `#64748b` | Placeholder text |
| **Slate-400** | `#94a3b8` | Disabled states |
| **Slate-200** | `#e2e8f0` | Borders light mode |
| **Slate-100** | `#f1f5f9` | Card backgrounds |
| **Slate-50** | `#f8fafc` | Page background |

---

## 📝 Typography

### Font Stack

```css
font-family: 'Sarabun', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Font Pairings

- **Display/Headings:** Inter (Bold/Black) - English text, numbers
- **Body/Thai:** Sarabun (Regular/Medium) - Thai text, descriptions

### Type Scale

| Element | Size | Weight | Line Height |
| --------- | ------ | -------- | ------------- |
| H1 (Page Title) | 24px / 1.5rem | 700 (Bold) | 1.2 |
| H2 (Section) | 20px / 1.25rem | 600 (Semibold) | 1.3 |
| H3 (Card Title) | 16px / 1rem | 600 (Semibold) | 1.4 |
| Body | 14px / 0.875rem | 400 (Regular) | 1.5 |
| Small | 12px / 0.75rem | 500 (Medium) | 1.5 |
| Caption | 10px / 0.625rem | 700 (Bold) | 1.4 |

---

## 🧱 Component Patterns

### Cards (Glass Morphism)

```css
.glass-card {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
  border-radius: 1.5rem; /* 24px */
}
```

### Buttons

| Type | Classes |
| ------ | --------- |
| **Primary** | `bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 font-semibold transition-all` |
| **Secondary** | `bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl px-4 py-2.5 font-semibold transition-all` |
| **Ghost** | `hover:bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 font-semibold transition-all` |
| **Danger** | `bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2.5 font-semibold transition-all` |

### Form Inputs

```css
/* Light Mode */
.input-light {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}
.input-light:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

/* Dark Mode (Login) */
.input-dark {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 1rem;
  padding: 1rem 1.25rem;
}
```

---

## 🎭 Animation Guidelines

### Timing

| Type | Duration | Easing |
| ------ | ---------- | -------- |
| Micro-interactions | 150-200ms | ease-out |
| Page transitions | 300-400ms | ease-out |
| Loading states | 200ms | ease-in-out |

### Motion Patterns

```css
/* Slide Up (Page Enter) */
@keyframes slide-up {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Hover Scale (Cards) - AVOID layout shift */
.card-hover {
  transition: box-shadow 0.2s, border-color 0.2s;
}
.card-hover:hover {
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  border-color: rgba(79, 70, 229, 0.3);
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## ♿ Accessibility Requirements

### Color Contrast

- **Body text:** Minimum 4.5:1 ratio
- **Large text (18px+):** Minimum 3:1 ratio
- **UI components:** Minimum 3:1 ratio

### Interactive Elements

- **Touch targets:** Minimum 44x44px
- **Focus states:** Visible focus ring (2px indigo-500)
- **Cursor:** `cursor-pointer` on all clickable elements

### Form Labels

- All inputs MUST have associated `<label>` with `htmlFor`
- Icon-only buttons MUST have `aria-label`

---

## 📊 Chart Guidelines

### Color Palette for Charts

```javascript
const CHART_COLORS = {
  Restock: '#22c55e',     // Green
  RTV: '#f59e0b',         // Amber
  Recycle: '#ef4444',     // Red
  Claim: '#3b82f6',       // Blue
  InternalUse: '#a855f7', // Purple
  Pending: '#94a3b8'      // Slate
};
```

### Chart Types by Data

| Data Type | Recommended Chart |
| ----------- | ------------------- |
| Trend over time | Area Chart, Line Chart |
| Comparison | Bar Chart (horizontal for many items) |
| Composition | Pie Chart, Donut Chart |
| Distribution | Histogram |
| Correlation | Scatter Plot |

---

## 🚫 Anti-Patterns to Avoid

### Icons

- ❌ **NEVER** use emojis as UI icons
- ✅ Use Lucide React icons consistently

### Hover States

- ❌ **NEVER** use `scale` transforms that shift layout
- ✅ Use `box-shadow`, `border-color`, `opacity` changes

### Colors

- ❌ **NEVER** use `bg-white/10` in light mode (invisible)
- ✅ Use `bg-white/80` or higher opacity

### Typography

- ❌ **NEVER** use gray-400 for body text in light mode
- ✅ Use slate-600 minimum for readable text

---

## 🔧 React Performance Rules

### From Vercel React Best Practices

1. **Eliminate Waterfalls**
   - Use `Promise.all()` for independent async operations
   - Move `await` into branches where actually used

2. **Bundle Optimization**
   - Import directly, avoid barrel files
   - Use dynamic imports for heavy components
   - Defer third-party scripts (analytics) after hydration

3. **Re-render Optimization**
   - Use ternary `? :` instead of `&&` for conditional rendering
   - Extract expensive work into memoized components
   - Use primitive dependencies in useEffect

4. **Animation Performance**
   - Use `transform` and `opacity` only (GPU accelerated)
   - Never animate `width`, `height`, `top`, `left`

---

## 📁 File Structure

```text
components/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── Badge.tsx
├── layout/                # Layout components
│   ├── Sidebar.tsx
│   └── Header.tsx
├── features/              # Feature-specific components
│   ├── Dashboard/
│   ├── NCR/
│   └── Operations/
└── shared/                # Shared utilities
    └── LoadingSpinner.tsx
```

---

## ✅ Pre-Delivery Checklist

### Visual Quality

- [ ] No emojis used as icons (use Lucide React)
- [ ] All icons from consistent icon set
- [ ] Hover states don't cause layout shift
- [ ] Glass cards visible in light mode

### Interaction

- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Accessibility

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] Touch targets minimum 44x44px

### Performance

- [ ] No barrel imports
- [ ] Heavy components lazy loaded
- [ ] Animations use transform/opacity only
- [ ] Ternary rendering instead of &&

---

*Last Updated: 2026-02-04*
*Generated by: UI/UX Pro Max + Frontend Design + Vercel React Best Practices Skills*
