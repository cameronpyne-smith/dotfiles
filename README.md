# dotfiles

Personal machine configuration, kept under version control.

## Layout

| Path | What it is | Installs to |
| --- | --- | --- |
| `claude/settings.json` | Claude Code user settings (model, theme, status line) | `~/.claude/settings.json` |
| `claude/statusline.js` | Custom status line: folder · git branch · context-token % | `~/.claude/statusline.js` |
| `shell/.inputrc` | Readline config: case-insensitive tab completion | `~/.inputrc` (WSL/Linux) |
| `shell/.bash_aliases` | Bash aliases | `~/.bash_aliases` (WSL/Linux) |
| `powershell/profile.ps1` | PowerShell profile (aliases, functions) | `$PROFILE.CurrentUserAllHosts` (Windows) |

## Install

The install scripts symlink every file in `claude/` into `~/.claude/`;
`install.sh` additionally links every file in `shell/` into `~`, and
`install.ps1` links `powershell/profile.ps1` to `$PROFILE.CurrentUserAllHosts`,
so the repo stays the single source of truth — edit a file here and the live config
updates. For WSL, run `./install.sh` from inside WSL (the links point at
`/mnt/c/code/dotfiles`). Both scripts are idempotent and back up any existing real file to
`*.bak` before linking (pass `--force`/`-Force` to skip the backup).

**Windows** (run from an **elevated** PowerShell — symlinks need admin):

```powershell
.\install.ps1
```

**Linux / macOS**:

```bash
./install.sh
```

Add a new file to `claude/` or `shell/` and re-run the script to link it.

## Not tracked

Secrets and machine-local overrides are intentionally git-ignored:
`.credentials.json`, `settings.local.json`, `*.local.json`.
