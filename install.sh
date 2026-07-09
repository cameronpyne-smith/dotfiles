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

# WezTerm checks $XDG_CONFIG_HOME (default ~/.config)/wezterm/wezterm.lua on
# every platform, ahead of ~/.wezterm.lua: https://wezterm.org/config/files.html
wezterm_dir="${XDG_CONFIG_HOME:-$HOME/.config}/wezterm"
mkdir -p "$wezterm_dir"
link "$script_dir/wezterm/wezterm.lua" "$wezterm_dir/wezterm.lua"

echo
echo "Done."
