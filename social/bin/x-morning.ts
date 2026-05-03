#!/usr/bin/env tsx
/**
 * Daily morning routine for @genyousha_lab — runs unattended via launchd.
 *
 * 1. Reports current state: follows used today, queue position, last error.
 * 2. Executes a small follow batch (default 3) within the daily cap.
 * 3. Refreshes social/reply-queue.md from bell-list anchors (last 24h).
 *
 * Designed to be invoked headless on a schedule. Never throws — captcha /
 * network failures get logged and exit code is set, but the process always
 * cleans up. Requires X_BROWSER_PATH env (Brave) + .x-state.json cookies.
 */
import { resolve, join } from "node:path";
import { existsSync, appendFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { readStrategyQueue } from "../src/x-browser/strategy-parser.js";
import {
  readFollowLog,
  followedHandles,
  followsToday,
  DAILY_FOLLOW_CAP,
} from "../src/x-browser/follow-log.js";
import { statePath } from "../src/x-browser/session.js";

const repoRoot = resolve(process.cwd(), "..");
const LOG_PATH = join(repoRoot, "social/morning.log");

// Conservative: 3 follows/morning leaves headroom for an afternoon batch
// and stays well below the 8/day Lane-C cap.
const MORNING_FOLLOW_COUNT = 3;
const SCRAPE_MAX_AGE = "24h";
const SCRAPE_PER = 3;
// Only execute the follow batch when local time is within these hours.
// Scrape is read-only, runs anytime. Guard against launchd catch-up at
// 3am, --force flag bypasses for manual midday runs.
const FOLLOW_WINDOW_START_HOUR = 7;
const FOLLOW_WINDOW_END_HOUR = 12;

function ts(): string {
  return new Date().toISOString();
}

function log(line: string): void {
  const out = `[${ts()}] ${line}\n`;
  process.stdout.write(out);
  appendFileSync(LOG_PATH, out, "utf-8");
}

function runScript(
  cmd: string,
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv } = { cwd: repoRoot },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolveRun) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) =>
      resolveRun({ code: code ?? -1, stdout, stderr }),
    );
    child.on("error", (err) =>
      resolveRun({ code: -1, stdout, stderr: stderr + "\n" + err.message }),
    );
  });
}

async function main() {
  log("=== morning routine start ===");

  // --- preflight ---
  const sPath = statePath(repoRoot);
  if (!existsSync(sPath)) {
    log("ABORT: no saved X session at " + sPath + ". Run `npm run x:login`.");
    process.exit(2);
  }
  if (!process.env.X_BROWSER_PATH) {
    log(
      "WARN: X_BROWSER_PATH not set; will use Playwright bundled Chromium " +
        "(Google login often blocks it).",
    );
  }

  // --- state report ---
  const queue = readStrategyQueue(repoRoot);
  const flog = readFollowLog(repoRoot);
  const done = followedHandles(flog);
  const todayCount = followsToday(flog);
  const remaining = queue.filter((e) => !done.has(e.handle.toLowerCase()));
  log(
    `state: follows_today=${todayCount}/${DAILY_FOLLOW_CAP} ` +
      `queue_remaining=${remaining.length}/${queue.length} ` +
      `next=${remaining.slice(0, 3).map((e) => "@" + e.handle).join(",")}`,
  );

  const headroom = Math.max(0, DAILY_FOLLOW_CAP - todayCount);
  const force = process.argv.includes("--force");
  const localHour = new Date().getHours();
  const inWindow =
    localHour >= FOLLOW_WINDOW_START_HOUR && localHour < FOLLOW_WINDOW_END_HOUR;
  const wantFollows = Math.min(MORNING_FOLLOW_COUNT, headroom, remaining.length);

  // --- step 1: follow batch ---
  if (!inWindow && !force) {
    log(
      `follow: skipping — local hour ${localHour} outside ` +
        `[${FOLLOW_WINDOW_START_HOUR},${FOLLOW_WINDOW_END_HOUR}). ` +
        `Pass --force to override.`,
    );
  } else if (wantFollows === 0) {
    log(`follow: skipping (cap=${DAILY_FOLLOW_CAP}, today=${todayCount}, queue=${remaining.length})`);
  } else {
    log(`follow: running x:follow-next --count ${wantFollows}`);
    const r = await runScript(
      "npx",
      ["tsx", "bin/x-follow-next.ts", "--count", String(wantFollows)],
      { cwd: repoRoot + "/social" },
    );
    for (const line of r.stdout.split("\n").filter(Boolean)) log("  follow> " + line);
    if (r.stderr.trim()) {
      for (const line of r.stderr.split("\n").filter(Boolean)) log("  follow!> " + line);
    }
    log(`follow: exit ${r.code}`);
  }

  // --- step 2: scrape anchors ---
  log(`scrape: running x:scrape-anchors --per ${SCRAPE_PER} --max-age ${SCRAPE_MAX_AGE}`);
  const s = await runScript(
    "npx",
    [
      "tsx",
      "bin/x-scrape-anchors.ts",
      "--per",
      String(SCRAPE_PER),
      "--max-age",
      SCRAPE_MAX_AGE,
    ],
    { cwd: repoRoot + "/social" },
  );
  for (const line of s.stdout.split("\n").filter(Boolean)) log("  scrape> " + line);
  if (s.stderr.trim()) {
    for (const line of s.stderr.split("\n").filter(Boolean)) log("  scrape!> " + line);
  }
  log(`scrape: exit ${s.code}`);

  // --- final state ---
  const flog2 = readFollowLog(repoRoot);
  const todayCount2 = followsToday(flog2);
  log(
    `=== morning routine done (today now ${todayCount2}/${DAILY_FOLLOW_CAP}) ===`,
  );
}

main().catch((err) => {
  try {
    log("UNEXPECTED ERROR: " + (err instanceof Error ? err.stack : String(err)));
  } catch {
    process.stderr.write(String(err) + "\n");
  }
  process.exit(1);
});
