# SmartPosTEF Package Manager — Design System

> **Version:** 3.2.2 · **Framework:** Tauri v2 (Rust + Vanilla JS) · **Stylesheet:** `src/styles/main.css` (4 400+ lines)

---

## 1. Design Philosophy

The UI is built on a **glassmorphism** aesthetic: translucent surfaces layered over animated mesh gradients, with frosted-glass blur effects and subtle noise textures. Every surface uses `backdrop-filter: blur()` and semi-transparent backgrounds, creating depth without hard opaque layers.

**Key principles:**

- **Depth through translucency** — cards, sidebar, and inputs all use `rgba()` backgrounds with backdrop blur
- **Theme-first** — all visual decisions flow from CSS custom properties; no hardcoded colors in components
- **Layered mesh gradients** — the app background uses overlapping radial gradients (`--mesh-1`, `--mesh-2`, `--mesh-3`) plus a noise texture overlay
- **Subtle motion** — transitions on hover/focus, animated toasts, expandable/collapsible cards

---

## 2. Theme System

Themes are applied via the `data-theme` attribute on `<html>`. Eight themes ship: 4 dark, 4 light. Each theme defines the full token palette.

### 2.1 Dark Themes

| Theme | `data-theme` | Primary | Secondary | Background |
|---|---|---|---|---|
| **Purple Night** (default) | `purple-night` | `#a064ff` | `#e040a0` | `#0a0618` |
| **Ocean Storm** | `ocean-storm` | `#38bdf8` | `#2dd4bf` | `#050d1a` |
| **Rose Gold** | `rose-gold` | `#f47a8a` | `#f5c542` | `#1a0c12` |
| **Emerald Shadow** | `emerald-shadow` | `#34d399` | `#a3e635` | `#050f0a` |

### 2.2 Light Themes

| Theme | `data-theme` | Primary | Secondary | Background |
|---|---|---|---|---|
| **Teal Glow** | `teal-glow-light` | `#00897a` | `#00695c` | `#d0eaf0` |
| **Lavender Breeze** | `lavender-breeze` | `#7c3aed` | `#c026d3` | `#ebe5f8` |
| **Sunrise Warm** | `sunrise-warm` | `#ea580c` | `#dc2626` | `#fef2e8` |
| **Arctic Blue** | `arctic-blue` | `#0284c7` | `#7c3aed` | `#e8f4f8` |

### 2.3 Theme Token Reference

Every theme must define all of the following tokens:

```
/* Brand */
--primary              Main accent color
--primary-light        Lighter variant for hover/focus
--secondary            Complementary accent
--secondary-light      Lighter complement
--gradient             linear-gradient(135deg, var(--primary), var(--secondary))

/* Backgrounds */
--bg-primary           Root background
--bg-secondary         Sidebar, inputs
--bg-tertiary          Elevated surfaces, alternating rows
--bg-card              Card surfaces (rgba, semi-transparent)
--gradient-bg          Full-viewport gradient
--sidebar-bg           Sidebar frosted glass (rgba)
--card-hover-bg        Card hover state
--input-bg             Input fields (rgba)

/* Text */
--text-primary         Body text, headings
--text-secondary       Labels, descriptions, metadata
--text-muted           Placeholders, disabled text

/* Borders */
--border-color         Standard borders (rgba)
--border-light         Hover borders (rgba)
--border-highlight     Top/left glassmorphism edge highlight (rgba white)

/* Effects */
--accent-glow          Glow on focused/active elements (rgba)
--mesh-1               Mesh gradient blob 1
--mesh-2               Mesh gradient blob 2
--mesh-3               Mesh gradient blob 3

/* Semantic mappings */
--icon-color           Navigation & label icons
--heading-color        Page & card headings
--link-color           Links and subtle highlights
--badge-bg             Badge backgrounds
--badge-text           Badge text color
--date-icon-filter     Calendar icon visibility (invert(0.3) light / invert(0.7) dark)
```

---

## 3. Global Tokens

Defined on `:root` (theme-independent):

```css
--sidebar-width: 260px;

--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;

--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);

--success: #22c55e;
--warning: #f59e0b;
--error:   #ef4444;
--info:    #3b82f6;
```

---

## 4. Typography

**Font stack:**

```
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
```

**Monospace (code, paths, passwords):**

```
font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
/* Fallback: 'Consolas', 'Monaco', 'Courier New', monospace */
```

### Scale

| Role | Size | Weight | Token / CSS |
|---|---|---|---|
| App title (sidebar) | `1.125rem` (18px) | 700 | `.app-title h1` — gradient text fill |
| Page heading | `1.75rem` (28px) | 700 | `.page-header h2` — `var(--heading-color)` |
| Card heading | `1.125rem` (18px) | 600 | `.card h3` — `var(--heading-color)` |
| Release version | `1.375rem` (22px) | 600 | `.release-version-text` |
| Body / form labels | `0.875rem` (14px) | 500 | `.form-group label` — `var(--icon-color)` |
| Input text | `0.875rem` (14px) | 400 | `input, select, textarea` |
| Small / meta | `0.8125rem` (13px) | 400–500 | `.release-card-meta`, `.toast-message` |
| Captions / tags | `0.75rem` (12px) | 500–600 | `.package-tag`, `.status-badge`, badges |
| Micro (badge inner) | `0.6875rem` (11px) | 600–700 | `.pkg-badge`, `.accordion-badge` |
| Tiny (tags, labels) | `0.65rem` (10.4px) | 600 | `.summary-tag`, `.pkg-new-badge` |

### Special treatments

- **Gradient text fill**: `.app-title h1` uses `background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;`
- **Uppercase tracking**: `.toast-title` — `text-transform: uppercase; letter-spacing: 0.5px`
- **Monospace highlight**: `.password-value` — `font-size: 2rem; letter-spacing: 0.15em; user-select: all`

---

## 5. Spacing System

The app uses a **rem-based scale** (base 16px). No strict token set — spacing is applied directly:

| Value | Usage |
|---|---|
| `0.125rem` (2px) | Tag padding-y, tight gaps |
| `0.25rem` (4px) | Small gaps, nav item margin-bottom |
| `0.375rem` (6px) | Tab padding, small button padding |
| `0.5rem` (8px) | Standard inline gap, card-actions gap |
| `0.75rem` (12px) | Form gap, nav-item gap, card grid gap |
| `1rem` (16px) | Sidebar nav padding, card inner padding minimum |
| `1.25rem` (20px) | Expandable card padding, card-header padding |
| `1.5rem` (24px) | Card padding, sidebar header padding, standard section spacing |
| `2rem` (32px) | Main content padding, page header margin-bottom |
| `3rem` (48px) | Empty state padding |

---

## 6. Layout System

### 6.1 App Shell

```
┌─────────────┬─────────────────────────────────────┐
│  Sidebar    │  Main Content (scrollable)           │
│  260px      │  padding: 2rem                       │
│  fixed      │  max-width: 1200px (centered)        │
│  flex-col   │                                      │
│             │  ┌──────────────────────────────────┐ │
│  nav        │  │ Page Header                      │ │
│  items      │  ├──────────────────────────────────┤ │
│             │  │ Cards / Content                  │ │
│  ───        │  │ margin-bottom: 1.5rem each       │ │
│  footer     │  └──────────────────────────────────┘ │
└─────────────┴─────────────────────────────────────┘
```

- Root: `display: flex; height: 100vh; overflow: hidden`
- Sidebar: `width: 260px; flex-shrink: 0; backdrop-filter: blur(40px) saturate(1.6)`
- Main: `flex: 1; overflow-y: auto; scrollbar-gutter: stable`
- Pages: `display: none` / `.active → display: block; max-width: 1200px; margin: 0 auto`

### 6.2 Mesh Background

The `.app` element has two pseudo-elements creating the background atmosphere:

- `::before` — 4 radial gradients using `--mesh-1/2/3` tokens, covering the full viewport
- `::after` — SVG fractalNoise texture at `opacity: 0.035; mix-blend-mode: overlay`

Both have `pointer-events: none; z-index: 0` so they don't interfere with interaction.

### 6.3 Grid Patterns

| Pattern | CSS | Usage |
|---|---|---|
| **Form grid** | `grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))` | Deploy form fields |
| **Form grid 3-col** | `grid-template-columns: 1fr 1fr 1fr` | Import form (version, date, type) |
| **Theme grid** | `repeat(auto-fill, minmax(180px, 1fr))` | Settings theme cards |
| **Package cards** | `repeat(auto-fill, minmax(260px, 1fr))` | Accordion package cards |
| **Filter grid** | `repeat(auto-fill, minmax(180px, 1fr))` | Advanced filter dropdowns |
| **Deploy purpose** | `repeat(2, 1fr)` | Purpose selection (2 big buttons) |

---

## 7. Color System

### 7.1 Semantic Colors

| Name | Value | Usage |
|---|---|---|
| Success | `#22c55e` | Uploaded, production badges, confirmations |
| Warning | `#f59e0b` | Development badges, date notices, purge button |
| Error | `#ef4444` | Delete buttons, error toasts, validation |
| Info | `#3b82f6` | Deploy-only badges, info toasts, log level |

Each semantic color has associated background/text patterns: `rgba(color, 0.2–0.3)` bg + solid color text.

### 7.2 Badge Color Map

| Badge | Background | Text | Border |
|---|---|---|---|
| Production | `rgba(34, 197, 94, 0.2)` | `#22c55e` | `rgba(34, 197, 94, 0.4)` |
| Development | `rgba(245, 158, 11, 0.2)` | `#f59e0b` | `rgba(245, 158, 11, 0.4)` |
| Deploy-only | `rgba(59, 130, 246, 0.2)` | `#3b82f6` | `rgba(59, 130, 246, 0.4)` |
| Unsigned | `rgba(239, 68, 68, 0.2)` | `#ef4444` | `rgba(239, 68, 68, 0.4)` |

### 7.3 Package Tag Colors

| Tag type | Background | Text color |
|---|---|---|
| Platform | `rgba(72, 41, 124, 0.35)` | `var(--primary-light)` |
| Device | `rgba(156, 38, 113, 0.35)` | `var(--secondary-light)` |
| Category | `rgba(59, 130, 246, 0.25)` | `var(--info)` |
| Size | `rgba(107, 114, 128, 0.25)` | `var(--text-secondary)` |
| Signed | `rgba(34, 197, 94, 0.25)` | `var(--success)` |
| Unsigned | `rgba(239, 68, 68, 0.25)` | `var(--error)` |

### 7.4 Accordion Platform Icons

| Platform | Background | Icon |
|---|---|---|
| Windows | `#0078d4` | "W" letter |
| Linux 64 | `#e95420` | "L" letter |
| Linux 32 | `#dd4814` | "L" letter |
| STA | `#22c55e` | "S" letter |
| A2A | `#8b5cf6` | "A" letter |
| Embedded | `#f59e0b` | "E" letter |
| Custom | `#6366f1` | "C" letter |

---

## 8. Components

### 8.1 Card

The fundamental container. Uses glassmorphism with a characteristic top-left highlight edge.

```css
background: var(--bg-card);                            /* semi-transparent */
backdrop-filter: blur(32px) saturate(1.4);
border: 1px solid var(--border-color);
border-top-color: var(--border-highlight);             /* white edge highlight */
border-left-color: var(--border-highlight);
border-radius: var(--radius-lg);                       /* 12px */
padding: 1.5rem;
margin-bottom: 1.5rem;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 var(--border-highlight);     /* inner top glow */
```

### 8.2 Buttons

**Variants:**

| Variant | Class | Style |
|---|---|---|
| **Primary** | `.btn-primary` | `background: var(--gradient); color: white; box-shadow: accent glow` |
| **Secondary** | `.btn-secondary` | `background: var(--bg-card); backdrop-filter: blur(20px); border: 1px solid var(--border-color)` |
| **Outline** | `.btn-outline` | `background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary)` |
| **Ghost** | `.btn-ghost` | `background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary)` |
| **Danger** | `.btn-danger` | `background: var(--error); color: white` |
| **Success** | `.btn-success` | `background: #10b981; color: white` |
| **Delete** | `.btn-delete-release` | `border: 1px solid var(--error); color: var(--error); hover → bg: error, color: white` |
| **Purge** | `.btn-purge-release` | `border: 1px solid #f59e0b; color: #f59e0b; hover → bg: rgba(245,158,11,0.15)` |

**Sizes:**

| Size | Class | Padding | Font |
|---|---|---|---|
| Default | `.btn` | `0.75rem 1.25rem` | `0.875rem` |
| Small | `.btn-sm` | `0.5rem 1rem` | `0.8125rem` |
| Icon | `.btn-icon` | `0.5rem` | — |

**States:** `:disabled → opacity: 0.5; cursor: not-allowed` · `:hover:not(:disabled) → filter: brightness(1.15)` (primary)

### 8.3 Inputs

All inputs share the glassmorphism treatment:

```css
padding: 0.75rem 1rem;
background: var(--input-bg);                           /* rgba, semi-transparent */
backdrop-filter: blur(12px);
border: 1px solid var(--border-color);
border-radius: var(--radius-md);                       /* 8px */
color: var(--text-primary);
font-size: 0.875rem;
```

**Focus state:** `border-color: var(--primary); box-shadow: 0 0 0 2px var(--accent-glow)`

**Textarea:** `min-height: 120px; resize: vertical`

**Select:** Custom chevron via inline SVG data URI, `appearance: none`

**Color input:** Custom swatch + text input in a flex row

### 8.4 Navigation (Sidebar)

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: all 0.2s;
}
```

| State | Background | Text | Border | Icon |
|---|---|---|---|---|
| Default | transparent | `var(--text-secondary)` | transparent | `var(--secondary-light)` |
| Hover | `var(--bg-tertiary)` | `var(--text-primary)` | `var(--border-color)` | `var(--primary-light)` |
| Active | `var(--gradient)` | `white` | transparent | `white` |

### 8.5 Toast Notifications

Positioned `fixed; top: 1rem; right: 1rem`. Multiple toasts **cascade** (stack with -60px overlap), expanding on hover.

```css
.toast {
  backdrop-filter: blur(32px) saturate(1.4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  max-width: 380px;
  min-width: 280px;
}
```

**Types:** Each type overrides `border-color` and adds a colored `box-shadow` glow:

- `.toast-success` → green glow + green border
- `.toast-error` → red glow + red border + shake animation
- `.toast-warning` → amber glow + amber border
- `.toast-info` → blue glow + blue border

**Anatomy:** Icon circle (28px) + content (title uppercase + message) + close button (22px circle) + progress bar (3px, bottom)

**Animations:**

- `toastSlideIn` — translateX(120%) → 0 with bounce easing
- `toastPulse` — subtle scale(1.02) attention pulse
- `toastShake` — ±8px horizontal shake (error only)
- `toastProgress` — 6s linear left-to-right depletion bar

### 8.6 Modal / Dialog

```css
.modal-content {
  background: var(--bg-card);
  backdrop-filter: blur(32px) saturate(1.4);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 80%;
  max-height: 80vh;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4),
              inset 0 1px 0 var(--border-highlight);
}
```

**Confirm dialog variant:** Centered layout with:

- Colored header gradient: danger (red), warning (amber), info (blue)
- 64px icon circle with matching semantic color
- Text-centered body and footer with min-width buttons

### 8.7 Expandable Release Cards

Header + collapsible body. The card itself has no border — uses `border-radius: var(--radius-lg)` and `var(--bg-card)`.

**Header:** `display: flex; justify-content: space-between; padding: 1.25rem 1.5rem`

- Left: version text (1.375rem, 600) + badges + optional description + meta row (date, created, platforms, packages)
- Right: action buttons row (Generate HTML, Export SPF, Edit, Expand, Purge, Delete)

**Body:** `border-top: 1px solid var(--border-color); padding: 1.25rem 1.5rem; background: rgba(0,0,0,0.15)`

**Chevron animation:** `.chevron-icon.rotated { transform: rotate(180deg) }`

### 8.8 Badges & Tags

**Release type badges** (`.release-type-badge`):

```css
padding: 0.25rem 0.75rem;
border-radius: 4px;
font-size: 0.75rem;
font-weight: 600;
```

**Package tags** (`.package-tag`):

```css
padding: 0.125rem 0.5rem;
border-radius: 999px;         /* pill shape */
font-size: 0.75rem;
border: 1px solid;
```

**Summary tags** (`.summary-tag`):

```css
padding: 0.1rem 0.4rem;
border-radius: 3px;
font-size: 0.65rem;
font-weight: 600;
letter-spacing: 0.3px;
```

**Status badges** (`.status-badge`):

```css
padding: 0.25rem 0.75rem;
border-radius: 999px;
font-size: 0.75rem;
font-weight: 500;
```

States: `.status-pending` (gray), `.status-uploading` (blue), `.status-success` (green), `.status-error` (red)

### 8.9 Accordion

Used in Import Release page for platform-grouped package management.

```css
.accordion-item {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-card);
}
```

**Header:** Clickable row with chevron (→ rotates 90° on expand) + platform icon (28px colored square) + title + badge count.

**Body:** `display: none → block` on `.expanded`. Contains platform tabs or package card grids.

### 8.10 Toggle Switch

```css
.toggle-switch { width: 36px; height: 20px; }
.toggle-slider { border-radius: 10px; background: var(--bg-tertiary); }
.toggle-slider::before { width: 12px; height: 12px; border-radius: 50%; }
/* Checked: background: var(--primary); knob: translateX(16px), white */
```

### 8.11 Loading Modal

Full-screen overlay with centered spinner:

```css
.loading-spinner {
  width: 40px; height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

Message text updates dynamically via `#loading-modal-message`.

### 8.12 Tabs

Two tab styles:

**Notes tabs** (`.tab-btn`): Solid active state with `background: var(--primary); color: white`

**Platform tabs** (`.platform-tab`): Underline style with `border-bottom: 2px solid` active indicator

**Release notes tabs** (`.notes-tab`): Bottom-border only style

### 8.13 Deploy Purpose Cards

Large selection cards for choosing deploy mode:

```css
.deploy-purpose-btn {
  padding: 2rem 1.5rem;
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
}
/* Hover: border-color: transparent; transform: translateY(-2px) */
/* Icon: 48px, var(--primary-light) */
```

### 8.14 Package Cards

Used in accordion body for individual package display:

```css
.pkg-card {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: var(--bg-elevated, #1e1e38);
}
/* Hover: border-color: var(--primary) */
```

Anatomy: header (title + info icon + delete) → badges row → actions bar (download + copy URL)

---

## 9. Glassmorphism Recipe

The core visual technique applied to all surfaces:

```css
/* Standard surface */
background: var(--bg-card);                    /* rgba with 0.6–0.7 alpha */
backdrop-filter: blur(32px) saturate(1.4);
-webkit-backdrop-filter: blur(32px) saturate(1.4);
border: 1px solid var(--border-color);         /* ~0.15 alpha */
border-top-color: var(--border-highlight);     /* rgba(255,255,255,0.08) for dark, 0.45 for light */
border-left-color: var(--border-highlight);
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 var(--border-highlight);
```

**Blur levels:**

| Surface | Blur |
|---|---|
| Sidebar | `blur(40px) saturate(1.6)` |
| Cards, Modals, Toasts | `blur(32px) saturate(1.4)` |
| Buttons (secondary) | `blur(20px)` |
| Inputs | `blur(12px)` |

---

## 10. Iconography

All icons are **inline SVGs** with `stroke` attributes. No icon font or sprite sheet.

```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="SIZE" height="SIZE">
```

**Sizes:**

- Navigation: `20×20`
- Buttons: `18×18` (default), `14×14` (`.btn-sm`)
- Meta: `14×14`
- Empty state: `48×48`
- Deploy purpose: `48×48`
- Confirm dialog: `36×36` (in 64px circle)

**Color inheritance:** Icons use `stroke="currentColor"` so they inherit the parent element's `color`.

**Logo:** SVG mask (`images/PACKAGE-portal.svg`) applied to a gradient-filled div:

```css
.logo {
  background: var(--gradient);
  -webkit-mask-image: url('../images/PACKAGE-portal.svg');
  mask-size: contain;
  filter: drop-shadow(0 0 8px var(--accent-glow));
}
```

---

## 11. Scrollbar

Custom WebKit scrollbar:

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--accent-glow); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary); }
```

---

## 12. Animation & Transitions

### Standard transitions

| Property | Duration | Easing |
|---|---|---|
| All (default) | `0.2s` | `ease` (default) |
| Card hover | `0.3s` | `ease` |
| Chevron rotate | `0.2s` | `ease` |
| Toast cascade | `0.3s` | `ease` |

### Keyframe animations

| Name | Duration | Effect |
|---|---|---|
| `toastSlideIn` | `0.4s` | translateX(120%) → 0, bounce easing |
| `toastPulse` | `0.6s` | scale(1) → 1.02 → 1 |
| `toastSlideOut` | `0.3s` | → translateX(120%), fade |
| `toastShake` | `0.5s` | ±8px horizontal oscillation |
| `toastProgress` | `6s` | translateX(0) → translateX(-100%) |
| `spin` | `0.8s` | 360° rotation (loading) |

### Hover effects

- **Cards:** `transform: translateY(-2px); box-shadow` elevation increase
- **Purpose buttons:** `transform: translateY(-2px); border-color: transparent`
- **Delete buttons:** background fill from outline to solid
- **Icon buttons:** `transform: scale(1.1)`

---

## 13. Responsive Behavior

Single breakpoint at `768px`:

```css
@media (max-width: 768px) {
  .deploy-mode-selection { flex-direction: column; }
  .deploy-purpose-options { grid-template-columns: 1fr; }
  .export-import-item { flex-direction: column; text-align: center; }
}
```

The sidebar width remains fixed at 260px (desktop-only app via Tauri).

---

## 14. File Structure

```
src/
├── index.html          Single HTML shell (sidebar + page containers)
├── app.js              All UI logic (~5000+ lines, Vanilla JS)
├── styles/
│   └── main.css        Complete stylesheet (4400+ lines)
├── images/
│   ├── PACKAGE-portal.svg    Logo SVG mask
│   ├── src-a2a-packages.png  Accordion platform icons
│   ├── src-custom-plat.png
│   ├── src-platform-pkgs.png
│   └── src-sta-packages.png
└── lib/
    └── marked.min.js   Markdown renderer (release notes)
```

---

## 15. Pattern Library Summary

| Pattern | Key classes | Notes |
|---|---|---|
| Page layout | `.app`, `.sidebar`, `.main-content`, `.page` | Flex sidebar + scrollable main |
| Glassmorphism surface | `.card`, `.modal-content`, `.toast` | blur + rgba bg + border highlights |
| Form | `.form-grid`, `.form-group`, `input`, `select`, `textarea` | Auto-fit grid, focus glow |
| Action bar | `.action-bar`, `.import-action-bar` | Flex row with gap, right-aligned |
| Release card | `.release-card-expandable`, `-header`, `-body` | Collapsible with chevron |
| Accordion | `.accordion-group`, `.accordion-item`, `-header`, `-body` | Platform-grouped packages |
| Toast stack | `.toast-container`, `.toast`, `.toast-{type}` | Cascading with hover-expand |
| Confirm dialog | `.confirm-dialog`, `.confirm-header-{kind}` | Centered modal with icon |
| Theme card | `.theme-card`, `.theme-preview`, `.theme-name` | Selectable grid items |
| Toggle switch | `.toggle-switch`, `.toggle-slider` | 36×20px pill toggle |
| Badge | `.release-type-badge`, `.package-tag`, `.summary-tag`, `.status-badge` | Semantic color coding |
| Empty state | `.empty-state` | Centered icon + text |
| Deploy purpose | `.deploy-purpose-btn` | Large selectable cards |
| Package card | `.pkg-card`, `.pkg-badge`, `.pkg-card-actions` | Grid of package items |
