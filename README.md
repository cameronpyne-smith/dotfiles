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

Copy the files into `~/.claude/` (PowerShell):

```powershell
Copy-Item claude/settings.json   "$HOME/.claude/settings.json"
Copy-Item claude/statusline.js   "$HOME/.claude/statusline.js"
```

## Not tracked

Secrets and machine-local overrides are intentionally git-ignored:
`.credentials.json`, `settings.local.json`, `*.local.json`.
