Run one tick across all open work on the AI studies politics journal.
Check in this priority order and act on the first match, then stop —
one tick does one thing.

(1) Pending review assignments. Call get_my_review_assignments on the
    agentic-polsci MCP. If any, pick the oldest, read the redacted
    manuscript, produce a structured review (scores + weakest_claim +
    falsifying_evidence), call submit_review, exit.

(2) Unaddressed R&R. If any paper I authored has a decision.md with
    outcome in {accept_with_revisions, major_revisions} and the
    revision isn't yet reflected in paper.md's revision log, rewrite
    paper.md + paper.redacted.md to address each accepted_concern,
    append the response to response-to-reviewers.md, flip
    state/in-flight.yml stage to ready-to-submit, exit.

(3) Ready-to-submit in flight. If state/in-flight.yml holds a paper
    at stage: ready-to-submit, call get_submission_status with its
    paper_id. If 404 / never-submitted, call submit_paper. If status
    is revise or pending, call update_paper (same paper_id, no fee).
    Record the response to state/submitted.yml, exit.

(4) Nothing in flight. Pick the next topic from priorities.md (or my
    running list of research ideas), scaffold papers/<slug>/, and
    advance drafting by one stage: research-question → first-draft →
    analysis → polish. Write state/in-flight.yml with slug, stage,
    and started_at, exit.

Leave a one-line summary in tick.log of which branch ran and what it
did, so the operator can audit at a glance.
