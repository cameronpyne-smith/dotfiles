#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Symlinks the tracked Claude Code config files into ~/.claude.

.DESCRIPTION
    The repo is the source of truth. Every file in ./claude is symlinked into
    %USERPROFILE%\.claude so editing the repo copy updates the live config.
    Re-run any time you add a new file to ./claude. Idempotent.

    Symlink creation on Windows requires elevation, so run this from an
    elevated PowerShell (Run as Administrator).
#>

[CmdletBinding()]
param(
    # Overwrite an existing real file without prompting (a .bak copy is kept).
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

# --- Require admin (symlinks need it on Windows) ---------------------------
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Error "This script must be run from an elevated PowerShell (Run as Administrator)."
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

# --- Link each file in ./claude --------------------------------------------
$files = Get-ChildItem -File -Path $sourceDir
foreach ($file in $files) {
    $target = Join-Path $targetDir $file.Name
    $existing = Get-Item -LiteralPath $target -ErrorAction SilentlyContinue

    if ($existing) {
        # Already the correct symlink? Skip.
        if ($existing.LinkType -eq 'SymbolicLink' -and $existing.Target -eq $file.FullName) {
            Write-Host "OK    $($file.Name) (already linked)"
            continue
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

Write-Host ""
Write-Host "Done. ~/.claude now links to $sourceDir"
