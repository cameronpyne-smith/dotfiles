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

    Symlink creation on Windows requires elevation, so run this from an
    elevated PowerShell (Run as Administrator).
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
    Write-Error "Cannot create symlinks. Run from an elevated PowerShell (Run as Administrator) or enable Developer Mode (Settings > Privacy & security > For developers)."
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

Write-Host ""
Write-Host "Done. ~/.claude now links to $sourceDir"
