# SmartPosTEF Package Manager v2.0.39 (Tauri Edition)

A lightweight desktop application for managing and deploying SmartPosTEF packages to JFrog Artifactory. Built with **Tauri** for dramatically smaller bundle size (~18MB vs ~170MB with Electron) and improved performance.

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
|---------|-------------|
| **SPF Import** | Drag-and-drop or file picker to import `.spf` files with automatic parsing |
| **Edit Release** | Modify version, date, type, release notes, and packages of existing releases |
| **Package Accordions** | Platform-grouped collapsible sections with tabbed views, device lists, and card grids |
| **Delete from JFrog** | Remove individual packages from JFrog Artifactory directly from the UI |
| **Add Packages** | Add new packages to an imported release with automatic metadata detection |

**Tools** provides utility functions:

| Tool | Description |
|------|-------------|
| **Daily Password Generator** | Generates 6-char hex passwords using Algorithm v3.1 (hash-based mixing) |

**Advanced Options** provides configuration management:

| Feature | Description |
|---------|-------------|
| **Custom Devices** | Create, view, and delete custom device platforms for use in releases |

**Additional Features** include releases management (view, manage, delete saved releases), HTML generation for landing pages, comprehensive settings management, data export/import (v2 with SPF portability) for backup and migration, and dark/light mode toggle.

### Package Detection

The application automatically detects and categorizes packages based on file naming conventions:

| Package Type | Prefix Pattern | Example |
|--------------|----------------|---------|
| STA Android Production | LP, AP | SmartPosTef-LP-DX4000-2.5.1.289844-release.apk |
| STA Android Development | LD, AD | AditumTef-LD-P2-2.5.1.289844-debug.zip |
| Windows Installer/Library | P, D | AditumTEF-installer-P-2.5.1.289844-x86-offline.exe |
| Linux 64-bit | amd64, x86_64 | AditumTEFLib-P-amd64-2.5.1.289844-1.zip |
| Linux 32-bit | i386 | AditumTEF-installer-P-2.5.1.289844-i386-offline |
| S920 Embedded (new format) | P-S920, D-S920 | SmartPosTef-P-S920-2.5.1.138693.zip |
| S920 Embedded (legacy) | P, D | SmartPosTef-P-2.5.1.138693.zip |

### Special Upload Handling

Some packages require extraction before upload rather than direct file upload:

**Windows Online Installer Companions** are ZIP files that accompany online installers. Their contents are extracted and the inner folder is uploaded:

| File Name | Action | JFrog Destination |
|-----------|--------|-------------------|
| Linux_64-Gui-Installer.zip | Extract `x86_64/` folder and upload | `packages/{path}/x86_64/` |
| Linux_i386-Installer.zip | Extract `i386/` folder and upload | `packages/{path}/i386/` |
| x86.zip | Extract contents into `x86/` folder and upload | `packages/{path}/x86/` |

These companion files are automatically excluded from SPF export since they are supplementary to the main installer.

**S920 Unsigned Packages** require special extraction handling. The ZIP file (which may or may not contain an intermediate folder like `PAX_S920/`) is always extracted to a **flat folder** named after the ZIP file (without the `.zip` extension). Only files are placed in the destination folder; any intermediate directory structure inside the ZIP is stripped.

| Scenario | ZIP Contents | Upload Result |
|----------|-------------|---------------|
| Production unsigned | `SmartPosTef-P-S920-2.5.1.138693.zip` | `packages/unsigned/pax/s920/SmartPosTef-P-S920-2.5.1.138693/{files}` |
| Dev unsigned | `SmartPosTef-D-S920-2.5.1.138693.zip` | `packages/dev/pax/s920/SmartPosTef-D-S920-2.5.1.138693.zip` (direct upload) |
| Production signed | `SmartPosTef-P-S920-2.5.1.138693_sign.zip` | `packages/pax/s920/SmartPosTef-P-S920-2.5.1.138693_sign.zip` (direct upload) |

For unsigne productions S920 packages, the extraction logic handles both cases:
- ZIP with subfolder (e.g., `PAX_S920/AditumApps.aup`) → extracts `AditumApps.aup` to folder root
- ZIP with files at root (e.g., `AditumApps.aup`) → extracts `AditumApps.aup` to folder root

Signed S920 packages (`_sign.zip`) or development are uploaded directly without extraction.

### Client Mapping

The application extracts client map numbers from version strings to generate correct JFrog paths. For example, in the version string `2.5.1.788.502702`, the number `788` is the client map number. If configured with mapping `788 → Lyra`, the JFrog path becomes `packages/sunmi/p2/launcher/lyra`.

## Prerequisites

### System Dependencies (Ubuntu 22.04 / Debian)

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

### Rust

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source "$HOME/.cargo/env"
```

Verifique a instalação:

```bash
rustc --version
cargo --version
```

### Node.js (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifique:

```bash
node -v
npm -v
```

### Tauri CLI

```bash
cargo install tauri-cli --version "^2"
```

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

### Build para Linux

**Apenas executável (sem bundle):**

```bash
cargo tauri build --no-bundle
```

O executável será gerado em:

```
src-tauri/target/release/smartpostef-package-manager
```

**Com bundles (.deb, .AppImage, .rpm):**

```bash
cargo tauri build
```

Os pacotes serão gerados em:

```
src-tauri/target/release/bundle/
├── deb/
│   └── smartpostef-package-manager_x.x.x_amd64.deb
├── appimage/
│   └── smartpostef-package-manager_x.x.x_amd64.AppImage
└── rpm/
    └── smartpostef-package-manager-x.x.x-1.x86_64.rpm
```

### Build para Windows (Cross-Compilation a partir do Linux)

A cross-compilation do Linux para Windows gera um instalador NSIS (`.exe`). Instaladores MSI **não** podem ser gerados via cross-compilation.

**1. Instalar dependências de cross-compilation:**

```bash
sudo apt install -y nsis lld llvm clang
```

> **Importante:** O pacote `clang` é necessário pois o `cargo-xwin` usa `clang-cl` como compilador C/C++ compatível com MSVC para compilar dependências nativas. Sem ele, o build falhará com o erro `failed to find tool "clang-cl"`.

**2. Adicionar o target Windows ao Rust:**

```bash
rustup target add x86_64-pc-windows-msvc
```

**3. Instalar cargo-xwin:**

```bash
cargo install --locked cargo-xwin
```

**4. Compilar para Windows:**

```bash
cargo tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc
```

O instalador NSIS será gerado em:

```
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
└── smartpostef-package-manager_x.x.x_x64-setup.exe
```

O executável standalone (sem instalador) estará em:

```
src-tauri/target/x86_64-pc-windows-msvc/release/smartpostef-package-manager.exe
```

### Resumo dos Comandos de Build

| Objetivo | Comando |
|----------|---------|
| Dev mode (Linux) | `cargo tauri dev` |
| Build Linux (executável) | `cargo tauri build --no-bundle` |
| Build Linux (com bundles) | `cargo tauri build` |
| Build Windows (cross-compile) | `cargo tauri build --runner cargo-xwin --target x86_64-pc-windows-msvc` |

### Solução de Problemas

| Erro | Solução |
|------|---------|
| `webkit2gtk-4.1 not found` | `sudo apt install libwebkit2gtk-4.1-dev` |
| `failed to run custom build command for openssl-sys` | `sudo apt install libssl-dev pkg-config` |
| `linker 'cc' not found` | `sudo apt install build-essential` |
| `NSIS not found` | `sudo apt install nsis` |
| `linker lld-link not found` | `sudo apt install lld llvm` |
| `failed to find tool "clang-cl"` | `sudo apt install clang` |
| `version mismatched Tauri packages` | `rm -rf node_modules package-lock.json && npm install` |
| `failed to read plugin permissions` | `cd src-tauri && cargo clean && cd .. && cargo tauri build` |
| Primeira compilação muito lenta | Normal — baixa e compila todas as dependências Rust (5-15 min). Builds subsequentes são rápidos. |

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
├── package.json                # Node.js dependencies
├── CHANGELOG.md                # Version history
├── README.md                   # This file
└── DOCUMENTATION.md            # Comprehensive documentation
```

## Performance Comparison

The migration from Electron to Tauri resulted in significant improvements:

| Metric | Electron | Tauri | Improvement |
|--------|----------|-------|-------------|
| Bundle Size | ~170 MB | ~18 MB | 89% smaller |
| Memory Usage | ~200 MB | ~50 MB | 75% less |
| Startup Time | Slow | Fast | Significant |
| Security | Good | Excellent | Rust backend |

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

### Recent Versions

| Version | Date | Highlights |
|---------|------|------------|
| 2.0.41 | 2026-02-09 | Per-execution rotative logging, "Não assinados" badge on unsigned releases, fixed S920 folder links in HTML |
| 2.0.40 | 2026-02-09 | Restored markdown rendering in release notes, improved modal contrast, fixed HTML favicon |
| 2.0.39 | 2026-02-09 | Fixed toast cascade z-index/opacity, Online=green/Offline=yellow tags, widened modals to 80% |
| 2.0.38 | 2026-02-09 | S920 unsigned flat extraction (strips PAX_S920 subfolder), styled STA device tags, Open/Find on Data Export toast |
| 2.0.37 | 2026-02-09 | S920 unsigned extract-and-upload workflow, SPF filter fixes for S920 packages |
| 2.0.36 | 2026-02-09 | S920 new filename format detection (SmartPosTef-{P|D}-S920-{version}) |
| 2.0.35 | 2026-02-09 | Toast Open/Find buttons, API key AES-256-GCM encryption on export, Release Summary redesign, eye toggle fix |
| 2.0.34 | 2026-02-06 | NSIS installer icon and version fix, version synchronization across all config files |
| 2.0.33 | 2026-02-06 | Fixed Windows taskbar icon resolution, fixed Windows dropdown select styling |
| 2.0.32 | 2026-02-06 | HTML release notes now render Markdown properly, complete build guide in README |
| 2.0.31 | 2026-02-06 | Cascade toast notifications, fixed SPF save path, open folder buttons in Settings |
| 2.0.30 | 2026-02-06 | Markdown rendering in release notes modal, Finalize Release workflow replacing Generate SPF |
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
