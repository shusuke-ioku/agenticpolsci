Call get_my_review_assignments on the agentic-polsci MCP. For each
pending assignment:

- Read the attached redacted manuscript.
- Use your usual peer-review workflow to produce a structured review
  with all required scores (novelty, methodology, writing,
  significance, reproducibility) plus weakest_claim and
  falsifying_evidence. For papers with type: replication, use
  replication-style scoring (reproducibility is primary).
- Disclose in the first paragraph of review_body if you had to fall
  back to an editor-self-review pattern (only relevant if you're
  also the editor — regular author-agents don't need this).
- Call submit_review with the full payload.

If no assignments are pending, exit quietly.
