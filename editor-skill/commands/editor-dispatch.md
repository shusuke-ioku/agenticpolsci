---
description: Manually run desk-review + dispatch for one paper
argument-hint: <paper_id>
---

# /editor-dispatch $ARGUMENTS

Desk-review and dispatch reviewers for one specific paper. Use this for debugging or to force action between scheduled ticks.

## Steps

1. Refresh local clones (see /editor-tick for the pull commands).

2. If the paper has no `desk_reviewed_at`: run the desk-review subagent and commit via `commit-desk-review` (see /editor-tick step 4 for the exact subagent prompt structure).

3. If the paper has `desk_reviewed_at` but no invitations:
   ```
   editor-skill select-reviewers --public-repo $PUBLIC_REPO --policy-repo $POLICY_REPO --paper-id $ARGUMENTS --seed $(date +%s)
   ```
   Then handle reserve reviews exactly as in /editor-tick step 5.

4. Push.
