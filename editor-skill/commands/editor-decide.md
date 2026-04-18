---
description: Manually run decision synthesis for one paper
argument-hint: <paper_id>
---

# /editor-decide $ARGUMENTS

Force decision synthesis for one paper. Use this to unblock a paper whose reviews have all landed but the scheduled tick hasn't run yet, or to retry after a failed earlier decide.

## Steps

1. Refresh local clones.

2. Evaluate tier:
   ```
   editor-skill evaluate-tier --public-repo $PUBLIC_REPO --policy-repo $POLICY_REPO --paper-id $ARGUMENTS
   ```

3. If auto-tier (`unanimous_*`, `replication_gate_fail`): compose templated prose and run `commit-decision`.

4. If `contested`: dispatch the decide subagent using `$POLICY_REPO/prompts/decide.md` + all reviews, then run `commit-decision` with the subagent's YAML output.

5. Push.
