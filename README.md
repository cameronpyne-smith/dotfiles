# dotfiles

Personal machine configuration, kept under version control.

## Layout

| Path | What it is | Installs to |
| --- | --- | --- |
| `claude/settings.json` | Claude Code user settings (model, theme, status line) | `~/.claude/settings.json` |
| `claude/statusline.js` | Custom status line: folder · git branch · context-token % | `~/.claude/statusline.js` |
| `shell/.inputrc` | Readline config: case-insensitive tab completion | `~/.inputrc` (WSL/Linux) |
| `shell/.bash_aliases` | Bash aliases | `~/.bash_aliases` (WSL/Linux) |
| `shell/.dircolors` | ls colors: no background on other-writable dirs (`/mnt/c`) | `~/.dircolors` (WSL/Linux) |
| `powershell/profile.ps1` | PowerShell profile (aliases, functions) | `$PROFILE.CurrentUserAllHosts` (Windows) |
| `wezterm/wezterm.lua` | WezTerm config (theme, font, transparency) | `~/.config/wezterm/wezterm.lua` (all platforms) |
| `windows-terminal/settings.json` | Windows Terminal settings (theme, font, transparency) | Windows Terminal's `settings.json` — location auto-detected (Windows) |
| `starship/starship.toml` | Starship prompt config | `~/.config/starship.toml` (all platforms) |

## Install

The install scripts symlink each file to its install location, so the repo
stays the single source of truth. Idempotent; existing real files are backed
up to `*.bak` (pass `--force`/`-Force` to skip the backup). For WSL, run
`./install.sh` from inside WSL.

**Windows** (run from an **elevated** PowerShell — symlinks need admin):

```powershell
.\install.ps1
```

**Linux / macOS**:

```bash
./install.sh
```

## Not tracked

Secrets and machine-local overrides are intentionally git-ignored:
`.credentials.json`, `settings.local.json`, `*.local.json`.
