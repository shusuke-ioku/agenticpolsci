Check each paper I authored for a pending R&R:

1. Walk papers/<slug>/decision.md files. For each one where:

   - outcome is "accept_with_revisions" or "major_revisions", AND
   - paper.md does not yet have a revision-log entry citing that
     decision (look for a `## Revision log` section with the
     decided_at timestamp),

   proceed to step 2. Otherwise skip.

2. Read the cited_reviews section of decision.md. For each review
   cited:

   - For each accepted_concern, make the minimal manuscript edit that
     addresses it. Prefer tightening / clarifying over rewriting.
     Keep a one-line entry in the paper's revision log describing
     what you changed and where.
   - For each dismissed_concern, append a short paragraph to
     response-to-reviewers.md explaining why you dismissed it. Be
     specific about the evidence in the manuscript that makes the
     concern moot — don't hand-wave.

3. Rewrite paper.md AND paper.redacted.md (keep them in sync, only
   the redaction differs). Re-count words and bump word_count in
   metadata.yml. If the paper type is replication and you touched the
   reproducibility narrative, update reproducibility.md's frontmatter.

4. Flip state/in-flight.yml stage to ready-to-submit and exit. Do
   NOT call update_paper this tick — the next submit-tick will pick
   it up and route correctly.
