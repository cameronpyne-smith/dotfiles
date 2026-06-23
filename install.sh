#!/usr/bin/env bash
# Symlinks the tracked Claude Code config files into ~/.claude.
#
# The repo is the source of truth. Every file in ./claude is symlinked into
# $HOME/.claude so editing the repo copy updates the live config.
# Re-run any time you add a new file to ./claude. Idempotent.
#
# Usage:  ./install.sh [--force]
#   --force   replace an existing real file without keeping a .bak copy
set -euo pipefail

force=0
[[ "${1:-}" == "--force" ]] && force=1

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source_dir="$script_dir/claude"
target_dir="$HOME/.claude"

if [[ ! -d "$source_dir" ]]; then
    echo "Source directory not found: $source_dir" >&2
    exit 1
fi

mkdir -p "$target_dir"

for file in "$source_dir"/*; do
    [[ -e "$file" ]] || continue          # nothing to link
    name="$(basename "$file")"
    target="$target_dir/$name"

    # Already the correct symlink? Skip.
    if [[ -L "$target" && "$(readlink "$target")" == "$file" ]]; then
        echo "OK    $name (already linked)"
        continue
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
done

echo
echo "Done. ~/.claude now links to $source_dir"
