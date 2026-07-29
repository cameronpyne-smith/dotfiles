#!/usr/bin/env node
// hotfix — cherry-pick merged commits onto the latest production tag and tag a hotfix release.
//
// Usage:  hotfix <commit>... [--base <tag>] [--push-branch] [--yes]
//   --base <tag>    branch off this tag instead of the latest production tag
//   --push-branch   also push the prod-hotfix branch (the tag alone carries the commits)
//   --yes           skip the confirmation prompt
//
// Pushing the tag is what triggers the production deploy. Everything before the
// confirmation prompt is reversible; nothing is pushed until you agree.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createInterface } from "node:readline";

const WORKTREE_ROOT = "C:\\code\\worktrees";
const BRANCH_PREFIX = "prod-hotfix-";
const TAG_GLOB = "refs/tags/v[0-9]*";

type TagRef = { name: string; date: number };
type Commit = { sha: string; short: string; subject: string };
type Options = {
  commits: string[];
  base: string | null;
  pushBranch: boolean;
  yes: boolean;
  dryRun: boolean;
};

const USAGE = `Usage: hotfix <commit>... [--base <tag>] [--dry-run] [--push-branch] [--yes]

  --base <tag>    branch off this tag instead of the latest production tag
  --dry-run       print what would happen and exit, changing nothing
  --push-branch   also push the prod-hotfix branch
  --yes           skip the confirmation prompt`;

export function parseArgs(argv: string[]): Options {
  const commits: string[] = [];
  let base: string | null = null;
  let pushBranch = false;
  let yes = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--base") {
      base = argv[++i] ?? null;
      if (!base) throw new Error("--base needs a tag name");
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--push-branch") {
      pushBranch = true;
    } else if (arg === "--yes" || arg === "-y") {
      yes = true;
    } else if (arg === "--help" || arg === "-h") {
      throw new Error(USAGE);
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown option ${arg}\n\n${USAGE}`);
    } else {
      commits.push(arg);
    }
  }

  if (commits.length === 0) throw new Error(`no commits given\n\n${USAGE}`);
  return { commits, base, pushBranch, yes, dryRun };
}

export function parseTagRefs(stdout: string): TagRef[] {
  const refs: TagRef[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    const [name, deref, own] = line.split("\t");
    const date = Number(deref || own || "0");
    if (!name || !Number.isFinite(date) || date === 0) continue;
    refs.push({ name, date });
  }
  return refs;
}

export function pickLatestTag(refs: TagRef[]): string | null {
  if (refs.length === 0) return null;
  const sorted = [...refs].sort((a, b) => (b.date - a.date) || b.name.localeCompare(a.name));
  return sorted[0].name;
}

export function todayBase(now: Date): string {
  const yy = String(now.getFullYear() % 100).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `v${yy}.${mm}.${dd}`;
}

export function nextSuffix(base: string, tagNames: string[]): number {
  const pattern = new RegExp(`^${base.replace(/\./g, "\\.")}\\.(\\d+)$`);
  let max = -1;
  for (const name of tagNames) {
    const m = pattern.exec(name.trim());
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max + 1;
}

export function branchName(shortSha: string): string {
  return `${BRANCH_PREFIX}${shortSha}`;
}

export function tagMessage(o: {
  tag: string;
  requestedBy: string;
  base: string;
  commits: Commit[];
}): string {
  const lines = [
    `Production hotfix ${o.tag}`,
    `Requested-by: ${o.requestedBy}`,
    `Correlation-Id: none`,
    `Tagged-by: hotfix`,
    `Base: ${o.base}`,
  ];
  for (const c of o.commits) lines.push(`Cherry-picked: ${c.short} ${c.subject}`);
  return lines.join("\n");
}

function fail(message: string): never {
  console.error(`hotfix: ${message}`);
  process.exit(1);
}

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitLoud(args: string[], cwd?: string): void {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

function gitOk(args: string[], cwd?: string): boolean {
  try {
    execFileSync("git", args, { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function confirm(prompt: string): Promise<boolean> {
  process.stderr.write(prompt);
  const rl = createInterface({ input: process.stdin, terminal: false });
  const answer = await new Promise<string>((resolve) => {
    let settled = false;
    const finish = (value: string): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    rl.once("line", finish);
    rl.once("close", () => finish(""));
  });
  rl.close();
  process.stderr.write("\n");
  return /^y(es)?$/i.test(answer.trim());
}

function resolveTag(base: string | null, repo: string): string {
  if (base) {
    if (!gitOk(["rev-parse", "--verify", `refs/tags/${base}`], repo)) {
      fail(`tag not found: ${base}`);
    }
    return base;
  }
  const refs = parseTagRefs(
    git(
      [
        "for-each-ref",
        TAG_GLOB,
        "--format=%(refname:short)\t%(*committerdate:unix)\t%(committerdate:unix)",
      ],
      repo,
    ),
  );
  const latest = pickLatestTag(refs);
  if (!latest) fail(`no release tags matching v[0-9]* in this repo; pass --base <tag>`);
  return latest;
}

function computeTag(repo: string): string {
  const base = todayBase(new Date());
  const names = git(["tag", "--list", `${base}.*`], repo).split("\n");
  return `${base}.${nextSuffix(base, names)}`;
}

function describe(sha: string, repo: string): Commit {
  const full = git(["rev-parse", "--verify", `${sha}^{commit}`], repo).trim();
  const subject = git(["log", "-1", "--format=%s", full], repo).trim();
  const short = git(["rev-parse", "--short", full], repo).trim();
  return { sha: full, short, subject };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return;
  }

  let opts: Options;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    fail((e as Error).message);
  }

  if (process.platform !== "win32") {
    fail(
      "must run under Windows node (node.exe) so it uses Windows git.\n" +
        "  Repos on C:\\ break if WSL git writes /mnt/c paths into .git/worktrees.",
    );
  }

  const repo = git(["rev-parse", "--show-toplevel"]).trim();
  if (!/^[A-Za-z]:/.test(repo)) {
    fail(`not a Windows-path repository (got "${repo}"); hotfix cannot drive a WSL-native repo`);
  }

  console.error(`Fetching tags...`);
  gitLoud(["fetch", "--tags", "--prune"], repo);

  const baseTag = resolveTag(opts.base, repo);

  const commits: Commit[] = [];
  for (const ref of opts.commits) {
    let c: Commit;
    try {
      c = describe(ref, repo);
    } catch {
      fail(`no such commit: ${ref}`);
    }
    if (!gitOk(["merge-base", "--is-ancestor", c.sha, "origin/main"], repo)) {
      fail(`${c.short} is not an ancestor of origin/main — refusing to ship an unmerged commit`);
    }
    if (gitOk(["merge-base", "--is-ancestor", c.sha, `refs/tags/${baseTag}`], repo)) {
      fail(`${c.short} is already in ${baseTag} — nothing to do`);
    }
    commits.push(c);
  }

  const branch = branchName(commits[0].short);
  if (gitOk(["rev-parse", "--verify", `refs/heads/${branch}`], repo)) {
    fail(`branch ${branch} already exists locally; delete it first (git branch -D ${branch})`);
  }

  const worktree = join(WORKTREE_ROOT, basename(repo), branch);
  if (existsSync(worktree)) fail(`worktree path already exists: ${worktree}`);

  let tag = computeTag(repo);

  console.error(`\n${"-".repeat(60)}`);
  console.error(`Repository   ${repo}`);
  console.error(`Base tag     ${baseTag}`);
  console.error(`New tag      ${tag}   <- pushing this deploys to production`);
  console.error(`Branch       ${branch}${opts.pushBranch ? " (will be pushed)" : " (local only)"}`);
  console.error(`Worktree     ${worktree}`);
  console.error(`Cherry-picking:`);
  for (const c of commits) console.error(`  ${c.short} ${c.subject}`);
  console.error(`${"-".repeat(60)}`);

  if (opts.dryRun) {
    console.error(`\nDry run — nothing created, nothing pushed.`);
    return;
  }

  console.error(`\nCreating worktree ${worktree}`);
  gitLoud(["worktree", "add", "-b", branch, worktree, `refs/tags/${baseTag}`], repo);

  for (const c of commits) {
    try {
      gitLoud(["cherry-pick", "-x", c.sha], worktree);
    } catch {
      console.error(
        `\nhotfix: cherry-pick of ${c.short} conflicted. The worktree has been left in place:\n` +
          `\n  ${worktree}\n` +
          `\nhotfix cannot resume, so pick one:\n` +
          `\n1. Abandon, then re-run hotfix (e.g. with a different --base or more commits):\n` +
          `     git -C "${repo}" worktree remove --force "${worktree}"\n` +
          `     git -C "${repo}" branch -D ${branch}\n` +
          `\n2. Resolve it there and finish by hand:\n` +
          `     git -C "${worktree}" cherry-pick --continue\n` +
          `     git -C "${worktree}" tag -a ${tag}\n` +
          `     git -C "${repo}" push origin refs/tags/${tag}\n` +
          `     git -C "${repo}" worktree remove "${worktree}"\n`,
      );
      process.exit(1);
    }
  }

  const requestedBy = git(["config", "user.email"], repo).trim() || "unknown";

  console.error(`\nCherry-pick clean on ${branch}.\n`);

  if (!opts.yes) {
    if (!(await confirm(`Push ${tag} and deploy? [y/N] `))) {
      console.error(`\nAborted. Cleaning up.`);
      gitLoud(["worktree", "remove", "--force", worktree], repo);
      gitLoud(["branch", "-D", branch], repo);
      process.exit(1);
    }
  }

  git(["fetch", "--tags", "--prune"], repo);
  const recomputed = computeTag(repo);
  if (recomputed !== tag) {
    console.error(`hotfix: ${tag} was taken while you confirmed; using ${recomputed}`);
    tag = recomputed;
  }

  gitLoud(["tag", "-a", tag, "-m", tagMessage({ tag, requestedBy, base: baseTag, commits })], worktree);

  try {
    gitLoud(["push", "origin", `refs/tags/${tag}`], repo);
  } catch {
    git(["tag", "-d", tag], repo);
    fail(`pushing ${tag} failed (a concurrent deploy may have claimed it). Nothing deployed; re-run.`);
  }

  if (opts.pushBranch) gitLoud(["push", "-u", "origin", branch], repo);

  gitLoud(["worktree", "remove", worktree], repo);

  console.error(`\nPushed ${tag} — the deploy pipeline is now running.`);
  console.error(`Local branch ${branch} kept, so a failed pipeline can be re-tagged.`);
  console.error(`Release notes post to Teams within 30 minutes via the release-notes cron.`);
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  await main();
}
