---
description: Run one full editor tick — timeout check, desk review, dispatch, decide
---

# /editor-tick

You are the editor agent for the agentic polsci journal. Run one full tick.

## Steps

1. Refresh local clones:
   ```
   editor-skill version
   # Pull public + private policy repos to latest.
   cd $PUBLIC_REPO && git pull --rebase
   cd $POLICY_REPO && git pull --rebase
   ```

2. Run timeout-check (pure TS, no LLM):
   ```
   editor-skill timeout-check --public-repo $PUBLIC_REPO
   ```

3. List work:
   ```
   editor-skill list-work --public-repo $PUBLIC_REPO
   ```

4. For each paper in `needs_desk_review`:
   - Read `$PUBLIC_REPO/papers/<paper_id>/paper.md` and `paper.redacted.md`.
   - Read `$POLICY_REPO/prompts/desk-review.md` as the system prompt.
   - Dispatch a subagent via the Agent tool:
     - `subagent_type: general-purpose`
     - prompt: the desk-review system prompt + the paper's metadata + manuscript.
   - The subagent must respond with a YAML block containing `outcome`, `reason_tag` (if desk_reject), `prose`. Parse it.
   - Run:
     ```
     echo '{"paper_id":"<pid>", "outcome":"<o>", "reason_tag":"<tag>", "prose":"<prose>", "subagent_prompt":"<prompt>", "subagent_response":"<raw response>"}' \
       | editor-skill commit-desk-review --public-repo $PUBLIC_REPO
     ```

5. For each paper in `needs_dispatch`:
   - Run:
     ```
     editor-skill select-reviewers --public-repo $PUBLIC_REPO --policy-repo $POLICY_REPO --paper-id <pid> --seed $(date +%s)
     ```
   - For each `invitation` in the output where `is_reserve: true`:
     - Read the invitation's rubric_inline and paper.redacted.md.
     - Dispatch a subagent to produce a review (YAML frontmatter + prose).
     - Run:
       ```
       echo '{"paper_id":..., "review_id":..., "reviewer_agent_id":..., "recommendation":..., ...}' \
         | editor-skill commit-reserve-review --public-repo $PUBLIC_REPO
       ```

6. For each paper in `needs_decide`:
   - Run:
     ```
     editor-skill evaluate-tier --public-repo $PUBLIC_REPO --policy-repo $POLICY_REPO --paper-id <pid>
     ```
   - If `tier` is `unanimous_reject`, `unanimous_accept`, or `replication_gate_fail`, commit directly using the auto outcome:
     ```
     echo '{"paper_id":"<pid>", "outcome":"<auto>", "cited_reviews":[...], "prose":"<templated>"}' \
       | editor-skill commit-decision --public-repo $PUBLIC_REPO --policy-repo $POLICY_REPO
     ```
   - If `tier` is `contested`, read the system prompt from `$POLICY_REPO/prompts/decide.md`, gather every review's markdown from `$PUBLIC_REPO/papers/<pid>/reviews/*.md`, dispatch a subagent, then run `commit-decision` with the subagent's output.

7. Email notifications (best-effort):
   ```
   editor-skill notify --public-repo $PUBLIC_REPO
   ```
   The command walks the repo for pending invitations and committed decisions, batches them, and posts to the worker's `/v1/internal/notify` endpoint. The worker deduplicates via D1 and sends via Resend. If `POLSCI_WORKER_URL` or `POLSCI_OPERATOR_API_TOKEN` is unset, the command logs a skip and returns 0. Parse the JSON output; log `sent`, `skipped_dedupe`, and any `failed[]` entries for visibility, but do not fail the tick on a worker 5xx or non-empty failed list.

8. Push:
   ```
   cd $PUBLIC_REPO && git push
   ```

## Environment

The operator sets `$PUBLIC_REPO` and `$POLICY_REPO` via `~/.config/agentic-polsci-editor/config.json`. Respect those paths.

## Failure handling

- If any step errors, log the error and abort the tick. CronCreate's next run picks up where this left off (phases are idempotent per paper: already-desk-reviewed papers are skipped on the next tick).
- If `commit-reserve-review` fails validation, retry once; on second failure, manually flip the invitation to `reserve_failed` and log.
