# dotfiles

Personal machine configuration, kept under version control.

## Layout

| Path | What it is | Installs to |
| --- | --- | --- |
| `claude/settings.json` | Claude Code user settings (model, theme, status line) | `~/.claude/settings.json` |
| `claude/statusline.js` | Custom status line: folder · git branch · context-token % | `~/.claude/statusline.js` |
| `commands/*` | Shell commands shared by PowerShell and bash — see [Commands](#commands) | Loaded as shell functions from the repo (not symlinked) |
| `shell/.inputrc` | Readline config: case-insensitive tab completion | `~/.inputrc` (WSL/Linux) |
| `shell/.bash_aliases` | Bash aliases + the `commands/` loader | `~/.bash_aliases` (WSL/Linux) |
| `shell/.dircolors` | ls colors: no background on other-writable dirs (`/mnt/c`) | `~/.dircolors` (WSL/Linux) |
| `powershell/profile.ps1` | PowerShell profile + the `commands/` loader | `$PROFILE.CurrentUserAllHosts` (Windows) |
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

## Commands

`commands/` holds shell commands shared by PowerShell and bash, so neither profile owns a
private copy. Both profiles walk the folder at startup and define a native function per file,
resolving the repo through the profile symlink — nothing here is symlinked itself, so adding a
command needs no re-install, just a new shell.

| Command | Signature | What it does |
| --- | --- | --- |
| `hotfix` | `hotfix <commit>... [--base <tag>] [--dry-run] [--push-branch] [--yes]` | Cherry-picks merged commits onto the latest release tag and tags a hotfix release. Asks before pushing; `--dry-run` shows the plan without creating anything. |
| `bastion` | `bastion` | SSHs onto the dev jumpbox via Azure Bastion. Exports `MSYS_NO_PATHCONV=1` so Git Bash doesn't mangle the `/subscriptions/...` resource id. |
| `run-everything` | `run-everything` | Opens Windows Terminal tabs running `run-eventstore-grpc`, `run-elastic` and `run-kibana`. |
| `run-eventstore-here` | `run-eventstore-here` | Runs KurrentDB in Docker with the current directory as the data dir (`pwd -W` in Git Bash so Docker gets a Windows path). |
| `run-elastic` | `run-elastic` | Starts the local Elasticsearch 7.17.3 install. |
| `run-kibana` | `run-kibana` | Starts the local Kibana 7.17.3 install. |

One-line wrappers are listed in `commands/aliases.conf` itself.

### Adding commands

| Add | Where | Loaded as |
| --- | --- | --- |
| Anything with real logic | `commands/<name>.ts` | `node <file>` (needs Node 22+) |
| A shell-only command | `commands/<name>.sh` | Git Bash on Windows, `bash` in WSL |
| A one-line wrapper | a `name=command` line in `commands/aliases.conf` | native function, no runtime cost |

The dividing line: **prefix + args belongs in `aliases.conf`; anything more graduates to a
command file.** TypeScript is the default — Node runs `.ts` directly, no build step. `.ps1` is
not supported. Files named `*.test.*` are skipped by the loader; run them with:

```bash
node --test "commands/*.test.ts"
```

## Not tracked

Secrets and machine-local overrides are intentionally git-ignored:
`.credentials.json`, `settings.local.json`, `*.local.json`.
