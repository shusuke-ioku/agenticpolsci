# social/

Auto-posting to X (Twitter) for agenticPolSci.

- 5 posts/day via GitHub Actions cron (`.github/workflows/x-post.yml`).
- Tweet copy banked at editor-accept time (`papers/<id>/tweets.yml`); site-promo bank at `site/tweets.yml`.
- Thumbnails rendered live via satori + resvg (1200×675 black/white PNG).
- All posts logged to `social/posts.log.jsonl` and committed back to `main`.

See `docs/superpowers/specs/2026-04-28-x-auto-posting-design.md` for the full design.

## Run

```bash
cd social
npm ci
npm test                    # unit + integration (fake X client)
npm run post -- --slot=site_promo --dry-run   # local smoke test
```

## Editor integration

After an accept decision, the editor agent in `../agenticPolSci-editorial/` runs:

```bash
echo "<10 variants from subagent>" | npx tsx bin/generate-tweets.ts \
  --paper-id=<id> --repo=<public-repo>
```

The subagent prompt lives at `../agenticPolSci-editorial/prompts/generate-tweet-bank.md`. The editor pipeline step is in `../agenticPolSci-editorial/commands/editor-tick.md` step 6.5.

Accepted papers without `tweets.yml` are skipped at post time with a stderr warning; run the editor agent on them to backfill.

## Operator one-time setup

1. X dev portal: app permissions = **Read and Write**; regenerate OAuth 1.0a tokens after the change.
2. GitHub repo Settings → Secrets and variables → Actions: set `X_API_KEY`, `X_API_KEY_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`.
3. Trigger `.github/workflows/x-post.yml` once via Actions UI → Run workflow → slot=site_promo, dry_run=true. Verify logs show a sane composed tweet + thumbnail bytes.
4. Re-run with dry_run=false. Confirm the post lands and `social/posts.log.jsonl` gets a new chore commit.
5. Let cron take over.

## Browser automation — follow + reply drafts

Auto-posting above goes through the X API. Follows and replies cannot
(free tier doesn't expose follow; auto-reply is shadowban-bait per
`STRATEGY.md`). The `x:*` scripts use Playwright + a persisted login
session to get follows automated and reply candidates surfaced for
manual posting.

### One-time

```bash
cd social
npx playwright install chromium    # ~150 MB (skip if using Brave/Chrome)
npm run x:login                    # opens chromium, sign in by hand
```

`x:login` saves cookies to `social/.x-state.json` (gitignored). Re-run
if X invalidates the session.

If Google blocks "Sign in with Google" with *"This browser or app may
not be secure"*, either (a) sign into X directly with your X
username/password, or (b) point Playwright at Brave / system Chrome:

```bash
X_BROWSER_PATH="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  npm run x:login
# Same env var works for x:follow-next and x:scrape-anchors.
```

### Daily

```bash
npm run x:follow-next                 # follow 1 from social/follow-strategy.md
npm run x:follow-next -- --count 3    # up to 3 (hard cap 8/day)
npm run x:follow-next -- --dry-run    # show plan, no clicks
```

- Picks the next handle from Day 1/2/3 tables in `follow-strategy.md`
  that isn't already in `social/follows.log.jsonl`.
- Sleeps 30–180s between accounts. Aborts immediately on captcha,
  login wall, or 2FA prompt — re-run `x:login` and retry.
- Does **not** unfollow, ever (`follow-strategy.md` § cadence rules).

```bash
npm run x:scrape-anchors                    # 5 recent posts/anchor
npm run x:scrape-anchors -- --per 3 --max-age 12h
```

Scrapes the bell-list anchors (top 10 from `follow-strategy.md`),
filters out retweets and replies, writes `social/reply-queue.md`
with empty `Draft:` slots. **Operator (or a Claude session) writes
the drafts and posts them by hand** — never auto-reply. Both files
are gitignored.

### Morning routine (unattended)

`bin/x-morning.ts` is the daily wrapper — reports state, runs a
3-follow batch (only between 07:00–12:00 local; outside the window
it skips), then refreshes the reply queue. Schedule via launchd:

```bash
cp social/launchd/com.agenticpolsci.x-morning.plist ~/Library/LaunchAgents/
launchctl bootstrap "gui/$(id -u)" \
  ~/Library/LaunchAgents/com.agenticpolsci.x-morning.plist
launchctl print "gui/$(id -u)/com.agenticpolsci.x-morning"   # verify loaded
```

Default schedule: **8:30 AM local, daily**. Logs land in
`social/morning.{stdout,stderr}.log` (tail those after a fire to
audit). Manual midday run: `npm run x:morning -- --force` to bypass
the time-of-day guard.

To unschedule:

```bash
launchctl bootout "gui/$(id -u)" \
  ~/Library/LaunchAgents/com.agenticpolsci.x-morning.plist
```

Hardcoded paths in the plist (Node, Brave, working dir) are specific
to this machine; edit if you move the repo or change Node version.
