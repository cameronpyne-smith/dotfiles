#!/usr/bin/env bash
# Symlinks the tracked config files into place.
#
# The repo is the source of truth. Every file in ./claude is symlinked into
# $HOME/.claude, and every file in ./shell is symlinked into $HOME, so
# editing the repo copy updates the live config.
# Re-run any time you add a new file. Idempotent.
#
# Usage:  ./install.sh [--force]
#   --force   replace an existing real file without keeping a .bak copy
set -euo pipefail

force=0
[[ "${1:-}" == "--force" ]] && force=1

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

link() {
    local file="$1" target="$2"
    local name
    name="$(basename "$target")"

    # Already the correct symlink? Skip.
    if [[ -L "$target" && "$(readlink "$target")" == "$file" ]]; then
        echo "OK    $name (already linked)"
        return
    fi

    # Something is in the way.
    if [[ -e "$target" || -L "$target" ]]; then
        if [[ $force -eq 0 && ! -L "$target" ]]; then
            cp "$target" "$target.bak"
            echo "BAK   $name -> $name.bak"
        fi
        rm -f "$target"
    fi

    ln -s "$file" "$target"
    echo "LINK  $name -> $file"
}

link_dir() {
    local source_dir="$1" target_dir="$2"

    if [[ ! -d "$source_dir" ]]; then
        echo "Source directory not found: $source_dir" >&2
        exit 1
    fi

    mkdir -p "$target_dir"

    local file
    for file in "$source_dir"/* "$source_dir"/.[!.]*; do
        [[ -e "$file" ]] || continue          # nothing to link
        link "$file" "$target_dir/$(basename "$file")"
    done
}

link_dir "$script_dir/claude" "$HOME/.claude"
link_dir "$script_dir/shell" "$HOME"

config_dir="${XDG_CONFIG_HOME:-$HOME/.config}"
mkdir -p "$config_dir/wezterm"
link "$script_dir/wezterm/wezterm.lua" "$config_dir/wezterm/wezterm.lua"
link "$script_dir/starship/starship.toml" "$config_dir/starship.toml"

win_home="$(wslpath "$(cmd.exe /C 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')" 2>/dev/null || true)"
if [[ -n "$win_home" && -f "$win_home/.kube/config" ]]; then
    mkdir -p "$HOME/.kube"
    link "$win_home/.kube/config" "$HOME/.kube/config"
fi

# One git config for both sides: under WSL ~/.gitconfig points at the Windows
# one, which install.ps1 links to the repo, plus the credential helper only
# WSL can run. Missing includes are ignored, so Windows skips it.
if [[ -n "$win_home" ]]; then
    if [[ -e "$win_home/.gitconfig" ]]; then
        link "$win_home/.gitconfig" "$HOME/.gitconfig"
    else
        echo "SKIP  .gitconfig (run install.ps1 on Windows first)"
    fi
    link "$script_dir/git/wsl.gitconfig" "$HOME/.gitconfig.wsl"
else
    link "$script_dir/git/.gitconfig" "$HOME/.gitconfig"
fi

if [[ -n "$win_home" && -f "$win_home/AppData/Roaming/ordo/config.toml" ]]; then
    mkdir -p "$config_dir/ordo"
    link "$win_home/AppData/Roaming/ordo/config.toml" "$config_dir/ordo/config.toml"
fi

echo
echo "Done."
