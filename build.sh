#!/usr/bin/env bash
set -euo pipefail

# SmartPosTEF Package Manager - Build Script
# Usage: ./build.sh [OPTIONS]
#
# Options:
#   -t, --target TARGET    Build target: deb, appimage, msi, nsis, all-linux, all-windows, all (default: all-linux)
#   -p, --platform PLAT    Cross-compile platform: linux, windows (default: native)
#   -m, --mode MODE        Build mode: release, debug (default: release)
#   -i, --install          Install after build (deb only, requires sudo)
#   -I, --integrate        Integrate AppImage into desktop (icon, .desktop file, PATH)
#   -c, --clean            Clean before build
#   -v, --verbose          Verbose output
#   -h, --help             Show this help

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Defaults
TARGET="all-linux"
TARGET_SET=false
PLATFORM="linux"
MODE="release"
INSTALL=false
INTEGRATE=false
INTEGRATE_ONLY=false
CLEAN=false
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}[BUILD]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }

usage() {
    sed -n '3,13p' "$0" | sed 's/^# \?//'
    echo ""
    echo "Examples:"
    echo "  ./build.sh                          # Build all Linux targets (deb + appimage)"
    echo "  ./build.sh -t deb                   # Build .deb only"
    echo "  ./build.sh -t appimage              # Build AppImage only"
    echo "  ./build.sh -t deb -i                # Build .deb and install it"
    echo "  ./build.sh -t all-windows -p windows # Cross-compile for Windows (msi + nsis)"
    echo "  ./build.sh -t all -c                # Clean + build everything for current platform"
    echo "  ./build.sh -m debug -t deb          # Debug build"
    echo "  ./build.sh -t appimage -I             # Build AppImage + integrate into desktop"
    echo "  ./build.sh -I                          # Integrate existing AppImage (no build)"
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -t|--target)   TARGET="$2"; TARGET_SET=true; shift 2 ;;
        -p|--platform) PLATFORM="$2"; shift 2 ;;
        -m|--mode)     MODE="$2"; shift 2 ;;
        -i|--install)  INSTALL=true; shift ;;
        -I|--integrate) INTEGRATE=true; shift ;;
        -c|--clean)    CLEAN=true; shift ;;
        -v|--verbose)  VERBOSE=true; shift ;;
        -h|--help)     usage ;;
        *) error "Unknown option: $1"; usage ;;
    esac
done

# Standalone integration mode: -I without -t
if [[ "$INTEGRATE" == true && "$TARGET_SET" == false ]]; then
    INTEGRATE_ONLY=true
fi

# Validate inputs
valid_targets="deb appimage msi nsis all-linux all-windows all"
if [[ ! " $valid_targets " =~ " $TARGET " ]]; then
    error "Invalid target: $TARGET"
    error "Valid targets: $valid_targets"
    exit 1
fi

valid_platforms="linux windows"
if [[ ! " $valid_platforms " =~ " $PLATFORM " ]]; then
    error "Invalid platform: $PLATFORM"
    exit 1
fi

valid_modes="release debug"
if [[ ! " $valid_modes " =~ " $MODE " ]]; then
    error "Invalid mode: $MODE"
    exit 1
fi

# Resolve target list
resolve_targets() {
    case "$TARGET" in
        all-linux)   echo "deb appimage" ;;
        all-windows) echo "msi nsis" ;;
        all)         echo "deb appimage msi nsis" ;;
        *)           echo "$TARGET" ;;
    esac
}

# Check dependencies for Linux build
check_linux_deps() {
    local missing=()
    local pkgs=(
        "libwebkit2gtk-4.1-dev"
        "libgtk-3-dev"
        "libayatana-appindicator3-dev"
        "librsvg2-dev"
    )

    for pkg in "${pkgs[@]}"; do
        if ! dpkg -s "$pkg" &>/dev/null; then
            missing+=("$pkg")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        warn "Missing system dependencies: ${missing[*]}"
        echo ""
        echo "Install them with:"
        echo "  sudo apt install -y ${missing[*]}"
        echo ""
        read -rp "Install now? [y/N] " ans
        if [[ "$ans" =~ ^[Yy]$ ]]; then
            sudo apt update && sudo apt install -y "${missing[@]}"
        else
            error "Cannot build without dependencies."
            exit 1
        fi
    fi
}

# Check dependencies for Windows cross-compilation
check_windows_cross_deps() {
    if ! command -v cargo-xwin &>/dev/null; then
        error "cargo-xwin not found. Install with: cargo install cargo-xwin"
        exit 1
    fi

    if ! rustup target list --installed | grep -q "x86_64-pc-windows-msvc"; then
        warn "Adding Windows target..."
        rustup target add x86_64-pc-windows-msvc
    fi

    local missing=()
    for cmd in nsis lld clang; do
        if ! command -v "$cmd" &>/dev/null && ! dpkg -s "$cmd" &>/dev/null; then
            missing+=("$cmd")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        warn "Missing cross-compile dependencies: ${missing[*]}"
        echo "Install with: sudo apt install -y nsis lld clang"
        exit 1
    fi
}

# Check basic toolchain
check_toolchain() {
    if ! command -v cargo &>/dev/null; then
        error "cargo not found. Install Rust: https://rustup.rs"
        exit 1
    fi

    if ! command -v tauri &>/dev/null && ! npx tauri --version &>/dev/null 2>&1; then
        error "@tauri-apps/cli not found. Run: npm install"
        exit 1
    fi
}

# Build function
do_build() {
    local targets
    targets=$(resolve_targets)

    local build_args=()

    # Mode
    if [[ "$MODE" == "debug" ]]; then
        build_args+=(--debug)
    fi

    # Verbose
    if [[ "$VERBOSE" == true ]]; then
        build_args+=(-v)
    fi

    # Bundles
    for t in $targets; do
        build_args+=(--bundles "$t")
    done

    # Cross-compilation for Windows
    if [[ "$PLATFORM" == "windows" ]]; then
        build_args+=(--target x86_64-pc-windows-msvc)
    fi

    log "Building targets: $targets"
    log "Platform: $PLATFORM | Mode: $MODE"
    echo ""

    cargo tauri build "${build_args[@]}"
}

# Post-build: show output paths
show_output() {
    local targets
    targets=$(resolve_targets)
    local base="src-tauri/target"
    local mode_dir="release"
    [[ "$MODE" == "debug" ]] && mode_dir="debug"

    if [[ "$PLATFORM" == "windows" ]]; then
        base="$base/x86_64-pc-windows-msvc/$mode_dir/bundle"
    else
        base="$base/$mode_dir/bundle"
    fi

    echo ""
    ok "Build complete! Output:"
    echo ""

    for t in $targets; do
        local dir="$base/$t"
        if [[ -d "$dir" ]]; then
            while IFS= read -r -d '' f; do
                local size
                size=$(du -h "$f" | cut -f1)
                echo "  [$t] $f ($size)"
            done < <(find "$dir" -maxdepth 1 -type f \( -name "*.deb" -o -name "*.AppImage" -o -name "*.msi" -o -name "*.exe" \) -print0 2>/dev/null)
        fi
    done
    echo ""
}

# Install .deb
do_install() {
    if [[ "$INSTALL" == true ]]; then
        local deb
        deb=$(find src-tauri/target/release/bundle/deb -name "*.deb" 2>/dev/null | head -1)
        if [[ -n "$deb" ]]; then
            log "Installing $deb..."
            sudo dpkg -i "$deb"
            ok "Installed successfully!"
        else
            warn "No .deb file found to install."
        fi
    fi
}

# Integrate AppImage into desktop environment (XDG-compliant)
do_integrate() {
    if [[ "$INTEGRATE" != true ]]; then
        return
    fi

    local mode_dir="release"
    [[ "$MODE" == "debug" ]] && mode_dir="debug"

    local appimage
    appimage=$(find "src-tauri/target/$mode_dir/bundle/appimage" -maxdepth 1 -name "*.AppImage" -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)

    if [[ -z "$appimage" ]]; then
        warn "No AppImage found to integrate."
        return
    fi

    log "Integrating AppImage into desktop environment..."

    local bin_dir="$HOME/.local/bin"
    local icons_dir="$HOME/.local/share/icons/hicolor"
    local apps_dir="$HOME/.local/share/applications"
    local app_name="smartpostef-package-manager"

    # 1. Copy AppImage to ~/.local/bin/
    mkdir -p "$bin_dir"
    cp "$appimage" "$bin_dir/$app_name"
    chmod +x "$bin_dir/$app_name"
    ok "Copied AppImage to $bin_dir/$app_name"

    # 2. Install icons into XDG hicolor theme
    local icon_src="$SCRIPT_DIR/src-tauri/icons"

    mkdir -p "$icons_dir/32x32/apps"
    cp "$icon_src/32x32.png" "$icons_dir/32x32/apps/$app_name.png"

    mkdir -p "$icons_dir/128x128/apps"
    cp "$icon_src/128x128.png" "$icons_dir/128x128/apps/$app_name.png"

    mkdir -p "$icons_dir/256x256/apps"
    cp "$icon_src/128x128@2x.png" "$icons_dir/256x256/apps/$app_name.png"

    ok "Installed icons to $icons_dir/{32x32,128x128,256x256}/apps/"

    # 3. Create .desktop file
    mkdir -p "$apps_dir"
    cat > "$apps_dir/$app_name.desktop" << EOF
[Desktop Entry]
Name=SmartPosTEF Package Manager
Exec=$bin_dir/$app_name
Icon=$app_name
Type=Application
Categories=Development;Utility;
Comment=Desktop application for managing and deploying packages to JFrog
Terminal=false
StartupWMClass=smartpostef-package-manager
EOF
    chmod +x "$apps_dir/$app_name.desktop"
    ok "Created desktop entry: $apps_dir/$app_name.desktop"

    # 4. Update desktop database (if available)
    if command -v update-desktop-database &>/dev/null; then
        update-desktop-database "$apps_dir" 2>/dev/null || true
    fi

    # 5. Update icon cache (if available)
    if command -v gtk-update-icon-cache &>/dev/null; then
        gtk-update-icon-cache "$icons_dir" 2>/dev/null || true
    fi

    # 6. Check PATH
    if [[ ! ":$PATH:" =~ ":$bin_dir:" ]]; then
        echo ""
        warn "$bin_dir is not in your PATH."
        warn "Add this to your ~/.bashrc or ~/.zshrc:"
        echo ""
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
        echo ""
        warn "Then run: source ~/.bashrc  (or source ~/.zshrc)"
    fi

    echo ""
    ok "Desktop integration complete!"
    ok "The app should appear in your application launcher (KDE Kickoff, GNOME Activities, etc.)"
    ok "You can also run it from terminal: $app_name"
}

# Main
main() {
    log "SmartPosTEF Package Manager - Build Script"
    echo ""

    # Standalone integration: skip build if -I is used without build need
    if [[ "$INTEGRATE" == true && "$INTEGRATE_ONLY" == true ]]; then
        do_integrate
        return
    fi

    check_toolchain

    if [[ "$PLATFORM" == "linux" ]]; then
        check_linux_deps
    elif [[ "$PLATFORM" == "windows" ]]; then
        check_windows_cross_deps
    fi

    if [[ "$CLEAN" == true ]]; then
        log "Cleaning previous build..."
        cargo clean
        echo ""
    fi

    do_build
    show_output
    do_install
    do_integrate
}

main
