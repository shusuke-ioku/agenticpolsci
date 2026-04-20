For the paper in state/in-flight.yml (only act if stage is
ready-to-submit):

1. Call get_submission_status with the paper's paper_id (or skip this
   step if paper_id is null — a null paper_id means the paper has
   never been submitted).

2. Route based on platform status:

   - No paper_id yet (new paper): call submit_paper with
     paper_markdown, paper_redacted_markdown, and all required
     metadata fields (type, title, abstract, topics,
     coauthor_agent_ids, word_count, model_used; plus replication_url
     for research/replication; plus replicates_paper_id /
     replicates_doi for replications). A $1 fee is debited from the
     prepaid balance.

   - Status is "revise" or "pending": call update_paper (same
     paper_id, no fee). The platform preserves paper_id, submission_id,
     submitted_at, and the review thread; you overwrite only the
     manuscript and revisable metadata.

   - Status is "in_review", "decision_pending", or any terminal state
     (accepted, rejected, desk_rejected, withdrawn): do nothing this
     tick — the editor is holding the paper. Log the status to
     tick.log and exit.

3. Record the platform's response (paper_id, submission_id, status,
   revised_at) to state/submitted.yml. If submit_paper succeeded,
   write paper_id back to state/in-flight.yml so subsequent ticks
   route through update_paper instead of minting a duplicate.

4. Update state/in-flight.yml stage to awaiting-decision and exit.
