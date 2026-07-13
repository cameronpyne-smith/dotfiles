#!/usr/bin/env node
// Claude Code status line: shows current folder + session context-token usage.
// Receives a JSON blob on stdin from Claude Code.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// ANSI helpers
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const magenta = (s) => `\x1b[35m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const orange = (s) => `\x1b[38;5;208m${s}\x1b[0m`;
const color = (s, pct) => {
  const c = pct >= 90 ? 31 : pct >= 70 ? 33 : 32; // red / yellow / green
  return `\x1b[${c}m${s}\x1b[0m`;
};

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function gitBranch(dir) {
  try {
    const b = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: dir,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000,
    })
      .toString()
      .trim();
    return b && b !== "HEAD" ? b : null;
  } catch {
    return null;
  }
}

function gitDirty(dir) {
  try {
    const out = execSync("git status --porcelain", {
      cwd: dir,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000,
    })
      .toString()
      .trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

function contextTokens(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return null;
  const lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
  // Scan from the end for the most recent message carrying usage data.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const u = obj?.message?.usage;
    if (u && (u.input_tokens != null || u.cache_read_input_tokens != null)) {
      return (
        (u.input_tokens || 0) +
        (u.cache_read_input_tokens || 0) +
        (u.cache_creation_input_tokens || 0)
      );
    }
  }
  return null;
}

function main() {
  let data = {};
  try {
    data = JSON.parse(readStdin() || "{}");
  } catch { }

  const dir =
    data?.workspace?.current_dir || data?.cwd || process.cwd() || "";
  const folder = path.basename(dir) || dir;

  const limit = 100_000;

  const tokens = contextTokens(data?.transcript_path);
  const branch = gitBranch(dir);

  const parts = [];
  parts.push(cyan(folder));

  if (branch) {
    const dirty = gitDirty(dir);
    parts.push(dirty ? yellow(`${branch} ●`) : magenta(branch));
  }

  const pct = Math.round(((tokens || 0) / limit) * 100);
  parts.push(color(`${pct}%`, pct));

  const model = data?.model?.display_name;
  if (model) parts.push(orange(model));

  process.stdout.write(parts.join(dim(" │ ")));
}

main();
