# SmartPosTEF Package Manager - Design System (Agent-Ready)

Version: 3.7.3
Framework: Tauri v2 (Rust + Vanilla JS)
Primary stylesheet: src/styles/main.css
Primary UI logic: src/app.js
UI shell: src/index.html

## 1. Purpose

This document is the implementation contract for reproducing the SmartPosTEF visual language in another application (for example, a .NET web app).

Priority order for fidelity:

1. Theme tokens and semantic mappings
2. Surface recipe (glassmorphism)
3. Layout shell and spacing scale
4. Component states and micro-interactions
5. Responsive behavior

If a target stack cannot exactly match one effect (for example backdrop blur differences), preserve hierarchy and contrast relationships first.

## 2. Non-Ambiguous Source Of Truth

Use these files as authoritative:

- src/styles/main.css
- src/index.html
- src/app.js

If this document and code differ, code wins.

## 3. Visual Philosophy

The UI is translucent glass over a layered atmospheric background.

Core principles:

- Depth from translucent layers, not opaque blocks
- Color decisions driven by theme tokens only
- Subtle but frequent motion (hover, expand, toast lifecycle)
- Strong semantic color language for status and risk actions

## 4. Theme System

Theme is applied through data-theme on html and body.

Shipped themes:

- purple-night (default, dark)
- ocean-storm (dark)
- rose-gold (dark)
- emerald-shadow (dark)
- teal-glow-light (light)
- lavender-breeze (light)
- sunrise-warm (light)
- arctic-blue (light)

Theme switch behavior is implemented in src/app.js (initThemeToggle and setTheme).

### 4.1 Required Tokens Per Theme

Every theme defines these tokens:

- --primary
- --primary-light
- --secondary
- --secondary-light
- --gradient
- --bg-primary
- --bg-secondary
- --bg-tertiary
- --bg-card
- --gradient-bg
- --sidebar-bg
- --card-hover-bg
- --input-bg
- --text-primary
- --text-secondary
- --text-muted
- --border-color
- --border-light
- --border-highlight
- --accent-glow
- --mesh-1
- --mesh-2
- --mesh-3
- --icon-color
- --heading-color
- --link-color
- --badge-bg
- --badge-text
- --date-icon-filter

Some themes also define optional tokens used by specific sections:

- --accent
- --accent-bg
- --accent-border
- --card-body-bg

### 4.2 Theme Reference Values

Dark themes:

- purple-night: primary #a064ff, secondary #e040a0, bg #0a0618
- ocean-storm: primary #38bdf8, secondary #2dd4bf, bg #050d1a
- rose-gold: primary #f47a8a, secondary #f5c542, bg #1a0c12
- emerald-shadow: primary #34d399, secondary #a3e635, bg #050f0a

Light themes:

- teal-glow-light: primary #00897a, secondary #00695c, bg #d8eef4
- lavender-breeze: primary #7c3aed, secondary #c026d3, bg #ede8f8
- sunrise-warm: primary #ea580c, secondary #dc2626, bg #fef2e8
- arctic-blue: primary #0284c7, secondary #7c3aed, bg #e8f4f8

## 5. Global Tokens

Defined in :root:

- --sidebar-width: 260px
- --radius-sm: 4px
- --radius-md: 8px
- --radius-lg: 12px
- --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5)
- --success: #22c55e
- --warning: #f59e0b
- --error: #ef4444
- --info: #3b82f6

## 6. Typography

Base stack:

- -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif

Monospace usage:

- Primary monospace: SF Mono, Fira Code, Cascadia Code, monospace
- Some tool blocks explicitly use Courier New, monospace

Critical sizes:

- .app-title h1: 1.125rem / 700
- .page-header h2: 1.75rem / 700
- .card h3: 1.125rem / 600
- .release-version-text: 1.375rem / 600
- body form labels and inputs: 0.875rem
- toast message: 0.8125rem
- badges/tags: 0.75rem and below

## 7. Layout Contract

App shell:

- .app is display:flex, height:100vh, overflow:hidden
- Sidebar fixed width via --sidebar-width
- Main content is scrollable with scrollbar-gutter: stable
- .page hidden by default, .page.active shown
- Active page max width: 1200px centered

Background layers:

- .app::before uses four radial mesh gradients from --mesh-* tokens
- .app::after uses low-opacity procedural noise texture

## 8. Glassmorphism Recipe (Must Match)

Use this treatment on cards, toasts, modals, and many secondary surfaces:

- Semi-transparent background (var(--bg-card))
- backdrop-filter blur with saturation boost
- 1px border using var(--border-color)
- Light edge highlight on top and left
- Soft external shadow plus subtle inset highlight

Blur levels used across the system:

- Sidebar: blur(40px) saturate(1.6)
- Cards, modals, toasts: blur(32px) saturate(1.4)
- Secondary buttons: blur(20px)
- Inputs: blur(12px)

## 9. Components

### 9.1 Cards

- .card is the base container
- 12px radius, 1.5rem padding, 1.5rem bottom margin
- Has top-left highlight edge and inset top glow

### 9.2 Buttons

Required variants:

- .btn-primary
- .btn-secondary
- .btn-outline
- .btn-ghost
- .btn-danger
- .btn-success
- .btn-delete-release
- .btn-purge-release

Sizes:

- .btn default
- .btn-sm
- .btn-icon

### 9.3 Inputs

- Shared style for text, password, number, date, select, textarea
- Focus: border-color var(--primary) + glow ring
- textarea min-height 120px

### 9.4 Sidebar Navigation

- .nav-item has default, hover, active states
- Active uses var(--gradient) and white foreground

### 9.5 Toasts

- Container top-right fixed
- Cascade overlap by -60px when multiple
- On container hover, stack expands
- Types: success, error, warning, info
- Error toast adds shake animation
- Progress bar runs 6s by default

### 9.6 Modals

- .modal-content uses full glass recipe
- Default width 80%, max-height 80vh
- Confirm dialogs use semantic header gradients (danger/warning/info)

### 9.7 Expandable Release Cards

- .release-card-expandable (borderless glass body)
- Header + collapsible body
- Chevron rotates 180 degrees when expanded
- Action row includes generate/export/edit/expand/purge/delete

### 9.8 Badges And Tags

- .release-type-badge
- .package-tag with specific subtype classes
- .summary-tag
- .status-badge with pending/uploading/success/error

### 9.9 Accordion

- .accordion-group, .accordion-item, .accordion-header, .accordion-body
- Chevron rotates 90 degrees on expand
- Platform icon blocks are 28px

### 9.10 Toggle Switch

- 36x20 shell
- 12px knob
- Checked state shifts knob by 16px and changes slider color to primary

### 9.11 Loading Spinner

- 40x40 ring
- 4px border
- top border uses accent
- spin animation 0.8s linear infinite

### 9.12 Tabs

Implemented tab patterns include:

- Solid active tabs (notes style)
- Underline active tabs (platform style)
- Bottom-border note tabs

### 9.13 Deploy Mode Selector (Naming Important)

Current implementation naming is deploy mode, not deploy purpose:

- .deploy-mode-selection
- .deploy-mode-btn
- .deploy-mode-content

When porting to another app, keep behavior and visuals. Class names may differ, but semantics must match.

### 9.14 Package Cards

- .pkg-card with border, 8px radius, 1rem padding
- Hover shifts emphasis to primary border
- Includes title/actions, badge row, action row

## 10. Iconography

The app uses both systems:

- Inline SVG icons (majority)
- Material Symbols font in selected areas

Do not assume SVG-only implementation.

Sizing guidance:

- Nav icons: 20
- Default button icons: 18
- Small button icons: 14
- Meta icons: 14
- Empty state icons: 48
- Confirm dialog icon: 36 inside 64 circle

Logo treatment:

- Masked SVG logo with gradient fill and glow

## 11. Motion And Timing

Key transitions and animations:

- Common transition timing: 0.2s
- Card hover transition: 0.3s
- Toast slide-in: 0.4s
- Toast pulse: 0.6s
- Toast slide-out: 0.3s
- Toast shake: 0.5s
- Toast progress: 6s
- Spinner: 0.8s linear infinite

## 12. Responsive Behavior

Breakpoints currently used:

- 900px
- 768px
- 600px

Important mobile adaptations:

- Deploy mode selection becomes vertical
- Export/import layout becomes stacked and centered
- Welcome feature grid collapses from 3 to 2 to 1 columns
- ASCII converter grid collapses to 1 column at 768px

Sidebar remains desktop-first in concept but app window is resizable.

## 13. Color Semantics

Shared semantic colors:

- Success: #22c55e
- Warning: #f59e0b
- Error: #ef4444
- Info: #3b82f6

Use these consistently across badges, toast borders/glows, status chips, and destructive actions.

## 14. Implementation Checklist For External Agents

Use this exact sequence when restyling a target app:

1. Create a token layer with all required theme and global variables.
2. Apply app shell layout (sidebar + scrollable main + centered pages).
3. Implement glass surface recipe and verify blur, border, and inset highlight.
4. Implement component set in this order: card, button family, inputs, nav, modal, toast, accordion, tags, toggle, package card.
5. Add motion timings and keyframes.
6. Add responsive breakpoints at 900, 768, 600.
7. Run visual parity pass against this checklist.

## 15. Acceptance Criteria (Visual Parity)

A port is considered faithful only if all are true:

- Eight themes exist and switch correctly at runtime.
- Gradient mesh background plus noise layer is present.
- Glass surfaces preserve translucency and blur hierarchy.
- Primary components match spacing, radius, border, and state behavior.
- Toasts cascade, expand on hover, and use semantic glows.
- Accordion, release cards, and deploy mode cards reproduce expand/hover behavior.
- Semantic colors map correctly to success/warning/error/info states.
- Responsive behavior matches 900/768/600 adaptations.

## 16. Suggested Prompt For Another Agent

Use this prompt to reduce ambiguity when asking an agent to restyle a .NET app:

Restyle this application to match SmartPosTEF visual parity.
Treat DESIGN-SYSTEM.md as implementation contract and keep strict token semantics.
Implement all tokens first, then shell layout, then components in checklist order.
Match glass recipe and animation timings exactly.
Support both inline SVG usage and Material Symbols where appropriate.
Use breakpoints at 900, 768, and 600.
At the end, return a parity report with Passed/Failed for each acceptance criterion.

## 17. Notes On Accuracy

This document is aligned with current project version 3.7.3 and current implementation patterns in src/styles/main.css, src/app.js, and src/index.html.

If you change component naming, theme values, icon strategy, or breakpoints in code, update this document in the same commit.
