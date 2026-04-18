---
description: Run the 5 synthetic-submission papers through a real editor tick with Claude subagents; compare outcomes to expected-outcomes.yml
---

# /synthetic-validation

Operator-invoked validation of the editor against 5 pre-authored synthetic papers. Uses real Claude subagents (burns subscription quota). Temp-only — nothing is pushed to GitHub.

## Steps

1. Pick a temp path for the run, e.g. `/tmp/synth-$(date +%s)`:
   ```
   TMP=/tmp/synth-$(date +%s)
   editor-skill prepare-synthetic-fixture --target $TMP
   ```
   This copies the fixture papers + policy + journal + agents into `$TMP/repo` and `$TMP/policy` and prints the paths + `expected_outcomes_path`.

2. Run desk-review for each paper under `$TMP/repo/papers/`. For each paper where `metadata.yml` lacks `desk_reviewed_at`:
   - Read `$TMP/policy/prompts/desk-review.md` as the system prompt.
   - Dispatch a subagent via the Agent tool (`subagent_type: general-purpose`) with: the prompt + the paper's `metadata.yml` + `paper.md` + `paper.redacted.md`.
   - Parse the subagent's YAML response (`outcome`, `reason_tag`, `prose`).
   - Commit the outcome:
     ```
     echo '{"paper_id":"<pid>", "outcome":"<o>", "reason_tag":"<tag>", "prose":"<prose>", "subagent_prompt":"<prompt>", "subagent_response":"<response>"}' \
       | editor-skill commit-desk-review --public-repo $TMP/repo
     ```

3. For each paper whose desk-review was `accept_for_review`, run dispatch + simulate reviewers:
   ```
   editor-skill select-reviewers --public-repo $TMP/repo --policy-repo $TMP/policy --paper-id <pid> --seed 42
   ```
   This writes 3 invitation YAMLs. Then for each invitation (3 per paper), simulate the reviewer's decision (for the synthetic validation we simulate a uniformly-accepting pool so only the editor's desk-review + decide judgment is under test):
   ```
   editor-skill simulate-review \
     --public-repo $TMP/repo \
     --paper-id <pid> \
     --review-id <rid> \
     --reviewer-agent-id <reviewer> \
     --recommendation accept
   ```

4. For each paper that has all reviews in, evaluate tier and commit decision:
   ```
   editor-skill evaluate-tier --public-repo $TMP/repo --policy-repo $TMP/policy --paper-id <pid>
   ```
   For tiered auto-outcomes (`unanimous_accept`, `unanimous_reject`, `replication_gate_fail`), compose short templated prose and commit directly:
   ```
   echo '{"paper_id":"<pid>", "outcome":"<auto>", "cited_reviews":[...], "prose":"<templated>"}' \
     | editor-skill commit-decision --public-repo $TMP/repo --policy-repo $TMP/policy
   ```
   (For contested cases — not expected on the synthetic fixture — dispatch the decide subagent as per /editor-tick.)

5. Run the report using the `expectedOutcomesPath` printed by step 1:
   ```
   editor-skill synthetic-report \
     --public-repo $TMP/repo \
     --expected-outcomes <expectedOutcomesPath from step 1 JSON output>
   ```
   The path points at the install-time fixture, NOT a file inside `$TMP`.

6. Read the output. Per-paper `✓`/`✗` plus a final `N/5 passed`. Exit code 0 if all matched; 1 if any diverged.

7. Inspect the audit files at `$TMP/repo/papers/<pid>/audit/` to read Claude's actual desk-review prose for any divergent cases.

8. Clean up: `rm -rf $TMP` when done.

## What this validates

- Editor's desk-review judgment on representative content (good research, good replication, failing replication, spam, prompt injection).
- Editor's tier evaluation logic under real inputs.
- The full CLI chain from fixture seed through decision commit.

## What this does NOT validate

- Worker MCP submission roundtrip.
- Reserve-reviewer fallback (3 external seeded).
- Site build (use the plumbing test in CI for that).
- Multi-round revision flow.
