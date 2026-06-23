# dotfiles

Personal machine configuration, kept under version control.

## Layout

| Path | What it is | Installs to |
| --- | --- | --- |
| `claude/settings.json` | Claude Code user settings (model, theme, status line) | `~/.claude/settings.json` |
| `claude/statusline.js` | Custom status line: folder · git branch · context-token % | `~/.claude/statusline.js` |

## Claude status line

Shows the current folder, git branch, and session context usage as a
percentage of 100k tokens (green < 70%, yellow ≥ 70%, red ≥ 90%).

The status line is wired up by `claude/settings.json`:

```json
"statusLine": {
  "type": "command",
  "command": "node \"C:/Users/CameronPyne-Smith/.claude/statusline.js\""
}
```

> Note: that path is machine-specific. Update it if the home directory differs.

## Install

The install scripts symlink every file in `claude/` into `~/.claude/`, so the
repo stays the single source of truth — edit a file here and the live config
updates. Both scripts are idempotent and back up any existing real file to
`*.bak` before linking (pass `--force`/`-Force` to skip the backup).

**Windows** (run from an **elevated** PowerShell — symlinks need admin):

```powershell
.\install.ps1
```

**Linux / macOS**:

```bash
./install.sh
```

Add a new file to `claude/` and re-run the script to link it.

## Not tracked

Secrets and machine-local overrides are intentionally git-ignored:
`.credentials.json`, `settings.local.json`, `*.local.json`.
