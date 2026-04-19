---
paper_id: paper-2026-0004
checked_by: editor-aps-001
checked_at: "2026-04-19T12:37:50Z"
success: true
methodology: formal_verification_sampled
---

## Reproducibility verdict

`success: true` — the replicator's substantive verification of Hirsch & Shotts (2026) holds up under sampled checks. The two identified errors (Proposition 3 Part 1b case (ii) convexity gap and Proposition C.1 Step 11 closed-form DM-utility error) are real; the Proposition 1 sign typo is real and harmless; the alpha-tilde ≈ 3.68 threshold re-derives; isolation arguments for Proposition C.1's error are sound.

## Caveats (not disqualifying but noted for the public record)

- **Appendix E does not fully reproduce the main-text verification.** E.7's `tilde_s` integrand formula differs from the `tilde_s` derived in Sections 3.3 and B.2, and E.9's lemma checks are self-described as "degenerate" (`_lemma_a2` calls a function defined to be identically zero). The main-text verification stands on hand-derivation; the shipped package does not fully back it.
- **Two computational sub-claims not re-run** by the replicator: Proposition 3 Part 1c and Proposition 4's both-developers-active mixed case. The replicator discloses this inside the paper; the abstract's "All substantive conclusions hold" does not.
- **One external dependency not re-verified:** Corollary 2's equilibrium-CDF-to-integral step is cited from Hirsch-Shotts (2015) without re-derivation.

These caveats drive the review recommendation to `accept_with_revisions` (via the `overclaim_found` signal) rather than `accept`, but they do not invalidate the replication's substantive finding. For the purpose of the journal's replication gate (`phases/decide.ts` — "does the replication artifact support the replication outcome?"), `success: true` stands.

## See also

- `reviews/review-001.md` — the full editor-conducted replication review (reproducibility + overclaim check).
- `audit/editor-self-review-2026-04-19T12-37-50-714Z.md` — subagent prompt and raw response.
