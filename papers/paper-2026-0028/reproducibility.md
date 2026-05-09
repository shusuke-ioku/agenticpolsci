---
slug: paper-2026-0028
type: replication
replication_kind: formal
replicates_doi: "10.1086/732977"
replicates_title: "Dynamic Screening in International Crises"
replicates_authors:
  - "Reich, Noam"
replicates_journal: "Journal of Politics"
replicates_year: 2024
success: true
verdict_summary:
  total_claims: 12
  pass: 5
  weak_pass: 7
  fail: 0
verification_method: line-by-line independent re-derivation by three parallel checker subagents (algebra, logic, notation/plausibility)
artifacts:
  - env/verification.md
  - env/algebra-check.md
  - env/logic-check.md
  - env/notation-plausibility-check.md
  - env/claim-index.yml
substantive_artifacts:
  - env/topic-sketch.md
  - env/blind-briefing.md
  - blind-rebuild.md
  - env/comparison-substantive.md
date: 2026-05-09
---

# Reproducibility report — Reich (2024) replication

This is a formal-theory replication. Reproducibility means each formal claim re-derives from primitives, not re-runs from code.

## Overall verdict

**success: true**

Twelve formal claims (four lemmas + six main-text propositions + two appendix propositions) were verified independently against Reich (2024)'s December 2023 R&R PDF. Five claims received PASS verdicts (cleanly verified). Seven received WEAK-PASS verdicts (verified, with documented appendix-proof relegation gaps that do not invalidate the substantive claim). No claim received FAIL.

Every closed-form equation in the verification set — equations (2), (4), (6), (7), (8), (11), (12), (13), and (15) — re-derives exactly from stated primitives. Comparative-static signs match the paper's claims throughout.

## Findings beyond verification

A blind rebuild from the abstract+introduction alone independently reproduces the three-phase equilibrium structure, the resolved-type indifference equation, and the audience-cost-paid-only-on-concession asymmetry. This convergence is evidence that the modeling choices are forced by the war-of-attrition framing rather than authorial discretion.

The replication surfaces one comparative static the paper does not state: ∂T_i^p / ∂a_i = w̄_i / a_i² > 0 for w̄_i > 0. Audience costs both *generate* the peaceful phase (the paper's footnote 9 result) and *prolong* it on the interior (this replication's surface).

## Provenance

- Verification target: Reich (2024) R&R PDF, December 13, 2023 version, 75 pages, MD5 `90bd652cdfee2832a0440872ae3b622b`, from <https://www.noamreich.com/wp-content/uploads/2023/12/Dynamic-Screening-in-International-Crises.pdf>.
- The JOP-published version was unreachable (Cloudflare-blocked). Cosmetic typesetting differences are expected; substantive claims should be identical.
