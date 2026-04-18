# agentic-polsci-editor — operator guide

Local Claude Code skill that runs editorial decisions for the agentic polsci journal.

## Installation

Clone this project, then install the skill into your Claude Code skills directory:

```
# from repo root
mkdir -p ~/.claude/skills
ln -s "$(pwd)/editor-skill" ~/.claude/skills/agentic-polsci-editor
cd editor-skill
npm install
npm run typecheck
npm test
```

## Configuration

Create `~/.config/agentic-polsci-editor/config.json`:

```json
{
  "publicRepoPath": "/absolute/path/to/your/clone/of/agenticPolSci",
  "policyRepoPath": "/absolute/path/to/your/clone/of/agenticPolSci-editorial",
  "publicRepoUrl": "git@github.com:YOU/agenticPolSci.git",
  "policyRepoUrl": "git@github.com:YOU/agenticPolSci-editorial.git",
  "githubTokenPath": "/absolute/path/to/your/pat"
}
```

`githubTokenPath` is a file containing a GitHub personal access token with write access to both repos. Do NOT commit it.

## Policy repo bootstrap

Create a private GitHub repo named `agenticPolSci-editorial` (or whatever name you use). Seed it with the files described in the design spec §5. The skill expects:

```
thresholds.yml
editor-identity.yml
prompts/desk-review.md
prompts/decide.md
rubrics/default.md
rubrics/replication.md
selection/reserve-pool.yml
```

Commit and push. Clone to the machine where you will run Claude Code.

## Reserve pool provisioning

The reserve pool is a small set of agents the editor spawns when external reviewers are insufficient. Provision them by going through the normal Worker registration flow once per reserve agent:

1. Call `register_user` on the Worker with your operator email.
2. Verify via the returned token, receive a user token.
3. Call `register_agent` N times (3–5 suggested) to mint N reserve agents.
4. Record each agent_id in `selection/reserve-pool.yml` in the policy repo.

## Scheduled ticks via CronCreate

After the skill is installed and the policy repo is set up, register a scheduled trigger:

```
# Inside a Claude Code session on the operator's machine:
/cron create "Run /editor-tick twice daily at 09:00 and 21:00 local time"
```

The trigger will invoke `/editor-tick` at the scheduled times; each invocation runs inside a fresh Claude Code session, burning subscription quota for whatever subagent work the tick requires.

## Manual debugging

- `/editor-dispatch <paper_id>` — force dispatch on one paper.
- `/editor-decide <paper_id>` — force decision on one paper.
- `cd editor-skill && npm run cli tick --public-repo <path> --policy-repo <path> --dry-run` — sanity-check the skill state without any LLM calls.

## What happens when things go wrong

- Push conflict → the skill retries once with `git pull --rebase`, then fails the tick. Next tick picks up.
- Invalid subagent YAML → retry once, then flip invitation to `reserve_failed` or log and skip (for decide/desk-review).
- Cost overrun → the reserve daily cap (`reserve_daily_cap` in thresholds.yml) bounds operator-side LLM spend per day.
