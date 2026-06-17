# Changelog

All notable changes to SmartPosTEF Package Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.7.2] - 2026-06-08

### Changed

- **Settings tab consistency**: Updated the Custom Devices tab icon to follow the same thin stroke SVG style as the other Settings tabs.

- **Custom Devices tab icon redesign**: Changed the icon from a plain monitor to a monitor with a plus sign inside to better communicate "add/manage devices".

- **Custom Devices panel title cleanup**: Removed the icon from the Custom Devices card title so the heading matches the visual style of other Settings cards.

- **Release Summary (Embedded/S920) signature parity**: Embedded S920 rows now display the same signature context as STA/A2A package rows, including signature/client badges and signed/unsigned icon rendering.

- **S920 signed filename support expanded**: Parser and frontend detection now recognize signed S920 filenames with optional signer segment before `_sign` (for example `...-Martins_sign.zip`, `...-Entrepay_sign.zip`, `...-TecToy_sign.zip`).

- **Upload behavior parity (Edit Release vs New Deploy)**: Edit Release uploads now run through the same upload pipeline used by New Deploy, including all special package handling branches (online companion extraction, S920 extract-root flow, APK zip-before-upload rules, and shared base URL propagation).

- **SPF parity on release update**: Updating an existing release now follows the same SPF conventions used during new release finalization, including companion filtering, full package-derived SPF version usage, and synchronized SPF filename metadata updates.

### Fixed

- **Settings sidebar icon color mismatch**: Corrected Custom Devices tab icon coloring so inactive, hover, and active states match the same color behavior used by the other Settings tab icons.

- **Tauri dev startup schema error**: Removed unsupported NSIS keys from `tauri.conf.json` (`installerIcon`, `uninstallerIcon`, `installerHooks`) to allow `tauri dev` hot reload to start successfully.

- **S920 signer metadata propagation**: When a signed S920 filename includes a signer name, signature/client metadata is now propagated through scan/import flows so Release Summary badges and icon state stay consistent.

## [3.7.1] - 2026-06-05

### Changed

- **Thinner icons**: Reduced `stroke-width` from `2` to `1.5` across all inline SVG icons in `index.html` and `app.js`. Proportionally reduced bolder variants (`2.5` → `2`, `3` → `2.5`). Added global CSS `stroke-linecap: round` and `stroke-linejoin: round` for consistent rounded line endings.

- **Material Symbols weight**: Set global `font-variation-settings: 'wght' 100` for thinner Material Symbol icons.

- **Nav icon updates**: Replaced Tools nav icon (wrench → `extension` Material Symbol), Pwd Gen nav icon (lock → `password_2` Material Symbol).

- **Settings nav icon**: Replaced gear Material Symbol with inline SVG gear using `stroke-width="1.5"` to match all other nav icons.

- **Connections tab icon**: Replaced filled SVG with stroke-based outline network icon.

- **Custom Devices moved to Settings**: Removed the standalone "Advanced Options" page and nav item. Custom Devices is now a tab within the Settings page, placed between "Data Export/Import" and "Paths & Logs".

- **Custom Devices tab icon**: Replaced `add_to_queue` Material Symbol with inline SVG monitor icon matching other settings tabs.

## [3.7.0] - 2026-06-03

### Added

- **Welcome page**: New home/landing page displayed on app start, featuring a features grid highlighting key capabilities and a changelog section showing the latest 2 release entries parsed from `CHANGELOG.md` (read via Tauri backend at compile time).

- **Deploy nav dropdown**: Converted the flat "New deploy" nav item into an expandable "Deploy" dropdown group with three sub-items: "New" (release from scratch), "Upload" (upload only), and "Import" (import release).

### Changed

- **Deploy page restructured**: Removed the purpose selection screen and back button from the deploy page. "New" and "Upload" now navigate directly to the deploy form with appropriate title/subtitle and visible/hidden sections pre-configured.

- **Deploy page shared state**: "New" and "Upload" share the same deploy page (`page-deploy`) with dynamic title/subtitle and section visibility, while "Import" uses its own dedicated page (`page-deploy-import`).

- **Upload nav icon**: Replaced the generic upload arrow icon with Material Symbols "backup" icon (cloud with arrow up) for the Deploy → Upload nav item.

### Fixed

- **Welcome page Settings icon**: Completed the truncated SVG gear path for the Settings feature card.

## [3.6.0] - 2026-06-03

### Added

- **Tools nav dropdown**: Converted the flat "Tools" nav item into an expandable dropdown group (same UX as the Build group), with sub-items for each tool. New tools can now be added as children without UI redesign.

- **ASCII to Hex converter**: New tool page (`Tools → ASCII to Hex`) with a 2×2 grid of textareas for Text (ASCII/ANSI), Hexadecimal, Base64, and Decimal. Type in any field, click Convert, and the other 3 update automatically. Includes per-field Copy/Clear buttons and a Clear All button.

### Changed

- **Daily Password Generator renamed**: Tool is now called "Releases Portal Pass Generator" with nav label "Pwd Gen" to better reflect its purpose.

- **Tools restructured into sub-pages**: Each tool is now a separate page under the Tools dropdown (`tools-pwd`, `tools-ascii`) instead of cards on a shared page.

## [3.5.1] - 2026-06-03

### Changed

- **A2A Build: Modern platform chips**: Converted A2A platforms section from standard checkboxes to selectable pill-shaped chips (matching STA build page style).

- **A2A Build: Device selection by manufacturer**: Replaced flat device checkbox list with column-based groups by manufacturer (Pax, Gertec, Sunmi, Verifone, Positivo, Ingenico), matching the STA device layout.

- **A2A Build: TefSdk Startup Type**: Added "Manual" option alongside "Auto"; applied custom themed dropdown styling; dropdown now shows/hides based on platform selection.

- **A2A Build: Defaults**: "Build all android devices" unchecked by default.

- **Build pages: Button alignment**: Branch refresh button and Restore Defaults button now stretch to match the height of adjacent elements.

- **Build Parameters Modal**: Improved "activated" badge for Android Devices with subtle green border, glow effect, and SVG checkmark icon for better visibility.

### Added

- **A2A platform/device toggle logic**: Added `setupA2aPlatformsRules()` and `setupA2aDevicesRules()` JS functions with mutual exclusion (All ↔ individual) and TefSdk visibility control.

## [3.5.0] - 2026-06-03

### Added

- **Build Parameters Modal**: "View Parameters" button on all recent builds (STA/A2A) that fetches pipeline parameters on-demand via Azure Pipelines Runs API. Modal displays build number in header (`Build #20260602.10`), filters out false/off booleans and noise keys (separators, descriptions, intent), and presents active parameters in a categorized chip/tag layout (General, Platforms, Build Options, Features, Android Devices).

- **Theme accent color system**: New `--accent`, `--accent-bg`, and `--accent-border` CSS custom properties added to all 8 themes, providing consistent accent styling for interactive elements (params button, chips, tags).

- **Themed release summary background**: New `--card-body-bg` variable for light themes replaces the plain gray `rgba(0,0,0,0.15)` overlay in expanded release cards with theme-colored tints (teal, purple, orange, blue).

### Changed

- **STA/A2A nav icons redesigned**: STA icon now depicts a POS terminal with screen, 2-row keypad, and a card being inserted from the bottom. A2A icon is the 4-square grid with top-right diamond. Both use thinner strokes (`stroke-width: 1.5`). A2A icon reduced to 10x10 for better visual balance.

- **Lavender Breeze accent color**: Changed from burnt orange (`#e67e22`) to dark purple (`#5b21b6`) to match the theme's identity.

- **Build history text visibility**: Changed `--text-muted` to `--text-secondary` for build history meta items, dates, and build numbers for better contrast across all themes.

### Fixed

- **Invisible text in light themes**: Removed all `color-mix()` CSS function calls which are not supported in the Tauri WebView (older WebKit). Replaced with pre-computed rgba custom properties (`--accent-bg`, `--accent-border`). This was causing entire property declarations to silently fail, making text invisible in Lavender Breeze, Teal Glow Light, and other light themes.

- **Missing `--bg-primary` in themes**: Restored accidentally removed `--bg-primary` variable to all 8 themes after bulk search-replace operation.

## [3.4.0] - 2026-06-02

### Added

- **Azure DevOps Build Integration**: New STA and A2A build pages with pipeline trigger UI, real-time build monitoring, and recent builds history from Azure Pipelines REST API v7.1.

## [3.3.20] - 2026-06-01

### Added

- **Undo/Redo keyboard shortcuts**: Ctrl+Z (undo) and Ctrl+Y (redo) now work in all text inputs, password fields, and textareas across the app.

- **Clear button on input fields**: All text inputs, password fields, and textareas now have an "X" clear button that appears when the field has content. Clicking it clears the value and re-triggers any dependent logic (e.g., search filtering).

### Fixed

- **Search clear button icon alignment**: Fixed `.releases-search-wrapper svg` selector applying position styles to the clear button SVG by scoping it to direct child only (`> svg`).

## [3.3.19] - 2026-06-01

### Fixed

- **ZIP cleanup after APK upload**: Temporary `.zip` files generated when zipping APKs for STA upload are now automatically deleted after the upload attempt (success or failure), preventing leftover files in the source directory.

- **Release version now saves user-typed value**: The version displayed in the releases list now reflects exactly what the user typed in the version input, instead of being overridden by the auto-detected version with hash. The full version with hash is still used for SPF file content and filename generation.

- **Help modal icon vertical alignment**: Material Symbols icons in the "Icons & Indicators" help table are now vertically centered with their adjacent text labels.

- **Generated HTML packages-col height increased**: The packages column `max-height` in generated HTML output increased by 35% (from `calc(100vh - 6rem)` to `calc(100vh - 3.9rem)`), providing more visible content area.

- **Generated HTML light mode packages-col background**: The packages column background in light mode is now lighter and more discreet (`rgba(245,242,255,0.45)` instead of `rgba(240,235,255,0.65)`).

### Added

- **`delete_file` Rust command**: New backend command to delete a file at a given path, used for temporary zip cleanup.

## [3.3.18] - 2026-06-01

### Added

- **Uninstaller custom icon**: Added `uninstallerIcon` to NSIS config so the Windows uninstaller (`uninstall.exe`) displays the app's custom icon instead of the default NSIS icon.

- **Window icon at runtime**: Application window now sets the taskbar/title bar icon programmatically via `set_icon()` using the 256×256 PNG, ensuring correct icon display across all platforms.

- **Signature exemption for TefSdk, Doc, AAR packages**: Packages from TefSdk, Doc, AAR, SDK Integration, orphan PaymentExample, and TefSdk PaymentExample are now exempt from signature requirements — they no longer show the `encrypted`/`encrypted_off` icon in release summary and do not affect the release-level signed/unsigned badge.

- **New A2A PaymentExample filename format**: Detection now supports `PaymentExample-A2A-{P|D}-{device}-{version}+{hash}-release.apk` (device-specific format with `-A2A-` separator), in addition to the existing `.A2A.` dot-separated format.

### Changed

- **Tauri upgraded to 2.11**: Updated `tauri` crate (2.11.2), `tauri-cli` (2.11.2), and `@tauri-apps/api` (2.11.0) from 2.10.x. Enables `uninstallerIcon` support and adds `image-png` feature.

- **Icon file regenerated**: `icon.ico` rebuilt with higher quality/larger embedded sizes (91KB → 202KB).

### Fixed

- **JFrog path `None` for orphan/TefSdk PaymentExample (Rust)**: When a PaymentExample package doesn't match DEVICE_MAP (e.g., TefSdk PaymentExample or orphan), the Rust backend now assigns a correct fallback JFrog path (`packages/[dev/]app-to-app/payment_example/`) instead of returning `None`.

- **`buildJfrogPath` ordering (JS)**: Payment example check moved before TefSdk check to prevent TefSdk from swallowing PaymentExample packages into the wrong path.

- **Help modal — outdated icons replaced**: Replaced all inline SVG icons in the "Icons & Indicators" section with actual Material Symbols (`publish`, `storefront`, `science`, `encrypted`, `encrypted_off`, `calendar_today`, `schedule`) matching the real UI.

- **Help modal — non-existent Edit action removed**: Removed "Edit" from Advanced → Custom Devices help section (only Add/Delete exist in the actual UI).

- **Generated HTML — client section icon**: Replaced the SVG icon in client-specific group headers with the `storefront` Material Symbol matching the release list page. Added Material Symbols Outlined font to the generated HTML `<head>`.

## [3.3.17] - 2026-05-29

### Added

- **Release Summary — signed/unsigned icon**: New `sigIcon()` helper renders a Material Symbol icon (`encrypted` / `encrypted_off`) with green/red coloring and a tooltip on each package in the release summary, replacing the need to read badge text to determine signature status.

- **`normalizeDeviceKey()` function**: New canonical device key normalizer that strips non-alphanumeric characters and uppercases the result (e.g., `P2_LITE_SE`, `P2-Lite-SE` → `P2LITESE`). Includes an alias table (`P2LITE → P2LITESE`). Used consistently across `DEVICE_MAP` lookups, grouping, and display normalization.

- **`lookupDevice()` helper**: Wraps `DEVICE_MAP` lookup via `normalizeDeviceKey()` so all lookup sites (STA and A2A branches of `buildJfrogPath()`, release summary grouping) use the same normalization path.

- **HTML Generation Settings — Reset to Default button**: New "Reset to Default" button in the HTML Generation Settings card restores title, subtitle, primary color (`#2e1773`), and secondary color (`#2f2256`) to their built-in defaults with a single click.

### Fixed

- **Finalize button stays disabled after re-scan**: `btnFinalizeRelease` and `btnFinalizeDeployOnly` now explicitly set `.disabled = false` when all uploads succeed, fixing the regression where the button would remain greyed out after fixing filenames and re-uploading.

- **A2A Release Summary — device-centric grouping**: Device APKs and PaymentExample examples are now merged into a single section grouped by device, displayed using the same `sta-device-group` card layout as STA. Examples are matched to their device group using `pkg.device` (SPF field) first, falling back to URL filename parsing only when the field is empty. Two labeled sub-headers added: **"Integration"** (SDK/Doc) and **"A2A Packages"** (device groups + orphan examples).

- **SPF import — signature fallback detection**: When an SPF line has an empty signature field, the parser now inspects the URL filename for `_sign.` or `_sign/` and auto-sets `"Signed"`, preventing unsigned display on signed packages imported from older SPF files.

- **`renderPlatformTabs()` duplicate tabs**: Platform tab grouping now uses `normalizeDeviceKey()` instead of the raw device string, preventing duplicate tabs when the same device appears with different separator styles.

- **`DEVICE_MAP` underscore keys**: Removed keys with underscores (`P2_LITE_SE`, `P2_MINI`, `L3_2024`, `X990_PRO`, `X990_UX`) — all lookups now go through `normalizeDeviceKey()` which strips underscores before matching, so both forms resolve correctly.

- **`normalizeDeviceName()` / `normalizeA2ADisplayName()` expanded**: Both functions now use `normalizeDeviceKey()` for map lookups and cover additional devices: `EX4000`, `GPOS700`, `L300`, `L400`, `P2MINI`. `P2LITESE` display name corrected to `"P2 Lite SE"` (was `"P2 Lite"`).

- **HTML Generation Settings not persisted**: `populateSettings()` now reads `htmlTitle`, `htmlSubtitle`, `primaryColor`, and `secondaryColor` from `portalSettings` and populates the form fields on load. `saveSettings()` now writes all four fields back to the settings object.

### Changed

- **HTML Generation default colors updated**: Default primary color changed from `#48297c` to `#2e1773` and secondary from `#9c2671` to `#2f2256` — deeper/darker purple palette that matches the app's current design direction.

- **`PortalSettings` struct (Rust)**: Added four new serde-mapped fields — `htmlTitle`, `htmlSubtitle`, `primaryColor`, `secondaryColor` — all with `#[serde(default)]` for backward compatibility.

- **`generate_html_content()` (Rust)**: Page title and subtitle now prefer the new `htmlTitle`/`htmlSubtitle` fields over the legacy `portalTitle`/`companyName`. The `--primary` and `--secondary` CSS variables in generated HTML are now injected from user settings (with `rgba()` dim variants computed from RGB decomposition) instead of being hardcoded.

## [3.3.16] - 2026-05-28

### Changed

- **Release list icons — Material Icons**: Replaced custom SVG path icons with Google Material Symbols (`publish` for deploy-only, `storefront` for production, `science` for development, `encrypted`/`encrypted_off` for signed/unsigned).

- **Unsigned detection — Android filename check**: `isReleaseUnsigned()` now checks all STA and A2A package filenames for the `_sign` suffix, regardless of file extension (`.apk`, `.zip`, or none). If any Android package in a release lacks `_sign` in its filename, the release is marked as unsigned.

- **A2A release summary — client signing badges**: Device APK packages in A2A release summary now display signature (blue) and client (green) badges, matching the existing STA badge behavior.

- **Release tabs — simplified**: Removed the "Unsigned Prod" tab. Tabs are now: All, Deploys, Development, Production. The Production tab shows all production releases; signed/unsigned status is communicated via the lock icon on each card.

## [3.3.15] - 2026-05-27

### Fixed

- **HTML device-card separators — explicit divider element**: Replaced unreliable CSS border-based separators (`border-top`, `border-bottom`, `+` sibling selector) with an explicit `<div class="device-divider">` HTML element emitted after every device-card. This fixes inconsistent separator rendering caused by CSS specificity conflicts, flexbox `gap` interactions, and `:last-child`/`:first-child` edge cases in Tauri's WebKitGTK. Dividers now appear reliably in all sections (TEF, Smart POS, A2A, Embedded) including single-device manufacturers.

- **HTML packages-col CSS cleanup**: Removed complex border override chain (`.device-stack{gap:0}`, `.device-card+.device-card{border-top}`, `.device-card:last-child{border-bottom:none}`, `.device-card-head{border-bottom}`) and replaced with a single `.packages-col .device-divider{height:1px;background:var(--border);margin:.4rem 0}` rule.

- **HTML variant-row/pkg-row borders removed inside packages-col**: Stripped `border-bottom` from `.variant-row` and `.pkg-row` elements inside the packages column to prevent lines between individual packages within a device-card.

- **HTML device-card hover refinement**: Made hover background more subtle (`rgba(160,100,255,0.06)` instead of `var(--primary-dim)`) and added `border-radius:6px` to the card for smooth highlight clipping.

## [3.3.12] - 2026-05-26

### Fixed

- **Generate icon — box replaced with shuffle**: The Generate button in Client Mappings (Settings) and its corresponding help modal entry were using a 3D box/cube SVG that rendered as an unrecognizable square at small sizes. Replaced with the Feather shuffle (crossed arrows) icon, which clearly conveys "auto-generate/mix" and renders well at 14–16px.

## [3.3.11] - 2026-05-25

### Fixed

- **Help content — Settings fully documented**: Expanded the Settings help from 3 incomplete sections to 8 comprehensive sections covering all 6 sidebar tabs:
  - **Preferences**: Theme grid with 8 themes (4 dark + 4 light), instant apply, localStorage persistence
  - **JFrog**: API Key (encrypted, eye toggle), Base URL, Default Repository
  - **Client Mappings**: Built-in locked rows, custom rows, Add Mapping, Generate code (DJB2), delete
  - **HTML Generation Settings**: Page Title, Subtitle, Primary/Secondary Color pickers with hex sync
  - **Data Export/Import**: Export/Import buttons, 5 selectable categories, JSON format
  - **Paths & Logs**: 4 directory paths with Open Folder buttons, View Logs modal
  - **Save Settings**: Explains the action bar save button vs auto-saving operations

- **Help content — emojis replaced with SVG icons**: All emoji characters (🟢, 🔴, ⏳, 🔒, 🎲) replaced with inline Feather-style SVG icons using semantic colors (`#22c55e`, `#ef4444`, `#f59e0b`) or `currentColor` for theme compatibility.

## [3.3.10] - 2026-05-25

### Fixed

- **Help modal theme compatibility**: Ensured the contextual help modal renders correctly across all 8 themes (4 dark + 4 light):
  - Replaced hardcoded purple hover glow on the `?` button with `var(--accent-glow)` so it matches each theme’s primary color
  - Added `background: var(--bg-secondary)` to section body for clear contrast against the `--bg-tertiary` summary header
  - Added `border-bottom` on open section summaries to visually separate header from content on light themes
  - Added themed styling for inline `<code>` elements (`var(--bg-tertiary)` bg + `var(--primary)` color)
  - Changed table row borders from `--border-color` to `--border-light` for subtler separation

## [3.3.9] - 2026-05-25

### Added

- **Contextual Help Button**: Added a persistent `?` floating button (bottom-right corner) that opens a modal with rich, context-sensitive help for the current screen. Each page/sub-state has dedicated help content covering:
  - **Purpose** — what the screen is for
  - **Workflow** — numbered step-by-step flow
  - **Icons & Indicators** — table explaining every icon and color meaning
  - **Actions** — what each button/area does when clicked
  - Covers all screens: Deploy (purpose selection, release form, upload-only form), Releases (card icons, kebab menu, expand), Settings (JFrog, client mappings, themes), Tools, Advanced, and Import/Edit Release
  - Help content adapts to Deploy page sub-states (purpose selection vs release form vs upload-only)
  - Sections are collapsible via `<details>` elements for easy scanning

## [3.3.8] - 2026-05-25

### Fixed

- **Release card — meta date/time icons**: Replaced 📅 and 🕒 emoji with proper Material 3 SVG icons (`calendar_today` and `schedule`), rendered inline at 14×14 with `fill="currentColor"` for consistent theming.
- **Release card — kebab button centering**: The three-dot (`⋮`) icon was rendered off-center due to dots positioned at `cx="2"` in a 24×24 viewBox at `width="4"`. Fixed to use `cx="12"` (centered) with `width="16" height="16"`.
- **Release card — kebab menu clipping**: The `overflow: hidden` on `.release-card-expandable` clipped the absolutely-positioned dropdown, hiding the Delete item when the list extended below the card boundary. Removed `overflow: hidden` from the card container and added `border-bottom-left-radius` / `border-bottom-right-radius` to `.release-card-body` so expanded body content still clips to the card's rounded corners.

## [3.3.7] - 2026-05-25

### Changed

- **Release Card Redesign (UI Spec v4)**: Overhauled the release list card layout following the Version Card UI Component Design Specifications v4:
  - **Status icons**: Text badges ("Deploy Only", "Development", "Não assinados") replaced with two inline SVG icons per card — an environment icon (upload arrow / package box / code brackets) and a signature icon (closed lock / open lock). Each icon has a `title` tooltip and uses the existing semantic colors.
  - **Overflow menu**: Export SPF, Purge, and Delete moved out of top-level buttons into a `⋮` kebab dropdown (`release-kebab-menu`). Purge is amber, Delete is red. Clicking outside the menu closes it via a single document-level listener.
  - **Expand button**: Now icon-only (chevron SVG, no text label). Chevron rotates 180° on expand via CSS `rotated` class toggle.
  - **Metadata row**: Added `•` bullet separators and `📅` / `🕒` emoji prefixes for Release date and Created time.
  - **Primary actions**: Only "Generate HTML" and "Edit" remain as always-visible top-level buttons.

## [3.3.6] - 2026-05-25

### Added

- **Description in Generated HTML**: The release description is now rendered in the exported HTML page, displayed as an italic line below the release date in the version header. Hidden entirely when the description is empty.

## [3.3.5] - 2026-05-25

### Added

- **HTML Generation for Deploy-Only Releases**: Deploy-only releases can now have HTML generated. Removed the `releaseType !== 'deploy-only'` guard on the "Generate HTML" button in the releases list, and removed the deploy-only exclusion filter from the Tools → Generate HTML dropdown. The generated HTML displays the type label as "Deploy Only" (previously the raw value `"deploy-only"` would have been shown).

## [3.3.4] - 2026-05-25

### Added

- **Description Field for Deploy-Only Creation**: The "Upload Information" card in the New Deploy → Deploy Only flow now includes a Description field (`#upload-description`). The value is saved to `releaseData.description` and cleared when the deploy screen resets after finalization.

## [3.3.3] - 2026-05-18

### Added

- **Built-in Locked Client Mappings**: Six client mappings (Lyra:788, Unica:877, B1:6649, Valori:867, Bin:677, Basa:668) are now hardcoded into the app and always present from installation. They are injected at startup via `ensureBuiltinMappings()`, which removes any stale stored copies by name and prepends fresh built-in objects so the Rust backend always reads them from the settings file. In the Settings UI, built-in rows are rendered as read-only (disabled inputs, lock icon, no generate/remove buttons). On save, any custom mapping whose name duplicates a built-in is automatically removed with a warning toast.

## [3.3.2] - 2026-05-18

### Fixed

- **Deploy-only SPF Import Type Detection**: Importing a `.spf` file with `type=deploy-only` in `<release_info>` was incorrectly mapped to `'Production'` because the parser only had a two-way check (`development` vs. else). Added an explicit `deploy-only` branch so the type is preserved correctly. As a result, the Import page now hides the Release Notes card and shows the "Save Deploy" button (instead of "Save Release") when importing a deploy-only SPF.

## [3.3.1] - 2026-05-18

### Fixed

- **Deploy-only Edit Flow**: Editing a deploy-only release from the Releases list now hides the Release Notes card (irrelevant for deploy-only) and shows "Update Deploy" / "Save Deploy" instead of "Update Release" / "Save Release". The save logic already preserved the `deploy-only` type correctly and was not changed.

## [3.3.0] - 2026-05-18

### Added

- **Retry All Failed Button**: New "Retry All Failed" button (amber, shown when any package has a failed upload) retries all failed packages in sequence using the same upload logic as Upload All. Shows a summary toast on completion. The button is hidden when there are no failures and automatically re-evaluates after each retry.

- **Configurable JFrog Base URL**: The JFrog Base URL configured in Settings is now actually used by the Rust upload backend. Previously the backend hardcoded `https://artifactory.aditum.com.br/artifactory` in all three upload commands (`upload_to_jfrog`, `extract_and_upload_to_jfrog`, `extract_root_and_upload_to_jfrog`). Now each command accepts an optional `base_url` parameter passed from the frontend; falls back to the original default when not set.

- **Client Mapping Auto-Generate Number**: Each client mapping row now has a **Generate (→) button** that deterministically derives a 3-digit decimal code from the client name using the DJB2 hash algorithm (uppercase input, `hash = hash × 33 + charCode`, mod 1000, zero-padded). The result is collision-safe — if the generated code already exists in another mapping it increments by 1 (mod 1000) until a free slot is found. The number field remains manually editable.

### Fixed

- **Finalize Release Button Disabled After Re-Scan**: After uploading packages where some failed, fixing filenames, and re-scanning the folder, the Finalize Release button would remain disabled even after successfully re-uploading all packages. Root cause: `scanSelectedFolder()` replaced the `packages` array with fresh objects from the scan result, losing all `uploaded`/`url` state. Fixed by restoring upload state from the persistent `uploadedUrls` map immediately after the new array is assigned.

### Changed

- **Client Mapping Row Layout**: Reordered the mapping row from `[Number][Name][✕]` to `[Name][→][Number][✕]` to match the natural data-entry flow (type the name, generate the code, optionally edit it).

## [3.2.8] - 2026-04-10

### Fixed

- **SPF Drag & Drop on Import Page**: Fixed drag-and-drop of `.spf` files not working on Linux. HTML5 `e.dataTransfer.files` is always empty on WebKitGTK (Tauri's Linux webview) for OS file drops. Replaced HTML5 drag-drop handlers with Tauri v2's native drag-drop event API (`tauri://drag-enter`, `tauri://drag-drop`, `tauri://drag-leave`), which provides file paths directly. The dropped file is read via the existing `read_file_content` Rust command. Also removed the full-screen global drop overlay in favor of the import-page card drop zone.

## [3.2.7] - 2026-04-10

### Fixed

- **SPF Drag & Drop on Import Page** (incomplete): Initial attempt using `dragDropEnabled: false` — only works on Windows, not Linux.

## [3.2.6] - 2026-04-10

### Added

- **Global SPF Drag & Drop**: Drop an `.spf` file anywhere in the app to import a release. A full-screen overlay with glassmorphism backdrop appears when dragging a file over the window, guiding the user to drop. Automatically navigates to the import page and triggers the existing SPF import pipeline.

## [3.2.5] - 2026-04-10

### Fixed

- **Unsigned Production File Naming**: SPF and HTML filenames for unsigned production releases now use `-unsigned` prefix instead of `-prod`. The `-prod` prefix is reserved for signed production releases only. Added `getTypeShort()` (JS) and `get_type_short()` (Rust) helpers that check package URLs for `/unsigned/` path to determine the correct prefix.

## [3.2.4] - 2026-04-10

### Added

- **Segregated Export/Import**: Export and import are now selective — a modal with toggle switches lets users choose which data categories to include: Releases (+ SPF files), Default Theme, JFrog Settings (encrypted API key), Client Mappings, and HTML Settings. Export format bumped to v3 with an `"included"` map; v2 backups remain importable. On import, unavailable categories are shown as disabled. Settings use a partial-merge strategy so unselected fields are preserved.

### Fixed

- **Export/Import Modal Scroll**: Fixed the category selector modal cutting off footer buttons on smaller screens by adding scrollable body with `max-height: 90vh`.

## [3.2.2] - 2026-04-09

### Added

- **Purge Button**: New "Purge" button on release cards that deletes all packages from JFrog one-by-one, then removes the release locally. Uses a flame icon and amber warning color to distinguish from the local-only Delete button.
- **Release Description Field**: New optional text field for release descriptions (subtitle), available in the deploy form, import/edit form, and persisted in SPF files as `description=` in the `<release_info>` section. Displayed as a subtitle on release cards and included in search.

### Fixed

- **Search Icon Hidden**: Fixed the search icon in the Releases toolbar not being visible due to the input background painting over the absolutely-positioned SVG. Added `z-index: 1` to the icon.
- **A2A Client Extraction Bug**: Fixed "Multiple different versions detected" error when scanning A2A folders. A2A device patterns now call `extract_client_from_version()` to strip embedded client codes from the version string.

### Changed

- **Delete Button Tooltip**: Updated the Delete button tooltip from "Delete" to "Delete release from local storage only" for clarity alongside the new Purge button.

## [3.2.1] - 2026-04-09

### Added

- **v2 Package Naming Support**: Full support for the new v2 filename convention using `+hexhash` separator (e.g., `2.5.4+0d05ce0`) across all package types (Windows, Linux 32/64, Embedded S920, STA LP/AP/LD/AD, A2A).
- **A2A v2 Naming**: Support for restructured A2A filenames where `A2A` appears after the package name (e.g., `AditumSdkIntegration-A2A-D-2.4.4+8e450cfb1-release.aar`).
- **Linux Library `.tar` Extension**: v2 Linux library packages now support `.tar` in addition to `.zip`.
- **23 New Regex Patterns**: Added v2 patterns for all platforms in the Rust backend, placed before legacy patterns for priority matching.

### Changed

- **Version Parsing**: `extract_base_version()` (Rust + JS) now handles `+` separator as first-priority split.
- **Signature Extraction**: `extract_signature()` now recognizes v2 signed filenames with hex hashes.
- **SPF Version Format**: `getFullVersionForSpf()` detects hex hashes and uses `ver+hash` format for v2 packages.
- **Frontend Version Detection**: `detectPackageFromFileName()` and SPF import now use cascading regex (v2 → A2A v1 → STA v1).

## [3.2.0] - 2026-04-09

### Added

- **8-Theme System**: Four dark themes (Purple Night, Ocean Storm, Rose Gold, Emerald Shadow) and four light themes (Teal Glow Light, Lavender Breeze, Sunrise Warm, Arctic Blue) with colorful accents, gradient backgrounds, and frosted glass panels.
- **Preferences Tab**: New Preferences tab in Settings with a visual theme grid selector showing live previews for each theme.
- **Vertical Settings Navigation**: Settings page now uses a vertical sidebar layout with icon-labeled tabs.
- **Colorful Accents**: Nav icons, headings, labels, badges, page descriptions, and settings tabs now follow each theme's accent palette.

### Changed

- **Header Logo**: Replaced static white logo with theme-aware SVG that inherits the primary accent color.
- **Preferences Icon**: Changed Preferences tab icon from gear to sliders.
- **Settings Location**: Moved Settings from the main navigation bar to the sidebar footer.

### Removed

- **HTML Generation Page**: Removed the HTML Generation page and its navigation entry.
- **Deploy Purpose Card Wrapper**: Removed the redundant card wrapper and heading from the Deploy purpose section.
- **Theme Toggle**: Replaced the old light/dark toggle with the new 8-theme grid in Preferences.

## [3.1.23] - 2026-04-07

### Changed

- **STA/A2A Toggles Always Visible**: Moved "Has STA" and "Has A2A" filter toggles from the collapsible Filters panel to the main toolbar row, so they are always visible alongside the search bar and sort dropdown.

## [3.1.22] - 2026-04-07

### Fixed

- **A2A Upload Path Missing Subcategories**: `buildJfrogPath()` now routes A2A packages to correct JFrog subpaths: `sdk_integration/` for AAR, `sdk_integration/doc/` for docs, `tef-android/{arch}/` for TefSdk, `payment_example/` for examples, `apk/{mfr}/{path}/` for device APKs. Previously all A2A packages uploaded to the generic `app-to-app/` root.
- **Dev Release Saved as Production**: Fixed disabled `<select>` returning first option value ("Production") instead of the selected value, causing dev releases to silently change to Production when saving.

### Changed

- **Editable Fields in Edit Mode**: Version, date, and release type fields are now fully editable when editing an existing release. A warning toast appears when any critical field is changed instead of requiring a confirmation dialog to unlock.

## [3.1.21] - 2026-04-02

### Changed

- **Link Icon on Package Cards**: Replaced the italic "i" info icon with a chain-link SVG icon on package cards in the Package Management section.
- **JFrog Path Tooltip for New Packages**: Newly-added packages now show their computed JFrog upload path on hover (e.g., `packages/dev/pax/a910/launcher/bin/`) instead of showing nothing.
- **Copy Button URL Tooltip**: The copy URL button in the Release Summary now shows the full JFrog path on hover instead of generic "Copy JFrog URL" text.

## [3.1.20] - 2026-04-02

### Fixed

- **STA Upload Path Structure**: Rewrote `buildJfrogPath()` STA branch to construct proper JFrog paths matching the Rust backend: `packages/[dev/|unsigned/]{manufacturer}/{devicePath}/{launcher|app}/[{client}/]`. Previously used flat `packages/android/{device}/` structure which was wrong.
- **STA Dev Packages Uploaded to Prod Path**: Added `isDev` detection for STA packages (LD/AD prefixes) in `detectPackageFromFileName()`. Previously only `-D-` was detected, missing `-LD-`/`-AD-`.
- **Client Folder Missing from STA Upload Path**: `buildJfrogPath()` now includes the client folder (e.g., `bin/`) when a client mapping is detected from the filename.
- **New Package JFrog Path Not Set**: `addPackagesToRelease()` now immediately computes and sets `pkg.jfrogPath` after detection, so the import preview shows the correct path.

### Added

- **JavaScript DEVICE_MAP**: Added a `DEVICE_MAP` constant (18 entries) matching the Rust device map, mapping device names to manufacturer and path (e.g., `A910→pax/a910`, `P2_LITE_SE→sunmi/p2litese`).

## [3.1.19] - 2026-04-02

### Fixed

- **A2A Signature Detection (Rust)**: Fixed 4 A2A regex patterns to capture optional brand signatures (e.g., `-COTS-`) between the hash and `-release` suffix. Added `(?:-([A-Za-z][A-Za-z0-9_]*))?` capture group to Device APK and PaymentExample patterns (signed and unsigned).
- **extract_signature() A2A Support (Rust)**: Fixed regex to handle A2A version format (`x.x.x.A2A.hash`) by adding `(?:A2A\.)?` alternate pattern.
- **PaymentExample Generic JFrog Path (Rust)**: Fixed production PaymentExample path from `packages/unsigned/app-to-app/payment_example/` to `packages/app-to-app/payment_example/`.
- **Device Name Normalization Corrupting URLs**: Removed `normalizeDeviceName()` from 3 data-capture locations in `detectPackageFromFileName()` where it was corrupting raw device identifiers (e.g., `X990_PRO` → `X990 PRO`) that flow into URL construction. Display normalization now only happens at render time.
- **Light Mode Client Group Dark Background**: Added light-mode CSS overrides for `.client-group` and `.client-group-header` which were using undefined `--bg-elevated` variable.

### Added

- **A2A Display Name Normalizer (Rust)**: Added `normalize_a2a_display_name()` function preserving SE suffix (e.g., `P2_LITE_SE` → "P2 Lite SE", `X990_PRO` → "X990 Pro").
- **A2A Display Name Normalizer (JS)**: Added `normalizeA2ADisplayName()` function matching the Rust version.
- **STA/A2A Mutual Exclusive Toggles**: Checking one filter toggle now unchecks the other.
- **Color Picker Sync Handler**: Added bidirectional sync between color swatch, color input, and text input in Settings.

### Changed

- **Color Picker Redesign**: Replaced standalone color inputs with swatch-preview design: rounded color preview with hidden overlay picker and monospace hex text input.
- **Light Mode Purple Tinting**: Updated ~25 light-mode CSS rules to use a cohesive purple-tinted grey palette instead of neutral greys.
- **Card De-nesting**: Flattened nested card elements (deploy purpose, mappings, paths, export/import, custom devices) using border-bottom separators instead of card-in-card styling.

## [3.1.16] - 2026-03-27

### Added

- **Editable Version/Type on Import/Edit Release**: Version and Release Type fields are now editable when importing or editing an existing release. Clicking the locked field shows a warning dialog: "Alterar a versão de uma release existente pode causar inconsistências. Deseja realmente prosseguir?" — confirming unlocks the field for editing.

### Fixed

- **Release Type Not Detected on SPF Import**: Importing an SPF with `type=development` (lowercase) incorrectly showed "Production" because the JS parser didn't normalize casing to match the capitalized select options. Now normalizes to "Development"/"Production".
- **Release Type Lost When Editing Existing Release**: Editing a saved release always showed "Production" because the backend sends the field as `type` but the frontend expected `releaseType`. Added field name normalization in `initImportReleasePage()`.
- **Edited Version/Type Not Persisted on Save**: Editing version or release type fields and saving did not apply changes because `handleUpdateRelease()` was not reading those values from the DOM form inputs.
- **Missing Copy URL Button on STA Packages**: The copy URL button was not rendered for STA device packages in the Release Summary. Now all STA variant rows include the copy button.

## [3.1.15] - 2026-03-27

### Added

- **Manual JFrog Path Editing**: When a scanned package has an unrecognized format and shows "Path not determined", the path field now becomes an editable text input allowing the user to manually set the JFrog upload path.

## [3.1.14] - 2026-03-26

### Added

- **Copy URL Button in Release Summary**: Added a copy button next to each package in the Release Summary list to quickly copy the JFrog URL to clipboard.

## [3.1.13] - 2026-03-26

### Fixed

- **A2A SDK Integration Duplicate Name**: Fixed Release Summary showing identical "SDK Integration" name for both AAR and Documentation A2A packages. Now correctly displays "SDK Integration" for the AAR and "SDK Documentation" for the Doc package by using `category` field to distinguish them.

## [3.1.12] - 2026-03-26

### Fixed

- **A2A Unsigned Package Paths**: Fixed production unsigned A2A packages (Device APKs and PaymentExample) incorrectly using signed paths like `packages/app-to-app/apk/.../` instead of `packages/unsigned/app-to-app/apk/.../`.

## [3.1.11] - 2026-02-13

### Fixed

- **New Deploy Release Notes Missing**: Fixed v3.1.7 CSS regression that caused release notes textarea to disappear on New Deploy page. Removed conflicting `.notes-content { display: none }` rules that were added for Import Release page but broke New Deploy page.

## [3.1.10] - 2026-02-13

### Fixed

- **Windows TEF Library Category**: Fixed Windows library packages (`AditumTefLibrary-*.zip`) getting "DLL" category. Libraries now have empty category like Linux libraries.

## [3.1.9] - 2026-02-12

### Fixed

- **Linux TEF Library Category**: Fixed Linux library packages (`AditumTEFLib-*.zip`) incorrectly getting "Installer" category. Libraries now have empty category as expected in SPF output.

## [3.1.8] - 2026-02-12

### Fixed

- **Windows TEF Library Detection**: Fixed `AditumTefLibrary-{P|D}-*.zip` files being detected as Unknown/STA instead of Windows TEF Library. Added explicit pattern match in frontend detection before the generic `.zip` fallback.

## [3.1.7] - 2026-02-12

### Fixed

- **Duplicate Release Notes Tabs**: Fixed v3.1.5 CSS regression that caused both Write and Preview tabs to display simultaneously in Import/Edit Release page. Unified the HTML structure to use consistent `.notes-content > .tab-content.active` pattern for both pages.

## [3.1.6] - 2026-02-12

### Fixed

- **S920 Dev Package Extraction**: Fixed bug where Dev S920 packages (`SmartPosTef-D-S920-*.zip`) were incorrectly being extracted like Production unsigned packages. Now only Production unsigned S920 packages are extracted; Dev packages are uploaded directly.

## [3.1.5] - 2026-02-12

### Fixed

- **Release Notes Textarea Missing**: Fixed CSS rule that was hiding the release notes textarea in the New Deploy page. Changed `.notes-content` from `display: none` to `display: block`.

## [3.1.4] - 2026-02-12

### Added

- **JFrog Path Info Tooltip**: Added an italic "i" info icon on package cards that shows the full JFrog path on hover. For pending uploads, shows "(pending upload: filename)".
- **Device Name Normalization**: Added `normalizeDeviceName()` function to normalize device names for display (e.g., `P2LITESE` → `P2 Lite`, `L3_2024` → `L3 2024`). Applied to both A2A and STA packages.

### Changed

- **PaymentExample Card Titles**: Examples now show device name in the title (e.g., "DX8000 PaymentExample" instead of just "PaymentExample").
- **TefSdk Classification**: TefSdk packages are now grouped in the SDK section (not Device APKs) with architecture in title (e.g., "TefSdk v7a", "TefSdk v8a").

### Fixed

- **A2A Package Detection**: Rewrote A2A detection with proper pattern-based extraction for device, category, and signature from filenames.
- **Deleted Packages Still Uploaded**: Fixed bug where packages removed from the import list were still being uploaded. Now properly removes from both `packages` and `newPackages` arrays.
- **JFrog URL Duplication**: Fixed `buildJfrogPath()` to return directory path only (without filename), since Rust backend appends the filename.

## [3.1.3] - 2026-02-12

### Fixed

- **Linux Package Detection**: Added explicit checks for `x86_64`/`amd64` and `i386` architecture patterns as primary Linux detection, fixing issues with Linux packages being detected as "Unknown" when they lack the "linux" keyword or Linux-specific extensions.

## [3.1.2] - 2026-02-11

### Fixed

- **Version Display in UI**: Updated sidebar footer version from hardcoded v3.0.0 to v3.1.2.
- **Browse Files Button Alignment**: Centered the "Browse Files" button in the Import Release drop zone using flexbox.
- **JFrog Upload Path for Dev Packages**: Fixed `buildJfrogPath()` to use `/dev/` path prefix for development packages. Also fixed Linux64/Linux32 paths and A2A path (`/app-to-app/` instead of `/android/a2a/`).
- **A2A Release Summary**: PaymentExample now shows device name extracted from URL (e.g., "PaymentExample (A910)"). Device APKs are now listed individually instead of aggregated count.
- **Library Package Badges**: Removed unnecessary category badges ("None", "DLL") from TEF Library packages in package cards.

## [3.1.1] - 2026-02-11

### Fixed

- **Delete Dialog Button Alignment**: Fixed misaligned Cancel/Delete buttons in confirmation dialogs by adding consistent button height and flex alignment.
- **Added Badge for New Packages**: Packages without a URL (newly added, not yet uploaded) now show a green "Added" badge with checkmark icon instead of a "-" placeholder.
- **File Picker Filter Removed**: The file picker for adding packages no longer filters by extension, allowing selection of any file (including Linux builds without extensions).

## [3.1.0] - 2026-02-12

### Added

- **Download Button on Package Cards**: Replaced URL text links with a clear "Download" button and a copy-to-clipboard button in package cards. Provides better UX with visual feedback on URL copy.
- **A2A Section Grouping**: A2A packages in accordions are now organized into three sub-sections: SDK (Documentation, AAR), A2A (Device APKs), and Examples (PaymentExample). Each section has a clear title header.
- **Confirm Dialog Redesign**: Confirmation dialogs (delete, warnings) now feature a centered icon, gradient header, and improved styling. Danger dialogs use a red gradient, warning dialogs use yellow/orange, and info dialogs use blue.
- **Linux Package Extensions**: File picker filters now include Linux package formats: `.deb`, `.rpm`, `.tar`, `.gz`, `.sh`, `.run`.

### Changed

- **Platform Tab Contrast (Dark Mode)**: Improved text contrast for platform tabs with brighter colors (#b8b8d0 for inactive, #ffffff on hover, #e879a9 for active).
- **Package Card Grid Spacing**: Added `margin-top: 0.75rem` to `.pkg-cards` for better visual separation from platform tabs.
- **Icon Improvements**:
  - Windows DLL packages now use `dll.svg` icon
  - Windows/Linux libraries use `lib.svg` icon  
  - STA device groups use `android.svg` icon
  - A2A examples use `payexample.svg` icon
- **Installer Titles in Release Summary**: Windows/Linux installers now show "Online Installer" or "Offline Installer" directly in the title instead of using a separate badge.
- **Windows Installer Detection**: Fixed package detection to correctly set device type as "TEF Installer" (not "Windows") for proper icon and title rendering.
- **Linux Platform Detection**: Improved detection to distinguish Linux64/Linux32 platforms and recognize `.deb`, `.rpm`, `.sh`, `.run` files.

### Fixed

- **SPF Import Parsing**: Fixed semicolon delimiter detection and added header row skip to correctly parse SPF files (previously used comma delimiter, causing "0 packages found").
- **URL Link Contrast (Dark Mode)**: Changed URL link color to #e879a9 for better visibility in dark mode.
- **Tools Page Version Placeholder**: Removed hardcoded "2.0.7" placeholder from the version input field.

## [3.0.0] - 2026-02-11

### Added

- **Import Release Feature**: Complete SPF-centric import workflow allowing users to import existing `.spf` files or edit saved releases. Includes drag-and-drop SPF import, full release editing (version, date, type, notes), and package management with accordion-based UI.
- **Package Management Accordions**: Platform-grouped collapsible sections (Windows, Linux64, Linux32, Embedded, STA, A2A, Custom) with tabbed sub-views for TEF platforms, device-grouped STA lists, A2A card grid, and custom platform rows. Each package shows category, signature, client, URL, and delete button.
- **Delete from JFrog**: Backend command to delete individual packages from JFrog Artifactory with HEAD check + DELETE request, handling 204/200/404 status codes.
- **Add Packages to Import**: File picker integration for adding new packages to an imported/edited release with automatic metadata detection from filename.
- **Update Release**: Full save workflow that uploads new packages (with STA APK→ZIP rule), generates SPF, saves SPF internally, and updates releases.json.
- **Tools Page - Daily Password Generator**: Complete implementation of Password Algorithm v3.1 with hash-based mixing (7 steps), generating 6-character uppercase hexadecimal passwords. Available in both frontend JS and backend Rust.
- **Advanced Options Page - Custom Devices CRUD**: Full create/read/delete interface for custom device platforms with name, type (Platform/Embedded/Android), and URL identifier fields. Persisted in settings.json.
- **Backend SPF Logic**: `parse_spf_content` (reverse-parses SPF to structured data), `save_release_with_spf` (generates + saves SPF + updates releases.json), `load_release_from_spf` (reads SPF file from disk).
- **Release Migration**: Automatic migration on startup that adds `updatedAt` and `spfFileName` fields to existing releases for backward compatibility.
- **Custom Device Struct**: New `CustomDevice` struct in Rust with `customPlatforms` field in Settings (with serde default for backward compatibility).
- **SPF Directory**: New `spf/` directory in app data for storing generated SPF files.

### Changed

- **Export Data (v2)**: Now includes `version: 2` marker, collects and embeds SPF file contents in the export JSON under `spfFiles` map for complete portability.
- **Import Data (v2)**: Restores SPF files from exported `spfFiles` map, or regenerates them from release data if not available. Ensures SPF directory exists.
- **Version Bump**: Major version bump from 2.0.41 to 3.0.0 reflecting the significant new Import Release feature.

## [2.0.41] - 2026-02-09

### Changed

- **Per-Execution Rotative Logging**: Log files are now created per application execution instead of per day. The new filename pattern is `adtpkgmngr-<YYYYMMDD-HHMMSS>-<counter>.log`, where the timestamp reflects when the execution started and the counter increments for each execution on the same day. When a log file reaches 50MB, it is renamed with a `-f` suffix (e.g., `adtpkgmngr-20260209-143022-1-f.log`) and a new file is created with an incremented counter. This replaces the previous daily log file pattern (`YYYY-MM-DD.log`).

### Added

- **"Não assinados" Badge on Unsigned Releases**: Releases that contain packages with `/unsigned/` in their JFrog URL now display a red "Não assinados" badge next to the release type badge (Production/Development) in the Releases list. This makes it immediately visible which releases contain unsigned packages. The badge uses a red color scheme in both dark and light modes.

### Fixed

- **S920 Folder Download Links in HTML**: Fixed an issue where S920 unsigned packages (which are uploaded as folders) had blank/missing link text in the generated HTML documentation. The `extract_filename` function now correctly handles URLs ending with `/` by stripping the trailing slash before extracting the folder name, and appending `/` to indicate it is a folder (e.g., `SmartPosTef-P-S920-2.5.1.138693/` instead of an empty string).

## [2.0.40] - 2026-02-09

### Fixed

- **Markdown Rendering in Release Notes**: Restored the `lib/marked.min.js` library (v12.0.2) which was missing from the project, causing release notes to render as plain text instead of formatted markdown. This affects both the preview in the New Release creation screen and the modal when viewing release notes from the Releases page.
- **Modal Background Too Dark**: Improved modal visibility by changing the modal content background from `#1e1e36` to `#252545` (lighter), reducing the overlay opacity from 0.8 to 0.5, and adding `position: relative; z-index: 1` to ensure the modal content sits above the backdrop. Also consolidated duplicate `.modal` CSS definitions.
- **HTML Favicon**: Updated the base64-encoded favicon in the generated HTML files to use the correct icon (6984 chars vs previous truncated 4202 chars).

## [2.0.39] - 2026-02-09

### Fixed

- **Toast Cascade Z-Index and Opacity**: Toast notifications now stack correctly with the newest toast always on top (highest z-index). Removed opacity reduction on stacked toasts so they are fully opaque and cannot be seen through. Background changed from `var(--bg-card)` to solid `#16162a` (dark mode) / `#ffffff` (light mode) and removed `backdrop-filter: blur()` to eliminate any transparency.
- **Online/Offline Tag Colors in Release Summary**: The category tags for platform packages now use distinct colors: **Offline** tags are yellow and **Online** tags are green, instead of both being gray. Added `summary-tag-yellow` CSS class with light mode variant.
- **Modal Width for Release Notes and Logs**: The Release Notes and Application Logs modals now use 80% of the window width with no max-width cap, providing much more readable content display.

## [2.0.38] - 2026-02-09

### Fixed

- **STA Device Tags in Release Summary**: Category (Launcher, App), signature, and client values in the STA Devices section of the Release Summary now render as styled tag badges (gray for category, blue for signature, green for client) instead of plain text. This matches the styled tags used in the Platform Packages section.
- **S920 Unsigned ZIP Extraction**: The `extract_root_and_upload_to_jfrog` function now always produces a flat destination folder containing only files (no subdirectories). Whether the ZIP contains files at root level or inside a subfolder like `PAX_S920/`, all files are extracted directly to the root of the destination folder (named after the ZIP without extension). The uploaded structure is always `SmartPosTef-P-S920-{version}.{hash}/{files}` with no intermediate directories.

### Added

- **Open/Find Buttons on Data Export Toast**: The success notification after exporting data from Settings > Data Export/Import now includes Open and Find action buttons, consistent with HTML and SPF generation notifications.

## [2.0.37] - 2026-02-09

### Added

- **S920 Unsigned Package Extract & Upload**: Unsigned S920 packages (both new `SmartPosTef-{P|D}-S920-{version}.{hash}.zip` and legacy `SmartPosTef-{P|D}-{version}.{hash}.zip` formats) are now extracted before upload. The ZIP root contents are placed into a folder named after the file (without `.zip` extension), and the entire folder is uploaded to JFrog. For example, `SmartPosTef-P-S920-2.5.1.138693.zip` is extracted to `SmartPosTef-P-S920-2.5.1.138693/` and uploaded to `packages/unsigned/pax/s920/SmartPosTef-P-S920-2.5.1.138693/`. Development unsigned packages go to `packages/dev/pax/s920/{folder}/`.
- **New Rust Command `extract_root_and_upload_to_jfrog`**: Dedicated backend command for extracting ZIP root contents into a named folder and uploading all files preserving directory structure. Used specifically for unsigned S920 packages.

### Changed

- **Package Card Display for S920 Unsigned**: The package card now shows `Extract → {folder_name}/` tag and the full JFrog path including the folder name for unsigned S920 packages, making the extract-and-upload behavior clearly visible.
- **SPF Export Filters Updated**: All SPF export filters (export SPF, finalize release, releases page export) now correctly distinguish between online companion packages (which should be excluded from SPF) and S920 unsigned packages (which should be included). Previously, any package with `specialHandling` was excluded from SPF.
- **Version Detection Filters Updated**: Auto-detect version and version validation now correctly include S920 unsigned packages in version analysis, instead of skipping them as companion files.

## [2.0.36] - 2026-02-09

### Fixed

- **S920 Package Detection (New Format)**: Added support for the current S920 filename format `SmartPosTef-{P|D}-S920-{version}.{hash}.zip` (with "S920" in the name). Previously only the legacy format `SmartPosTef-{P|D}-{version}.{hash}.zip` was recognized, causing new S920 packages to show as "Unknown" platform with "Path not determined". Both signed (`_sign.zip`) and unsigned (`.zip`) variants of the new format are now correctly detected as Embedded/S920 with proper JFrog paths (`packages/pax/s920/`, `packages/dev/pax/s920/`, `packages/unsigned/pax/s920/`). The legacy format remains supported for backward compatibility.

## [2.0.35] - 2026-02-09

### Added

- **Toast Action Buttons (Open / Find)**: File generation notifications (HTML and SPF) now include two action buttons: **Open** (opens the generated file in the default application/browser) and **Find** (reveals the file in the system file manager). This applies to all HTML generation and SPF export operations across the application. Toasts with action buttons have an extended auto-dismiss time of 10 seconds.
- **Rust Backend Commands**: Added `open_file_in_default_app` and `show_in_folder` commands to support the new toast action buttons across Windows, Linux, and macOS.

### Changed

- **API Key Encryption in Export**: The JFrog API key is now encrypted using AES-256-GCM before being written to the exported JSON file. On import, the key is automatically decrypted. Old (plaintext) exports are still supported for backward compatibility. The exported key is prefixed with `ENC:` to distinguish encrypted values.
- **Release Summary Redesign**: The release summary shown when expanding a release card now displays packages with proper structure: platform packages show category tags (e.g., Online, Offline) as badges next to the package name; STA devices are grouped by terminal with variants listed below, each showing category, signature (blue badge), and client (green badge) tags. This matches the layout of the web project HTML output.
- **Eye Toggle Button Styling**: The API key visibility toggle button in Settings > JFrog no longer shows a purple square background when active. Instead, it now properly switches between an open-eye and closed-eye icon, with a subtle color change to indicate the current state.

### Fixed

- **Eye Toggle Icon**: The toggle visibility button now uses two distinct SVG icons (eye-open and eye-closed) that swap on click, instead of a single icon with a distracting purple background highlight.

## [2.0.34] - 2026-02-06

### Fixed

- **NSIS Installer Icon**: Configured the NSIS Windows installer to use the application icon (`icon.ico`) via the `installerIcon` setting in `tauri.conf.json`. Previously the installer used the default NSIS icon.
- **NSIS Installer Version**: Fixed the installer filename showing version `2.0.24` instead of the current version. The `version` field in `tauri.conf.json` was not being updated alongside `Cargo.toml` and `index.html`. Now all three version sources are synchronized.

### Changed

- **Version Synchronization**: The `tauri.conf.json` version is now kept in sync with `Cargo.toml`, `index.html`, and `CHANGELOG.md` for every release.

## [2.0.33] - 2026-02-06

### Fixed

- **Windows Taskbar Icon Resolution**: Regenerated `icon.ico` with all required sizes (16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256). Previously the ICO file only contained 16x16 and 32x32, causing a blurry/pixelated icon in the Windows taskbar and Alt+Tab.
- **Windows Dropdown Select Styling**: Fixed the `<select>` dropdown elements showing a repeating triangle pattern on Windows (WebView2). The issue was caused by `background-image` and `background-repeat` being set separately, allowing the background shorthand from general input styling to override the repeat setting. Now uses the `background` shorthand with explicit `background-size` to prevent tiling on all platforms.

## [2.0.32] - 2026-02-06

### Fixed

- **HTML Release Notes Markdown Rendering**: The generated HTML release page now properly renders Markdown in the Release Notes section using `marked.js` (loaded from CDN). Previously, release notes were displayed as raw text with `<br>` line breaks instead of rendered Markdown. Headings, lists, bold, code blocks, links, and all other Markdown formatting now display correctly in the exported HTML file.

### Added

- **Complete Build Guide in README**: Added comprehensive build instructions for both Linux native builds and Windows cross-compilation from Linux, including all required dependencies (`clang`, `nsis`, `lld`, `llvm`, `cargo-xwin`), step-by-step commands, output paths, and a troubleshooting table for common build errors.

## [2.0.31] - 2026-02-06

### Fixed

- **Generate SPF Button Hidden in Release Mode**: The "Generate SPF" button is now completely hidden when the deploy purpose is "New Release". Only the "Finalize Release" button appears after all uploads complete, preventing confusion.
- **Release Notes Not Cleared**: The release notes text area and its preview are now properly cleared when the deploy screen is reset after finalizing a release.
- **SPF Auto-Save Path Error**: Fixed `undefined` path error when auto-saving SPF during finalize. The code was using `paths.data` which doesn't exist; corrected to `paths.userData`.

### Changed

- **Cascade Toast Notifications**: Toast notifications are now smaller and more compact. When multiple toasts appear simultaneously, they stack in a cascade (overlapping with slight offset and progressive scaling/opacity). Hovering over the toast area expands all toasts into a full list for easy reading.

### Added

- **Open Folder Buttons in Settings**: Each path entry in the Settings > Paths & Logs tab now has an "Open" button that opens the corresponding folder in the system file manager.

## [2.0.30] - 2026-02-06

### Fixed

- **Release Notes Markdown Rendering**: The "View Release Notes" modal in the Releases page now properly renders Markdown content using `marked.parse()` instead of displaying raw Markdown text. Headings, lists, bold, code blocks, and other Markdown formatting are now correctly rendered.

### Changed

- **Finalize Release Workflow**: Replaced the "Generate SPF" button with a new **"Finalize Release"** button that appears after all packages are uploaded. Clicking "Finalize Release" performs all steps automatically in sequence:
  1. Saves the release to local storage
  2. Generates and auto-saves the SPF file to the app's data folder
  3. Generates the HTML release page
  4. Clears the deploy screen (packages, form fields, purpose selection)
  5. Navigates to the Releases page showing the newly created release
- This eliminates the previous issue where clicking "Generate SPF" multiple times would create duplicate releases.
- The "Upload All" button is now disabled after all uploads complete (since all packages are already uploaded).
- The old "Generate SPF" button is kept hidden for backward compatibility but is no longer shown in the normal workflow.

## [2.0.29] - 2026-02-06

### Fixed

- **Delete Confirmation Dialog**: Fixed broken delete button that stopped working after switching from native OS dialog to in-app modal. The modal overlay now uses proper CSS classes and inline styles to ensure correct rendering and interactivity.

### Added

- **Comprehensive Frontend Logging**: Every user action in the frontend now generates a log entry sent to the backend log file via the new `log_from_frontend` command. Logged actions include: page navigation, theme toggle, purpose selection, deploy mode switch, folder selection/cancel, package add/remove, upload all, retry upload, SPF generation/export, release expand/collapse, release delete (with confirm/cancel), HTML generation, settings save, client mapping add/remove, data export/import, API key visibility toggle, modal show/close, auto-detection of release type and version, and all error/warning toasts.
- **Comprehensive Backend Logging**: All Tauri commands now include logging: `get_app_paths`, `get_settings`, `save_settings`, `get_releases`, `calculate_md5`, `create_zip`, `generate_spf_content`, `save_spf_file`, `export_data`, `import_data`, `read_file_content`, `write_file_content`, `get_file_size`, `open_path`, and application startup.
- **Frontend Log Bridge**: New `log_from_frontend` Tauri command allows the frontend to write log entries to the same backend log file, providing a unified log stream for all application events.
- **Unhandled Error Logging**: Global `error` and `unhandledrejection` event listeners automatically log any uncaught frontend errors.

## [2.0.28] - 2026-02-06

### Fixed

- **Delete Confirmation Dialog**: Replaced native OS dialog (`dialogAsk`) with in-app modal dialog (`showConfirmDialog`) for delete release confirmation. The native OS dialog could be hidden behind the main application window on Linux, making it appear as if the app had frozen. The in-app modal overlay is always visible within the application window and cannot be lost.

### Changed

- **Confirmation Dialog Enhancements**: `showConfirmDialog` now supports customizable button labels (`okLabel`, `cancelLabel`) and dialog kind (`info`, `warning`, `error`). Delete dialogs use a red "Delete" button, and version mismatch warnings use a "Continue Anyway" button.

## [2.0.27] - 2026-02-06

### Fixed

- **Release Summary - A2A Display Names**: Removed redundant "A2A" prefix from package names in the release summary since the platform is already indicated by the section grouping (e.g., "SDK Integration Documentation" instead of "A2A SDK Integration Documentation")
- **Release Summary - A2A Icons**: AAR packages now display the `aar.svg` icon and Documentation packages now display the `doc-integration.svg` icon instead of the generic Android icon
- **Online Installer Companion Warnings**: Fixed false warnings about missing online installers when companion zip files (x86.zip, Linux_64-Gui-Installer.zip, Linux_i386-Installer.zip) are present alongside their extracted online installers. The validation was incorrectly checking `category` instead of `device` field for installer detection.

## [2.0.26] - 2026-02-06

### Fixed

- **SPF Generation - A2A AAR**: Was `A2A;SDK Integration;AAR;;;url`, now correctly `A2A;AAR;;;;url`
- **SPF Generation - A2A Doc**: Was `A2A;SDK Integration;Documentation;;;url`, now correctly `A2A;Doc;;;;url`
- **SPF Generation - A2A PaymentExample (generic)**: Was `A2A;Generic;Payment Example;;;url`, now correctly `A2A;;Example;;;url`
- **SPF Generation - A2A Device APKs**: Was `A2A;A910;Device APK;;;url`, now correctly `A2A;A910;;;;url`
- **SPF Generation - Device Name Normalization**: `P2_LITE_SE` now correctly outputs as `P2 Lite` in SPF files
- **SPF Generation - Windows DLL Category**: Was `DLL`, now correctly `None` per SPF spec
- **SPF Generation - Linux Library Category**: Was `Library`, now correctly `None` per SPF spec
- **SPF Generation - Windows/Linux Installer Device**: Was `Installer`, now correctly `TEF Installer` per SPF spec
- **SPF Version Header**: Was using base version only (e.g., `2.4.1`), now uses full version with hash (e.g., `2.4.1.A2A.99807` or `2.5.1.289844`)
- **SPF Filename**: Now includes full version with hash in filename (e.g., `release_2.4.1.A2A.99807-2025-11-29-dev.spf`)
- **SPF Embedded Category**: Embedded S920 packages now correctly have empty category instead of any default value

### Added

- `transform_to_spf_format()` function in Rust backend to convert internal UI values to SPF-spec format
- `normalize_device_name_for_spf()` function for proper device name formatting (P2_LITE_SE → P2 Lite, DX4000 → Dx4000)
- `getFullVersionForSpf()` function in frontend to build full version string from package version+hash data

## [2.0.25] - 2026-02-05

### Changed

- **Folder Selection No Longer Requires Version**: Removed the requirement to enter a version before selecting a folder or adding packages manually. The version is now auto-detected from scanned files and auto-filled into the version input field.
- The "Select Packages Folder" and "Add Package" buttons are now always enabled
- Version hints are hidden by default (no longer show "Enter the Main Version above to enable...")

## [2.0.24] - 2026-02-05

### Added

- **Automatic Version Detection**: The app now automatically detects the version from scanned package filenames
  - Extracts base version (Major.Minor.Patch) from STA versions (X.X.X.HASH) and A2A versions (X.X.X.A2A.HASH)
  - Auto-fills the version input field when all packages have the same base version
  - Shows error and blocks scanning if folder contains packages with different base versions
  - In "New Release" mode, also auto-detects version when adding files manually

- **Companion File Validation**: Shows warning immediately when scanning if companion files (Linux_64-Gui-Installer.zip, Linux_i386-Installer.zip, x86.zip) are found without their corresponding online installers

- **Version Mismatch Warning**: When generating SPF or saving release, validates that the entered version matches detected package versions. Shows confirmation dialog if mismatch detected.

### Changed

- `scan_folder` command now returns a `ScanResult` object containing:
  - `packages`: List of detected packages
  - `detectedVersion`: Auto-detected base version (if all packages match)
  - `versionError`: Error message if multiple different versions found
  - `companionWarnings`: List of warnings about missing online installers
  - `isValid`: Boolean indicating if the scan result is valid for processing

## [2.0.23] - 2026-02-05

### Added

- **PaymentExample Generic APK Support**: APKs without device name (e.g., `PaymentExample-D-2.4.1.A2A.454359-release.apk`) now correctly detected and routed to `packages/[dev/]app-to-app/payment_example/`
- **Favicon in Generated HTML**: HTML files now include the SmartPosTEF favicon embedded as base64

### Fixed

- **HTML Generation Page**: The "Generate HTML" button on the HTML Generation page now works correctly (was showing "not yet implemented" message)

## [2.0.22] - 2026-01-28

### Changed

- Version bump for release

## [2.0.21] - 2026-01-28

### Fixed

- **HTML Generation**: Release notes section now appears before the packages list (as per reference format)
- **Data Folder Path**: Changed from "SmartPosTEF Package Manager" to "smartpostef-package-manager" for better cross-platform compatibility
- **Release Notes Modal**:
  - Increased modal width from 600px to 800px for better readability
  - Fixed close button not working - modal now properly closes when clicking X or outside the modal
  - Modal is now recreated each time to ensure fresh event listeners

## [2.0.20] - 2026-01-28

### Fixed

- **HTML Generation**: Completely rewritten to match the reference format from package-manager-portal
  - Uses Tailwind CSS via CDN with proper dark/light mode toggle
  - Gradient backgrounds (#1a0b2e to #16213e for dark, #f5f7fa to #c3cfe2 for light)
  - Inter font from Google Fonts
  - Proper section organization: TEF (Windows, Linux 64bits, Linux 32bits), Smart POS (STA), A2A, Embedded
  - Platform subsections with proper styling (rounded cards, border accents)
  - Package links with filename extraction and blue styling
  - Release notes section with markdown-style formatting
  - Theme toggle button with sun/moon icons
  - Responsive design with md: breakpoints

## [2.0.19] - 2026-01-27

### Changed

- **Releases Page Redesign** - Completely redesigned the Releases page to match the reference portal design:
  - Expandable release cards (collapsed by default) instead of modal view
  - Action buttons in card header: Generate HTML, Export SPF, Expand/Collapse, Delete
  - Release Summary section with platform icons when expanded
  - "View Release Notes" button for releases with notes
  - Platform count badge showing number of unique platforms
  - Created timestamp display

### Added

- **Generate HTML Command** - New backend command to generate HTML release pages directly from the Releases page
- **Export SPF from Releases** - Export SPF files directly from each release card
- **Platform Icons** - Added platform icons (Windows, Linux64, Linux32, Embedded, STA, A2A) for visual package identification

### Fixed

- **Modal Close** - Fixed modal not closing when clicking outside or on the X button
- **Download Button** - Changed "View" button to "Download" with icon in package listings

## [2.0.18] - 2026-01-27

### Changed

- **SPF Filename Pattern** - Changed SPF filename to `release_<version>-YYYY-MM-DD-<prod/dev>.spf` (e.g., `release_2.5.1.289844-2025-12-12-prod.spf`)

### Fixed

- **Exclude Online Companions from SPF** - Online companion packages (Linux_64-Gui-Installer.zip, Linux_i386-Installer.zip, x86.zip) are now excluded from the SPF file as they are not part of the release packages

## [2.0.17] - 2026-01-27

### Fixed

- **SPF File Format** - Fixed SPF file generation to use the correct format (NOT JSON). The SPF format is a custom text-based format with XML-like sections:
  - `<release_info>` section with key=value pairs (version, date, type)
  - `<release_notes>` section with markdown content
  - `<release_pkgs>` section with semicolon-delimited CSV (Platform;Device/Type;Category;Signature;Client;URL)

## [2.0.16] - 2026-01-27

### Changed

- **ZIP Companion Partial Upload Success** - When uploading ZIP companion files (Linux_64-Gui-Installer.zip, etc.), if some files upload successfully but others fail, the package is now marked as "Uploaded" instead of "Failed". The message includes a list of which files failed to upload for user information.

## [2.0.15] - 2026-01-27

### Fixed

- **ZIP Companion Files Nested Structure** - Fixed extraction of ZIP files with nested folder structures. The extraction now recursively searches for the target folder (x86_64, i386, x86) within the ZIP contents:
  - `Linux_64-Gui-Installer.zip` contains `Linux_64-Gui-Installer/x86_64/` → finds and uploads `x86_64/`
  - `Linux_i386-Installer.zip` contains `Linux_i386-Installer/i386/` → finds and uploads `i386/`
  - `x86.zip` contains `x86/` at root → uploads `x86/`

## [2.0.14] - 2026-01-27

### Fixed

- **SPF Generation Error** - Fixed "missing field `type`" error when generating SPF files. The frontend was sending `releaseType` but the Rust backend expected `type` (matching the serde rename attribute)

- **ZIP Companion Files Upload** - Fixed upload of online installer companion ZIP files (Linux_64-Gui-Installer.zip, Linux_i386-Installer.zip, x86.zip). These files now properly extract and upload only the specific folder contents:
  - `Linux_64-Gui-Installer.zip` → Extracts and uploads `x86_64/` folder to `packages/[dev/]linux/64/`
  - `Linux_i386-Installer.zip` → Extracts and uploads `i386/` folder to `packages/[dev/]linux/32/`
  - `x86.zip` → Extracts and uploads `x86/` folder to `packages/[dev/]windows/`

### Added

- **New Backend Command**: `extract_and_upload_to_jfrog` - Extracts ZIP file, finds target folder, and uploads all files in that folder to JFrog with detailed logging

## [2.0.13] - 2026-01-26

### Changed

- **JFrog URL Updated** - Changed upload URL from `aditum.jfrog.io` to `artifactory.aditum.com.br/artifactory/`

### Added

- **Enhanced Logging** - Comprehensive detailed logging throughout the application:
  - Folder scanning logs include: timestamp, folder path, settings loaded, client mappings, each package detected with full details (platform, device, category, version, hash, size in MB, JFrog path, signature, client, special handling), skipped files, package type analysis (dev/prod counts), total size summary, platform breakdown
  - Manual file scanning logs include: file list, each package details, missing files, total size
  - Upload logs include: timestamp, file path, JFrog path, masked API key, file size, target URL, HTTP headers, upload duration, upload speed in MB/s, response details, troubleshooting tips for common errors (401, 403, 404, 413, 500)
  - Release save/delete logs include: release ID, version, date, type, package count, each package details, file path, total releases count
  - Log format improved with visual separators, aligned levels, and structured details

- **Improved Notifications** - Toast notifications redesigned for better visibility:
  - Moved to top-right corner for better visibility
  - Larger size with minimum width of 320px
  - Added title header (Success, Error, Warning, Info) with colored text
  - Glow effects matching notification type (green/red/orange/blue)
  - Shake animation for error notifications
  - Pulse animation for attention
  - Progress bar showing auto-dismiss countdown
  - Pause on hover functionality
  - Sound notification for errors and warnings (using Web Audio API)
  - Improved close button with hover effects
  - Backdrop blur effect
  - 6-second auto-dismiss (increased from 5s)

### Fixed

- Toast notifications now use correct class names (`toast-success`, `toast-error`, etc.)

## [2.0.12] - 2026-01-26

### Fixed

- **Upload 413 Payload Too Large** - Changed to use chunked transfer encoding (Transfer-Encoding: chunked) instead of Content-Length header to bypass nginx proxy size limits

### Changed

- Removed Content-Length header from upload requests to enable chunked transfer
- Upload now uses streaming body without pre-declaring file size

## [2.0.11] - 2026-01-26

### Fixed

- **Upload 413 Payload Too Large** - Implemented streaming upload using tokio-util ReaderStream instead of loading entire file into memory
- **File logging** - Implemented proper file logging system that writes to daily log files in the logs directory
- **Upload timeout** - Increased upload timeout to 10 minutes for large files

### Added

- **Streaming upload** - Uses reqwest Body::wrap_stream for memory-efficient uploads of large files
- **Content-Length header** - Added proper Content-Length header for uploads
- **Comprehensive logging** - Added logging for:
  - Upload start with file size and path
  - Upload success/failure with details
  - Folder scanning with package count
  - Manual file scanning
  - Release creation/update/deletion

### Changed

- Upgraded reqwest to use `stream` feature instead of `blocking`
- Added chrono and tokio-util dependencies for logging and streaming

## [2.0.10] - 2026-01-23

### Fixed

- **Package card layout** - Reverted to v2.0.6 simple style with status badge and delete button in a right-aligned actions column
- **Window/taskbar icons** - Regenerated all icon sizes (32x32, 128x128, 256x256) from original icon-192.png for proper display

### Changed

- Simplified package item CSS to use flex row layout instead of complex header/footer structure

## [2.0.9] - 2026-01-23

### Fixed

- **App icon** - Restored original SmartPosTEF icon from Electron project for sidebar and window title bar
- **Package card layout** - Repositioned elements:
  - Pending/status tag now in top-right corner
  - Delete button now in bottom-right corner of footer
  - Footer now has left and right sections for better organization

### Changed

- Updated all icon files (icon.png, icon.ico) with original branding

## [2.0.8] - 2026-01-23

### Fixed

- **API Key visibility toggle** - Fixed eye button click handler to toggle password visibility
- **Add Mapping button** - Fixed client mappings container ID mismatch (`client-mappings` → `client-mappings-list`)
- **View Logs** - Changed from opening folder to showing a log viewer modal with log content
- **Client field JFrog path update** - When adding client manually, the JFrog path now updates to include the client name in lowercase
- **Delete button** - Moved to bottom of package card with trash icon instead of X
- **Package item layout** - Restructured with header and footer sections for better organization

### Added

- **Log viewer modal** - Shows log file content with option to open folder
- **list_log_files command** - Backend command to list log files sorted by modification time

## [2.0.7] - 2026-01-23

### Fixed

- **Settings tabs not switching** - Fixed data attribute mismatch (`data-settings-tab` → `data-tab`) and selector mismatch (`.settings-panel` → `.settings-content`)
- **Version display** - Updated sidebar footer to show correct version (v2.0.7)
- **Package sorting** - Implemented proper sort order: Library (Win/Linux) → Installer (Win/Linux) → STA (Launcher then App), alphabetically within each category

## [2.0.6] - 2026-01-23

### Added

- **Comprehensive Package Detection** - Ported all regex patterns from Electron version:
  - **STA Packages**: Detects SmartPosTef and AditumTef Android packages with LP/LD/AP/AD prefixes
  - **Device Detection**: Automatically identifies devices (P2, DX4000, A910, D200, etc.)
  - **A2A Packages**: SDK, documentation, and device APKs
  - **Platform Packages**: Windows/Linux installers (.exe, .zip) and libraries (.dll, .so, .lib)
  - **Special ZIP Handling**: x86.zip, Linux_64-Gui-Installer.zip, Linux_i386-Installer.zip with extraction markers

- **Electron-Style Package List UI**:
  - Platform tags (Android, Windows, Linux32, Linux64)
  - Device tags (P2, DX4000, A910, D200, etc.)
  - Category tags (Installer, Library, SDK, App, Launcher)
  - Signed/Unsigned indicators for Android packages
  - Development package highlighting (yellow background)
  - Special "Extract" tag for ZIP files requiring extraction
  - JFrog path display below each package
  - Signature and Client input fields with "+" buttons
  - Remove button for each package

- **Package Summary Section**:
  - Total package count
  - Total size calculation
  - Platform breakdown (Linux32, Windows, Linux64, STA counts)

- **Client Mapping System**:
  - Map numbers extracted from version strings (e.g., 788 in "2.5.1.788.502702")
  - Configurable mapping (e.g., 788 → "Lyra") for automatic path generation
  - Paths like `packages/sunmi/p2/launcher/lyra` generated automatically

- **Auto-Detection**:
  - Production/Development release type detection based on package prefixes
  - Automatic JFrog path generation based on platform, device, and client

- **Modal Dialogs**: For adding signature and client values to packages

### Fixed

- Package detection now properly identifies all SmartPosTEF package types
- Client mapping works with map numbers in version strings, not simple prefixes
- UI matches Electron version layout and functionality
- Unknown packages now show proper "Unknown" tags instead of crashing

### Technical

- Rewrote `lib.rs` with comprehensive regex patterns using `lazy_static` and `regex` crates
- Rewrote `app.js` with Electron-style `renderPackageItem()` and `updateSummary()` functions
- Added CSS for package tags (.tag-unsigned, .tag-signed, .tag-dev, .tag-special)
- Added DEVICE_MAP constant for device name normalization

## [2.0.5] - 2026-01-23

### Fixed

- Fixed dropdown/select elements rendering with checkered pattern (removed problematic CSS)
- Fixed folder scanning - now properly scans and displays packages after folder selection
- Fixed "View Logs" and "Open Output Folder" buttons using new `open_path` Rust command
- Fixed "Add Manually" button for adding package files
- Fixed markdown preview for release notes (Edit/Preview toggle)
- Removed incorrect default client mappings (L, M, W, A, E) - now starts empty
- Fixed `scan_folder` parameter name mismatch between frontend and backend

### Changed

- Client mappings now start empty - user should configure their own mappings
- Improved error handling and console logging for debugging

## [2.0.4] - 2026-01-23

### Fixed

- **Critical fix for button click handlers** - Rewrote JavaScript initialization
- Added `withGlobalTauri: true` configuration for proper Tauri API exposure
- Implemented polling-based Tauri API initialization to prevent race conditions
- Separated DOM event handler setup from Tauri API initialization
- Added extensive console logging for debugging
- Fixed Tauri v2 API access using `window.__TAURI__` global object

### Technical

- Event handlers now attach immediately on DOMContentLoaded
- Tauri APIs are accessed after polling confirms availability
- All button clicks now properly execute their handlers

## [2.0.3] - 2026-01-23

### Fixed

- Fixed file dialog not working - updated Tauri v2 plugin API usage
- Fixed dropdown styling (white background issue) with proper dark theme CSS
- Fixed client mapping field - changed "Prefix" to "Map Number" with digits-only validation
- Fixed save settings notification now shows properly
- Fixed application paths display in Settings > Paths & Logs
- Updated capabilities with full permissions for dialog, fs, and shell plugins

## [2.0.2] - 2026-01-23

### Fixed

- Fixed JavaScript/Tauri IPC communication - clicks now work properly
- Fixed Tauri v2 API imports with proper initialization
- Updated window icon configuration
- Fixed version display in sidebar footer
- Added proper error handling for all Tauri API calls
- Fixed null checks for all DOM elements

## [2.0.1] - 2026-01-23

### Fixed

- Fixed duplicate Tauri command definitions causing build errors
- Moved all commands to a dedicated module to prevent macro conflicts
- Removed Cargo.lock to ensure fresh dependency resolution

## [2.0.0] - 2026-01-23

### Changed

- **Complete rewrite using Tauri framework** - Migrated from Electron to Tauri
- Bundle size reduced from ~170MB to ~18MB (89% reduction)
- Memory usage reduced from ~200MB to ~50MB (75% reduction)
- Faster startup time
- Improved security with Rust backend

### Features Preserved

All functionality from Electron v1.4.3 maintained:

- New Deploy with two modes (New Release / Upload Only)
- Package scanning (folder and manual file selection)
- JFrog upload with automatic path generation
- SPF file generation
- Releases management
- HTML generation
- Settings management (JFrog API key, client mappings, portal settings)
- Data export/import
- Dark/Light mode toggle
- Date picker with native format

### Technical

- **Frontend**: HTML, CSS, JavaScript (same as Electron version)
- **Backend**: Rust (replaces Node.js/Electron)
- **IPC**: Tauri invoke system (replaces Electron IPC)
- **Plugins**: tauri-plugin-dialog, tauri-plugin-fs, tauri-plugin-shell

---

## Previous Versions (Electron)

### [1.4.3] - 2026-01-22

- Native date input with styled purple calendar button
- Date format based on system locale

### [1.4.2] - 2026-01-22

- Fixed date picker initialization timing

### [1.4.1] - 2026-01-22

- Date format changed to dd/mm/yyyy
- Restored styled calendar button

### [1.4.0] - 2026-01-22

- Switched to native HTML5 date input

### [1.3.9] - 2026-01-22

- Fixed date input initialization

### [1.3.8] - 2026-01-22

- Build optimization (portable only)

### [1.3.7] - 2026-01-22

- Dark/Light mode toggle
- Sidebar redesign with footer
- Date format dd/mm/yyyy

### [1.3.6] - 2026-01-22

- APK-to-ZIP conversion for dev/unsigned packages
- JFrog upload implementation

### [1.3.5] - 2026-01-22

- Signature detection fix

### [1.3.0] - 2026-01-21

- Upload Only mode
- Auto-detect production/development type

### [1.2.0] - 2026-01-20

- Enhanced package scanning
- Improved UI styling

### [1.1.0] - 2026-01-19

- Data Export/Import feature

### [1.0.0] - 2026-01-18

- Initial release
- Package scanning and upload
- Release management
- HTML generation
- Settings management
