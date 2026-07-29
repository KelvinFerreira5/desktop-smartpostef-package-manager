# SmartPosTEF Package Manager v3.8.3 (Tauri Edition)

A lightweight desktop application for managing and deploying SmartPosTEF packages to JFrog Artifactory. Built with **Tauri** for dramatically smaller bundle size (~18MB vs ~170MB with Electron) and improved performance.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Core Functionality](#core-functionality)
  - [Package Detection](#package-detection)
  - [Special Upload Handling](#special-upload-handling)
  - [Client Mapping](#client-mapping)
- [Prerequisites](#prerequisites)
  - [Prerequisites (Linux)](#prerequisites-linux)
  - [Prerequisites (Windows)](#prerequisites-windows)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
  - [Build Scripts](#build-scripts)
  - [Build for Linux](#build-for-linux)
  - [Build for Windows (Cross-Compilation)](#build-for-windows-cross-compilation-from-linux)
  - [Build for Windows (Native)](#build-for-windows-native)
  - [Build Commands Summary](#build-commands-summary)
  - [Troubleshooting](#troubleshooting)
- [Installing on Linux Desktop](#installing-on-linux-desktop)
  - [Install via .deb](#install-via-deb)
  - [Install via AppImage](#install-via-appimage)
  - [Desktop Integration (AppImage)](#desktop-integration-appimage)
- [Project Structure](#project-structure)
- [Performance Comparison](#performance-comparison)
- [Version History](#version-history)
- [Documentation](#documentation)
- [License](#license)

## Overview

The SmartPosTEF Package Manager streamlines the process of uploading software packages to JFrog Artifactory. It automatically detects package types, generates correct upload paths, and creates SPF (SmartPosTEF Package File) manifests for releases.

## Features

### Core Functionality

**New Deploy** provides two workflow modes for uploading packages:

| Mode | Description |
|------|-------------|
| **New Release** | Full release workflow with version, date, release notes, and SPF file generation |
| **Upload Only** | Quick upload without creating a release record |

**Package Scanning** supports two methods for adding packages:

| Method | Description |
|--------|-------------|
| **Scan Folder** | Recursively scan a folder for all recognized package types |
| **Add Manually** | Select individual package files to add to the list |

**Import Release** allows importing existing `.spf` files or editing saved releases:

| Feature | Description |
| --------- | ------------- |
| **SPF Import** | Drag-and-drop or file picker to import `.spf` files with automatic parsing |
| **Edit Release** | Modify version, date, type, release notes, and packages of existing releases |
| **Upload Parity** | Edit Release uploads use the same package processing pipeline as New Release, including special handling (online companions extraction, S920 extract-root flow, and APK zip rules) |
| **Package Accordions** | Platform-grouped collapsible sections with tabbed views, device lists, and card grids |
| **Delete from JFrog** | Remove individual packages from JFrog Artifactory directly from the UI |
| **Add Packages** | Add new packages to an imported release with automatic metadata detection |

**Tools** provides utility functions:

| Tool | Description |
|------|-------------|
| **Pwd Gen** (Releases Portal Pass Generator) | Generates 6-char hex passwords using Algorithm v3.1 (hash-based mixing) |
| **ASCII to Hex** | General converter between Text (ASCII/ANSI), Hexadecimal, Base64, and Decimal |

**Build (Azure DevOps)** provides a unified, YAML-driven interface for running pipeline builds:

| Feature | Description |
| --------- | ------------- |
| **Unified Build Page** | Single page for both STA and A2A pipelines, auto-detected from branch name |
| **Dynamic Parameters** | Parameters, stages, and variables loaded from the pipeline YAML of the selected branch |
| **Sync YAML** | Manual re-fetch of pipeline definition with loading feedback |
| **Section Grouping** | Parameters grouped into semantic sections (General, Platforms, Devices, Build Options, Features) |
| **Device Cards** | Android devices rendered as chip toggles with inline intent category selects |
| **Interaction Rules** | Mutual exclusion and parent-child checkbox rules applied dynamically |
| **View Parameters** | Modal showing active build parameters grouped with chips, tags, and device lists |
| **Build-to-Release** | Download artifacts from completed builds, consolidate into a flat folder, and navigate to deploy page with pre-filled data |
| **Artifact Selection** | Preview modal with checkboxes to select which artifacts to download before creating a release |

**Additional Features** include releases management (view, manage, search, purge, and delete saved releases), release descriptions (optional subtitle for each release), HTML generation for landing pages, comprehensive settings management (including custom device platforms), data export/import (v2 with SPF portability) for backup and migration, and an 8-theme system (4 dark + 4 light themes with glassmorphism UI).

### Package Detection

The application automatically detects and categorizes packages based on file naming conventions:

| Package Type | Prefix Pattern | Example |
| -------------- | ---------------- | --------- |
| STA Android Production | LP, AP | SmartPosTef-LP-DX4000-2.5.1.289844-release.apk |
| STA Android Development | LD, AD | AditumTef-LD-P2-2.5.1.289844-debug.zip |
| Windows Installer/Library | P, D | AditumTEF-installer-P-2.5.1.289844-x86-offline.exe |
| Linux 64-bit | amd64, x86_64 | AditumTEFLib-P-amd64-2.5.1.289844-1.zip |
| Linux 32-bit | i386 | AditumTEF-installer-P-2.5.1.289844-i386-offline |
| S920 Embedded (new format) | P-S920, D-S920 | SmartPosTef-P-S920-2.5.1.138693.zip |
| S920 Embedded signed (client) | P-S920, D-S920 + signer | SmartPosTef-P-S920-2.5.1.138693-Martins_sign.zip |
| S920 Embedded (legacy) | P, D | SmartPosTef-P-2.5.1.138693.zip |
| A2A SDK Integration | A2A | AditumSdkIntegration-A2A-D-2.4.4+8e450cfb1-release.aar |
| A2A Device APK | A2A | SmartPosTef-A2A-D-L3-2.4.4+8e450cfb1-release_sign.apk |
| A2A Payment Example | A2A | PaymentExample-A2A-P-2.4.4+8e450cfb1-release.apk |
| A2A Payment Example (device) | A2A | PaymentExample-A2A-D-TefSdk-2.4.4+8e450cfb1-release.apk |

> **v2 naming convention**: Packages using the newer `+hexhash` format (e.g., `2.5.4+0d05ce0`) are fully supported alongside the legacy `.numericHash` format.
>
### Special Upload Handling

Some packages require extraction before upload rather than direct file upload:

**Windows Online Installer Companions** are ZIP files that accompany online installers. Their contents are extracted and the inner folder is uploaded:

| File Name | Action | JFrog Destination |
| ----------- | -------- | ------------------- |
| Linux_64-Gui-Installer.zip | Extract `x86_64/` folder and upload | `packages/{path}/x86_64/` |
| Linux_i386-Installer.zip | Extract `i386/` folder and upload | `packages/{path}/i386/` |
| x86.zip | Extract contents into `x86/` folder and upload | `packages/{path}/x86/` |

These companion files are automatically excluded from SPF export since they are supplementary to the main installer.

**S920 Unsigned Packages** require special extraction handling. The ZIP file (which may or may not contain an intermediate folder like `PAX_S920/`) is always extracted to a **flat folder** named after the ZIP file (without the `.zip` extension). Only files are placed in the destination folder; any intermediate directory structure inside the ZIP is stripped.

| Scenario | ZIP Contents | Upload Result |
| ---------- | ------------- | --------------- |
| Production unsigned | `SmartPosTef-P-S920-2.5.1.138693.zip` | `packages/unsigned/pax/s920/SmartPosTef-P-S920-2.5.1.138693/{files}` |
| Dev unsigned | `SmartPosTef-D-S920-2.5.1.138693.zip` | `packages/dev/pax/s920/SmartPosTef-D-S920-2.5.1.138693.zip` (direct upload) |
| Production signed | `SmartPosTef-P-S920-2.5.1.138693_sign.zip` | `packages/pax/s920/SmartPosTef-P-S920-2.5.1.138693_sign.zip` (direct upload) |

For unsigned production S920 packages, the extraction logic handles both cases:

- ZIP with subfolder (e.g., `PAX_S920/AditumApps.aup`) → extracts `AditumApps.aup` to folder root
- ZIP with files at root (e.g., `AditumApps.aup`) → extracts `AditumApps.aup` to folder root

Signed S920 packages (`_sign.zip`) or development are uploaded directly without extraction.

S920 signed packages also support client-signing suffixes (for example Martins, Entrepay, TecToy) before `_sign`, such as `SmartPosTef-P-S920-2.5.1.138693-Martins_sign.zip`. These signer names are detected and shown in Release Summary as signature/client badges together with the signed icon.

### Client Mapping

The application extracts client map numbers from version strings to generate correct JFrog paths. For example, in version `2.5.5788` (where `788` is appended to the patch segment), the number `788` is the client map number. If configured with mapping `788 → Lyra`, the JFrog path becomes `packages/sunmi/p2/launcher/lyra`.

#### Auto-Generate Client Number

Each mapping row has a **Generate (→) button** that deterministically derives a 3-digit decimal code from the client name using the **DJB2 hash algorithm**:

```
hash = 5381
for each character in UPPERCASE(name):
    hash = (hash × 33 + ASCII(character)) unsigned 32-bit
code = hash % 1000   →  zero-padded to 3 digits
```

| Client Name | Uppercased | Generated Code |
|-------------|------------|----------------|
| Lyra | LYRA | deterministic 3-digit value |
| Unica | UNICA | deterministic 3-digit value |

**Properties:**

- **Deterministic** — same name always produces the same code
- **Case-insensitive** — `lyra`, `Lyra`, `LYRA` all yield the same result
- **Collision-safe** — if the generated code is already used by another mapping, the algorithm increments by 1 (mod 1000) until a free slot is found
- **Overridable** — the number field remains editable; the generated value is just a suggestion

The layout of each mapping row is: **[Client Name] [→] [Client Number] [✕]**

## Prerequisites

### Prerequisites (Linux)

#### System Dependencies (Ubuntu 22.04 / Debian)

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Rust

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source "$HOME/.cargo/env"
```

Verifique a instalação:

```bash
rustc --version
cargo --version
```

#### Node.js (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifique:

```bash
node -v
npm -v
```

#### Tauri CLI

```bash
cargo install tauri-cli --version "^2"
```

### Prerequisites (Windows)

Para buildar nativamente no Windows (targets `msi` e `nsis`), instale as dependências abaixo. Recomenda-se Windows 10 (1803+) ou Windows 11.

| Dependência | Obrigatória | Finalidade |
| ------------- | ------------- | ------------ |
| Microsoft C++ Build Tools (MSVC) | Sim | Compilar o backend Rust (toolchain MSVC) |
| Microsoft Edge WebView2 Runtime | Sim (já incluso no Win10 1803+ / Win11) | Renderizar a interface da aplicação |
| Rust (rustup) | Sim | Toolchain de compilação do Tauri |
| Node.js LTS | Sim | Dependências do frontend (`npm install`) |
| Tauri CLI v2 | Sim | Comandos `cargo tauri dev` / `cargo tauri build` |
| VBSCRIPT (recurso opcional do Windows) | Somente para target `msi` | Requerido pelo WiX (`light.exe`) |

#### 1. Microsoft C++ Build Tools (MSVC)

Baixe o instalador do [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) e, durante a instalação, marque a workload **"Desktop development with C++"** (inclui o compilador MSVC e o Windows SDK).

Alternativamente, via `winget`:

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

#### 2. Microsoft Edge WebView2

> O WebView2 já vem instalado no Windows 10 (a partir da versão 1803) e no Windows 11 — nesses casos, pule esta etapa.

Se necessário, baixe o **Evergreen Bootstrapper** na [página de download do WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/), ou instale via `winget`:

```powershell
winget install Microsoft.EdgeWebView2Runtime
```

#### 3. Rust (toolchain MSVC)

Baixe e execute o [rustup-init.exe](https://www.rust-lang.org/tools/install) — no Windows, o toolchain padrão já é o `x86_64-pc-windows-msvc`. Ou instale via `winget`:

```powershell
winget install Rustlang.Rustup
```

Reinicie o terminal e verifique a instalação:

```powershell
rustc --version
cargo --version
```

#### 4. Node.js (LTS)

Baixe o instalador LTS no [site do Node.js](https://nodejs.org), ou instale via `winget`:

```powershell
winget install OpenJS.NodeJS.LTS
```

Verifique:

```powershell
node -v
npm -v
```

#### 5. Tauri CLI

```powershell
cargo install tauri-cli --version "^2"
```

#### 6. VBSCRIPT (apenas para instaladores MSI)

O target `msi` (WiX) requer o recurso opcional **VBSCRIPT** do Windows habilitado. Ele vem habilitado por padrão na maioria das instalações, mas pode ter sido desativado. Se ocorrer o erro `failed to run light.exe` ao buildar MSI:

1. Abra **Configurações** → **Aplicativos** → **Recursos opcionais** → **Mais recursos do Windows**
2. Localize **VBSCRIPT** na lista e garanta que esteja marcado
3. Clique em **Avançar** e reinicie o computador se solicitado

> O target `nsis` não depende do VBSCRIPT. A Tauri CLI baixa automaticamente as ferramentas WiX e NSIS na primeira build — não é necessário instalá-las manualmente.

#### Verificação do ambiente

Após instalar tudo, confirme que o ambiente está pronto:

```powershell
cargo tauri info
```

A saída deve indicar o WebView2 e o Visual Studio Build Tools detectados. Em seguida, siga para [Installation](#installation) e [Build for Windows (Native)](#build-for-windows-native).

## Installation

Clone ou extraia o projeto, depois instale as dependências:

```bash
cd smartpostef-package-manager-tauri
npm install
```

## Development

Execute a aplicação em modo de desenvolvimento com hot-reload:

```bash
cargo tauri dev
```

## Building

### Build Scripts

The project includes parameterized build scripts for both Linux and Windows:

#### Linux / macOS — `build.sh`

```bash
./build.sh [OPTIONS]
```

| Option | Description |
| -------- | ------------- |
| `-t, --target TARGET` | Build target: `deb`, `appimage`, `msi`, `nsis`, `all-linux`, `all-windows`, `all` (default: `all-linux`) |
| `-p, --platform PLAT` | Cross-compile platform: `linux`, `windows` (default: `linux`) |
| `-m, --mode MODE` | Build mode: `release`, `debug` (default: `release`) |
| `-i, --install` | Install after build (`.deb` only, requires sudo) |
| `-I, --integrate` | Integrate AppImage into desktop (icon, `.desktop` file, PATH). Can be used standalone to integrate an existing build |
| `-c, --clean` | Clean before build |
| `-v, --verbose` | Verbose output |
| `-h, --help` | Show help |

**Examples:**

```bash
./build.sh                            # Build all Linux targets (deb + appimage)
./build.sh -t deb                     # Build .deb only
./build.sh -t appimage                # Build AppImage only
./build.sh -t deb -i                  # Build .deb and install it
./build.sh -t appimage -I             # Build AppImage + integrate into desktop
./build.sh -I                         # Integrate existing AppImage (no build)
./build.sh -t all-windows -p windows  # Cross-compile for Windows (msi + nsis)
./build.sh -t all -c                  # Clean + build everything
./build.sh -m debug -t deb            # Debug build
```

#### Windows — `build.ps1`

```powershell
.\build.ps1 [OPTIONS]
```

| Option | Description |
| -------- | ------------- |
| `-Target <string>` | Build target: `msi`, `nsis`, `all-windows`, `deb`, `appimage`, `all-linux`, `all` (default: `all-windows`) |
| `-Mode <string>` | Build mode: `release`, `debug` (default: `release`) |
| `-Clean` | Clean before build |
| `-VerboseOutput` | Verbose output |
| `-Help` | Show help |

**Examples:**

```powershell
.\build.ps1                          # Build MSI + NSIS
.\build.ps1 -Target msi             # Build MSI only
.\build.ps1 -Target nsis            # Build NSIS installer only
.\build.ps1 -Clean                  # Clean + build all Windows targets
.\build.ps1 -Mode debug -Target msi # Debug build
```

> If execution policy blocks the script, run: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Build for Linux

**Executable only (no bundle):**

```bash
cargo tauri build --no-bundle
```

Output: `src-tauri/target/release/smartpostef-package-manager`

**With bundles (.deb, .AppImage):**

```bash
cargo tauri build
```

Output:

```
src-tauri/target/release/bundle/
├── deb/
│   └── SmartPosTEF Package Manager_x.x.x_amd64.deb
└── appimage/
    └── SmartPosTEF Package Manager_x.x.x_amd64.AppImage
```

### Build for Windows (Cross-Compilation from Linux)

Cross-compilation generates an NSIS installer (`.exe`). MSI installers **cannot** be generated via cross-compilation.

**1. Install cross-compilation dependencies:**

```bash
sudo apt install -y nsis lld llvm clang
```

> `clang` is required because `cargo-xwin` uses `clang-cl` as the MSVC-compatible C/C++ compiler.

**2. Add Windows target to Rust:**

```bash
rustup target add x86_64-pc-windows-msvc
```

**3. Install cargo-xwin:**

```bash
cargo install --locked cargo-xwin
```

**4. Build:**

```bash
cargo tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
```

Output:

```
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
└── SmartPosTEF Package Manager_x.x.x_x64-setup.exe
```

### Build for Windows (Native)

> Requires the dependencies listed in [Prerequisites (Windows)](#prerequisites-windows).

When building directly on Windows, both MSI and NSIS targets are available:

```powershell
.\build.ps1                    # Builds both MSI + NSIS
.\build.ps1 -Target msi       # MSI only
.\build.ps1 -Target nsis      # NSIS only
```

### Build Commands Summary

| Goal | Command |
| ------ | --------- |
| Dev mode (Linux) | `cargo tauri dev` |
| Build Linux (executable only) | `cargo tauri build --no-bundle` |
| Build Linux (deb + appimage) | `./build.sh` or `cargo tauri build` |
| Build + install .deb | `./build.sh -t deb -i` |
| Build + integrate AppImage | `./build.sh -t appimage -I` |
| Build Windows (cross-compile) | `./build.sh -t all-windows -p windows` |
| Build Windows (native) | `.\build.ps1` |

### Troubleshooting

| Error | Solution |
| ------- | --------- |
| `webkit2gtk-4.1 not found` | `sudo apt install libwebkit2gtk-4.1-dev` |
| `failed to run custom build command for openssl-sys` | `sudo apt install libssl-dev pkg-config` |
| `linker 'cc' not found` | `sudo apt install build-essential` |
| `NSIS not found` | `sudo apt install nsis` |
| `linker lld-link not found` | `sudo apt install lld llvm` |
| `failed to find tool "clang-cl"` | `sudo apt install clang` |
| `version mismatched Tauri packages` | `rm -rf node_modules package-lock.json && npm install` |
| `failed to read plugin permissions` | `cd src-tauri && cargo clean && cd .. && cargo tauri build` |
| First build very slow | Normal — downloads and compiles all Rust dependencies (5-15 min). Subsequent builds are fast. |

## Installing on Linux Desktop

### Install via .deb

The `.deb` package provides full system integration out of the box (icon, app menu entry, PATH):

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/SmartPosTEF\ Package\ Manager_3.8.1_amd64.deb
```

Or using the build script:

```bash
./build.sh -t deb -i
```

### Install via AppImage

AppImage requires no installation — just make it executable and run:

```bash
chmod +x "SmartPosTEF Package Manager_3.8.1_amd64.AppImage"
./"SmartPosTEF Package Manager_3.8.1_amd64.AppImage"
```

### Desktop Integration (AppImage)

To add the AppImage to your application launcher (KDE Plasma, GNOME, XFCE, etc.) with icon and terminal access, use the `-I` flag:

```bash
# Build and integrate in one step
./build.sh -t appimage -I

# Or integrate an already-built AppImage
./build.sh -I
```

This performs XDG-compliant integration (no sudo required):

| What | Location |
| ------ | ---------- |
| Binary | `~/.local/bin/smartpostef-package-manager` |
| Icons (32, 128, 256px) | `~/.local/share/icons/hicolor/{size}/apps/` |
| Desktop entry | `~/.local/share/applications/smartpostef-package-manager.desktop` |

**After integration:**

- The app appears in your application launcher (KDE Kickoff, GNOME Activities, etc.) with its icon
- Run from any terminal with: `smartpostef-package-manager`
- The integration is **permanent** — survives reboots and DE restarts
- Ensure `~/.local/bin` is in your PATH (add `export PATH="$HOME/.local/bin:$PATH"` to `~/.bashrc` or `~/.zshrc` if needed)

## Project Structure

```
smartpostef-package-manager-tauri/
├── src/                        # Frontend files
│   ├── index.html              # Main HTML page
│   ├── app.js                  # Frontend JavaScript (UI logic)
│   ├── styles/main.css         # CSS styling
│   ├── lib/marked.min.js       # Markdown parser library
│   └── assets/                 # Images and icons
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Main Rust code (commands, package detection)
│   │   └── main.rs             # Application entry point
│   ├── icons/                  # Application icons
│   ├── capabilities/           # Tauri security capabilities
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri configuration
├── build.sh                    # Linux/macOS build script (parameterized)
├── build.ps1                   # Windows build script (PowerShell)
├── package.json                # Node.js dependencies
├── CHANGELOG.md                # Version history
├── README.md                   # This file
├── DESIGN-SYSTEM.md            # UI design system reference
└── DOCUMENTATION.md            # Comprehensive documentation
```

## Performance Comparison

The migration from Electron to Tauri resulted in significant improvements:

| Metric | Electron | Tauri | Improvement |
| -------- | ---------- | ------- | ------------- |
| Bundle Size | ~170 MB | ~18 MB | 89% smaller |
| Memory Usage | ~200 MB | ~50 MB | 75% less |
| Startup Time | Slow | Fast | Significant |
| Security | Good | Excellent | Rust backend |

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Recent Versions

| Version | Date | Highlights |
| --------- | ------ | ------------ |
| 3.8.1 | 2026-07-24 | Linux bundle targets (`deb`, `appimage`), build scripts (`build.sh`, `build.ps1`), AppImage desktop integration (`-I` flag) |
| 3.8.0 | 2026-07-03 | Unified YAML-driven Build page, dynamic pipeline parameters from Azure DevOps YAML, auto-detect STA/A2A from branch |
| 3.2.2 | 2026-04-09 | Purge button (delete all packages from JFrog), release description field, search icon fix, A2A client extraction bugfix |
| 3.2.1 | 2026-04-09 | v2 package naming support (`+hexhash`), 23 new regex patterns, Linux `.tar` support |
| 3.2.0 | 2026-04-09 | 8-theme system (4 dark + 4 light), glassmorphism UI, vertical settings navigation, colorful accents |
| 3.1.23 | 2026-04-07 | STA/A2A toggles always visible in toolbar |
| 3.1.22 | 2026-04-07 | A2A upload path fix, dev release saved as production fix, editable fields in edit mode |
| 3.1.21 | 2026-04-02 | Link icon on package cards, JFrog path tooltip for new packages |
| 3.1.20 | 2026-04-02 | STA upload path structure rewrite, client folder support |
| 2.0.29 | 2026-02-06 | Fixed delete button, comprehensive logging for all frontend/backend actions |
| 2.0.28 | 2026-02-06 | Delete confirmation dialog now uses in-app modal instead of native OS dialog |
| 2.0.27 | 2026-02-06 | Fixed release summary A2A display names and icons, fixed online installer companion warnings |
| 2.0.26 | 2026-02-06 | Fixed SPF generation format to match spec (A2A, device names, version header) |
| 2.0.25 | 2026-02-05 | Folder selection no longer requires version entry first |
| 2.0.15 | 2026-01-27 | Fixed ZIP companion files nested folder structure extraction |
| 2.0.14 | 2026-01-27 | Fixed SPF generation error, fixed ZIP companion files upload (extract and upload folders) |
| 2.0.13 | 2026-01-26 | Updated JFrog URL, enhanced detailed logging, improved notifications with glow effects and sounds |
| 2.0.12 | 2026-01-26 | Chunked transfer encoding to bypass nginx size limits |
| 2.0.11 | 2026-01-26 | Streaming upload for large files, proper file logging system |
| 2.0.10 | 2026-01-23 | Reverted package card to v2.0.6 style, fixed window/taskbar icons |
| 2.0.0 | 2026-01-23 | Complete rewrite using Tauri framework |

## Documentation

For comprehensive documentation including technical details, usage instructions, and development notes, see [DOCUMENTATION.md](DOCUMENTATION.md).

## License

MIT License - Aditum Pagamentos
