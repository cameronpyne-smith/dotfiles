#!/usr/bin/env node
// Claude Code status line: shows current folder + session context-token usage.
// Receives a JSON blob on stdin from Claude Code.

const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execSync, spawn } = require("child_process");

const USAGE_CACHE_DIR = path.join(os.homedir(), ".cache", "claude-statusline");
const USAGE_CACHE = path.join(USAGE_CACHE_DIR, "usage.json");
const USAGE_LOCK = path.join(USAGE_CACHE_DIR, "usage.lock");
const USAGE_TTL = 180;
const USAGE_LOCK_TTL = 30;
const USAGE_RATE_LIMIT_BACKOFF = 300;

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

function bar(pct, width = 5) {
  const filled = Math.min(width, Math.max(0, Math.round((pct / 100) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function usagePart(label, rl) {
  if (!rl || rl.used_percentage == null) return null;
  const pct = Math.round(rl.used_percentage);
  return color(`${label} ${bar(pct)} ${pct}%`, pct);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function fableUsage() {
  const cache = readJson(USAGE_CACHE);
  const now = Date.now() / 1000;
  if (!cache || now - (cache.fetchedAt || 0) >= USAGE_TTL) {
    const lock = readJson(USAGE_LOCK);
    if (!lock || lock.blockedUntil <= now) {
      try {
        fs.mkdirSync(USAGE_CACHE_DIR, { recursive: true });
        fs.writeFileSync(USAGE_LOCK, JSON.stringify({ blockedUntil: now + USAGE_LOCK_TTL }));
        spawn(process.execPath, [__filename, "--refresh-usage"], { detached: true, stdio: "ignore" }).unref();
      } catch { }
    }
  }
  if (!cache?.fable) return null;
  return { used_percentage: cache.fable.percent, resets_at: Date.parse(cache.fable.resetsAt) / 1000 };
}

function refreshUsage() {
  const creds = readJson(path.join(os.homedir(), ".claude", ".credentials.json"));
  const token = creds?.claudeAiOauth?.accessToken;
  if (!token) return;
  const req = https.request(
    {
      hostname: "api.anthropic.com",
      path: "/api/oauth/usage",
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "anthropic-beta": "oauth-2025-04-20" },
      timeout: 5000,
    },
    (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        const now = Date.now() / 1000;
        try {
          fs.mkdirSync(USAGE_CACHE_DIR, { recursive: true });
          if (res.statusCode === 429) {
            const retry = parseInt(res.headers["retry-after"], 10);
            fs.writeFileSync(USAGE_LOCK, JSON.stringify({ blockedUntil: now + (retry > 0 ? retry : USAGE_RATE_LIMIT_BACKOFF) }));
            return;
          }
          if (res.statusCode !== 200) return;
          const data = JSON.parse(body);
          const fable = (data.limits || []).find(
            (l) =>
              l?.kind === "weekly_scoped" &&
              (l?.scope?.model?.display_name || "").toLowerCase().includes("fable")
          );
          const cache = { fetchedAt: now };
          if (fable && (fable.percent || fable.resets_at)) {
            cache.fable = { percent: fable.percent ?? 0, resetsAt: fable.resets_at };
          }
          fs.writeFileSync(USAGE_CACHE, JSON.stringify(cache));
          fs.rmSync(USAGE_LOCK, { force: true });
        } catch { }
      });
    }
  );
  req.on("error", () => { });
  req.on("timeout", () => req.destroy());
  req.end();
}

function pace(rl, windowSec) {
  if (!rl || rl.used_percentage == null || !rl.resets_at) return null;
  const start = rl.resets_at - windowSec;
  const frac = Math.min(1, Math.max(0, (Date.now() / 1000 - start) / windowSec));
  const pct = Math.round(rl.used_percentage);
  return { pct, delta: pct - frac * 100, frac };
}

const paceColor = (s, delta) => {
  const c = delta > 0 ? 31 : delta > -10 ? 33 : 32;
  return `\x1b[${c}m${s}\x1b[0m`;
};

function pacePart(label, rl, windowSec, w) {
  const p = pace(rl, windowSec);
  if (!p) return usagePart(label, rl);
  const filled = Math.min(w, Math.max(0, Math.round((p.pct / 100) * w)));
  const chars = [];
  for (let i = 0; i < w; i++) chars.push(i < filled ? "█" : "░");
  chars[Math.min(w - 1, Math.floor(p.frac * w))] = "┊";
  const deltaTxt = p.delta >= 0 ? `▲${Math.round(p.delta)}%` : `▼${Math.round(-p.delta)}%`;
  return paceColor(`${label} ${chars.join("")} ${p.pct}% ${deltaTxt}`, p.delta);
}

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function gitStatus(dir) {
  try {
    const out = execSync("git status --porcelain --branch", {
      cwd: dir,
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 1000,
    }).toString();
    const lines = out.split("\n");
    const header = lines[0] || "";
    const dirty = lines.slice(1).some((l) => l.trim().length > 0);
    const m = header.match(/^## (?:No commits yet on )?([^.\s]+)/);
    const branch = m && m[1] !== "HEAD" ? m[1] : null;
    return { branch, dirty };
  } catch {
    return { branch: null, dirty: false };
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
  const { branch, dirty } = gitStatus(dir);

  const parts = [];
  parts.push(cyan(folder));

  if (branch) {
    parts.push(dirty ? yellow(`${branch} ●`) : magenta(branch));
  }

  const pct = Math.round(((tokens || 0) / limit) * 100);
  parts.push(color(`${pct}%`, pct));

  const model = data?.model?.display_name;
  if (model) parts.push(orange(model));

  const usage = [
    pacePart("5h", data?.rate_limits?.five_hour, 5 * 3600, 7),
    pacePart("7d", data?.rate_limits?.seven_day, 7 * 24 * 3600, 7),
    pacePart("F7d", fableUsage(), 7 * 24 * 3600, 7),
  ].filter(Boolean);

  const lines = [parts.join(dim(" │ "))];
  if (usage.length) lines.push(usage.join(dim(" │ ")));
  process.stdout.write(lines.join("\n"));
}

if (process.argv[2] === "--refresh-usage") refreshUsage();
else main();
