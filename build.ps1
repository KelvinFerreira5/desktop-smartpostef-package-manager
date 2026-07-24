# SmartPosTEF Package Manager - Build Script (Windows)
# Usage: .\build.ps1 [OPTIONS]
#
# Options:
#   -Target <string>    Build target: msi, nsis, all-windows, deb, appimage, all-linux, all (default: all-windows)
#   -Mode <string>      Build mode: release, debug (default: release)
#   -Clean              Clean before build
#   -Verbose            Verbose output
#   -Help               Show this help
#
# Examples:
#   .\build.ps1                        # Build MSI + NSIS
#   .\build.ps1 -Target msi            # Build MSI only
#   .\build.ps1 -Target nsis           # Build NSIS installer only
#   .\build.ps1 -Clean                 # Clean + build all Windows targets
#   .\build.ps1 -Mode debug -Target msi # Debug build

param(
    [ValidateSet("msi", "nsis", "deb", "appimage", "all-windows", "all-linux", "all")]
    [string]$Target = "all-windows",

    [ValidateSet("release", "debug")]
    [string]$Mode = "release",

    [switch]$Clean,
    [switch]$VerboseOutput,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

# Colors
function Log($msg)   { Write-Host "[BUILD] $msg" -ForegroundColor Cyan }
function Warn($msg)  { Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Err($msg)   { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Ok($msg)    { Write-Host "[OK]    $msg" -ForegroundColor Green }

function Show-Usage {
    Get-Content $PSCommandPath | Select-Object -Skip 1 | ForEach-Object {
        if ($_ -match '^#') { $_ -replace '^# ?' } else { return }
    }
    exit 0
}

if ($Help) { Show-Usage }

# Resolve targets
function Get-Targets {
    switch ($Target) {
        "all-windows" { return @("msi", "nsis") }
        "all-linux"   { return @("deb", "appimage") }
        "all"         { return @("msi", "nsis", "deb", "appimage") }
        default       { return @($Target) }
    }
}

# Check toolchain
function Test-Toolchain {
    if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
        Err "cargo not found. Install Rust: https://rustup.rs"
        exit 1
    }

    if (-not (Get-Command "tauri" -ErrorAction SilentlyContinue)) {
        $npxCheck = & npx tauri --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            Err "@tauri-apps/cli not found. Run: npm install"
            exit 1
        }
    }

    # Check Node/npm
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        Err "node not found. Install Node.js: https://nodejs.org"
        exit 1
    }
}

# Check Windows-specific prerequisites
function Test-WindowsDeps {
    # WebView2 is required on Windows (comes with Windows 11, may need install on Win10)
    $webview2 = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
    if (-not $webview2) {
        $webview2 = Get-ItemProperty -Path "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" -ErrorAction SilentlyContinue
    }
    if (-not $webview2) {
        Warn "WebView2 runtime not detected. It may be needed at runtime."
        Warn "Download: https://developer.microsoft.com/en-us/microsoft-edge/webview2/"
    }
}

# Build
function Invoke-Build {
    $targets = Get-Targets
    $buildArgs = @()

    if ($Mode -eq "debug") {
        $buildArgs += "--debug"
    }

    if ($VerboseOutput) {
        $buildArgs += "-v"
    }

    foreach ($t in $targets) {
        $buildArgs += "--bundles"
        $buildArgs += $t
    }

    Log "Building targets: $($targets -join ', ')"
    Log "Mode: $Mode"
    Write-Host ""

    $cmd = "cargo tauri build $($buildArgs -join ' ')"
    Log "Running: $cmd"
    Write-Host ""

    & cargo tauri build @buildArgs

    if ($LASTEXITCODE -ne 0) {
        Err "Build failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
}

# Show output
function Show-Output {
    $targets = Get-Targets
    $modeDir = if ($Mode -eq "debug") { "debug" } else { "release" }
    $base = "src-tauri\target\$modeDir\bundle"

    Write-Host ""
    Ok "Build complete! Output:"
    Write-Host ""

    foreach ($t in $targets) {
        $dir = Join-Path $base $t
        if (Test-Path $dir) {
            $extensions = switch ($t) {
                "msi"      { "*.msi" }
                "nsis"     { "*.exe" }
                "deb"      { "*.deb" }
                "appimage" { "*.AppImage" }
            }
            $files = Get-ChildItem -Path $dir -Filter $extensions -ErrorAction SilentlyContinue
            foreach ($f in $files) {
                $size = "{0:N1} MB" -f ($f.Length / 1MB)
                Write-Host "  [$t] $($f.FullName) ($size)"
            }
        }
    }
    Write-Host ""
}

# Main
function Main {
    Log "SmartPosTEF Package Manager - Build Script (Windows)"
    Write-Host ""

    # Set working directory to script location
    Set-Location $PSScriptRoot

    Test-Toolchain
    Test-WindowsDeps

    if ($Clean) {
        Log "Cleaning previous build..."
        & cargo clean
        Write-Host ""
    }

    Invoke-Build
    Show-Output
}

Main
