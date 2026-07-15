#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Symlinks the tracked Claude Code config files into ~/.claude and the
    PowerShell profile into place.

.DESCRIPTION
    The repo is the source of truth. Every file in ./claude is symlinked into
    %USERPROFILE%\.claude, and ./powershell/profile.ps1 is symlinked to
    $PROFILE.CurrentUserAllHosts, so editing the repo copy updates the live
    config. Re-run any time you add a new file to ./claude. Idempotent.

    Symlink creation on Windows requires either Developer Mode or elevation.
    Enable Developer Mode (Settings > Privacy & security > For developers) and
    run this from a normal PowerShell as your own user. Avoid running elevated
    from a non-admin account: the shell runs as the admin user, so everything
    installs into that account's profile instead of yours.
#>

[CmdletBinding()]
param(
    # Overwrite an existing real file without prompting (a .bak copy is kept).
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# --- Require admin / symlinks permission ------------------------------------
$probe = Join-Path ([System.IO.Path]::GetTempPath()) ("symlink-probe-" + [System.IO.Path]::GetRandomFileName())
try {
    New-Item -ItemType SymbolicLink -Path $probe -Target $PSScriptRoot -ErrorAction Stop | Out-Null
    Remove-Item -LiteralPath $probe -Force
}
catch {
    Write-Error "Cannot create symlinks. Enable Developer Mode (Settings > Privacy & security > For developers), or run from an elevated PowerShell if this account is an administrator."
    exit 1
}

# --- Paths ------------------------------------------------------------------
$sourceDir = Join-Path $PSScriptRoot 'claude'
$targetDir = Join-Path $env:USERPROFILE '.claude'

if (-not (Test-Path $sourceDir)) {
    Write-Error "Source directory not found: $sourceDir"
    exit 1
}

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
    Write-Host "Created $targetDir"
}

function Link-File([System.IO.FileInfo]$file, [string]$target) {
    $existing = Get-Item -LiteralPath $target -ErrorAction SilentlyContinue

    if ($existing) {
        # Already the correct symlink? Skip.
        if ($existing.LinkType -eq 'SymbolicLink' -and $existing.Target -eq $file.FullName) {
            Write-Host "OK    $($file.Name) (already linked)"
            return
        }

        # A real file (or wrong link) is in the way.
        if (-not $Force -and $existing.LinkType -ne 'SymbolicLink') {
            $backup = "$target.bak"
            Copy-Item -LiteralPath $target -Destination $backup -Force
            Write-Host "BAK   $($file.Name) -> $($file.Name).bak"
        }
        Remove-Item -LiteralPath $target -Force
    }

    New-Item -ItemType SymbolicLink -Path $target -Target $file.FullName | Out-Null
    Write-Host "LINK  $($file.Name) -> $($file.FullName)"
}

# --- Link each file in ./claude --------------------------------------------
foreach ($file in Get-ChildItem -File -Path $sourceDir) {
    Link-File $file (Join-Path $targetDir $file.Name)
}

# --- Link the PowerShell profile --------------------------------------------
$profileSource = Get-Item (Join-Path $PSScriptRoot 'powershell\profile.ps1')
$profileTarget = $PROFILE.CurrentUserAllHosts
$profileDir = Split-Path $profileTarget
if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir | Out-Null
}
Link-File $profileSource $profileTarget

# --- Link the WezTerm config -------------------------------------------------
$weztermSource = Get-Item (Join-Path $PSScriptRoot 'wezterm\wezterm.lua')
$weztermDir = Join-Path $env:USERPROFILE '.config\wezterm'
if (-not (Test-Path $weztermDir)) {
    New-Item -ItemType Directory -Path $weztermDir | Out-Null
}
Link-File $weztermSource (Join-Path $weztermDir 'wezterm.lua')

# --- Link the Windows Terminal settings --------------------------------------
# Covers packaged installs (Store/winget, incl. Preview) and unpackaged ones
# (Scoop/Chocolatey), which keep settings in different locations.
$wtSource = Get-Item (Join-Path $PSScriptRoot 'windows-terminal\settings.json')
# The unpackaged dir also exists on packaged installs (it holds profile
# fragments), so it only counts as a target if it already has a settings.json.
$wtUnpackaged = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows Terminal'
$wtDirs = @(
    Get-ChildItem -Directory -Path (Join-Path $env:LOCALAPPDATA 'Packages') -Filter 'Microsoft.WindowsTerminal*' -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName 'LocalState' } |
        Where-Object { Test-Path $_ }
    if (Test-Path (Join-Path $wtUnpackaged 'settings.json')) { $wtUnpackaged }
)

if ($wtDirs) {
    foreach ($dir in $wtDirs) {
        Link-File $wtSource (Join-Path $dir 'settings.json')
    }
}
else {
    Write-Host "SKIP  settings.json (Windows Terminal not installed)"
}

# --- Link the starship config ------------------------------------------------
$starshipSource = Get-Item (Join-Path $PSScriptRoot 'starship\starship.toml')
$configDir = Join-Path $env:USERPROFILE '.config'
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir | Out-Null
}
Link-File $starshipSource (Join-Path $configDir 'starship.toml')

Write-Host ""
Write-Host "Done. ~/.claude now links to $sourceDir"
