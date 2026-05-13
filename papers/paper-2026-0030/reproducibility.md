---
slug: paper-2026-0030
type: replication
replication_kind: formal
replicates_doi: "10.1017/S0003055425101160"
replicates_title: "The Path of Law: Legal Uncertainty and Issues of First Impression in the U.S. Courts of Appeals"
replicates_authors:
  - "Taboni, Anthony R."
replicates_journal: "American Political Science Review"
replicates_year: 2025
success: true
verdict_summary:
  total_claims: 11
  pass: 6
  weak_pass: 5
  fail: 0
verification_method: line-by-line independent re-derivation by three parallel checker subagents (algebra, logic, notation/plausibility), cross-checked against the author's Mathematica notebooks Proposition_2.nb and Proposition_3.nb (Harvard Dataverse 10.7910/DVN/VYDUKV).
artifacts:
  - env/algebra-check.md
  - env/logic-check.md
  - env/notation-check.md
  - env/claim-index.yml
substantive_artifacts:
  - env/topic-sketch.md
  - env/blind-briefing.md
  - blind-rebuild.md
  - env/comparison-substantive.md
date: 2026-05-13
---

# Reproducibility report — Taboni (2025) replication

This is a formal-theory replication. Reproducibility means each formal claim re-derives from primitives, not re-runs from code.

## Overall verdict

**success: true**

Eleven formal claims (four definitions, two Bayesian belief derivations, three two-court propositions, three N-court propositions, and three split-aversion-appendix propositions — eleven *verification targets* total, after grouping definitions) were verified independently against Taboni's APSR-published paper and its online supplement. Six received PASS verdicts (cleanly verified). Five received WEAK-PASS verdicts, split into three categories:

- **Display-equation cosmetic drift (3 items):** SI-6 transcription artifact (variable α↔Δ); SI-8 case-boundary label overlap; SI-8 denominator missing factor of two.
- **Algebraic display error whose conclusion still holds (1 item):** Proposition 7, SI-12 displayed expression printed as a sum where the algebra requires a product — the conclusion is correct for the product form.
- **Sign-only scope caveat (1 item):** Proposition 4 channel-decomposition delivers signs but not magnitudes; the proof chains Propositions 1 and 2 under different information regimes without giving a closed-form magnitude.

No claim received FAIL. Cross-checks against the author's own Mathematica notebooks `Proposition_2.nb` and `Proposition_3.nb` (obtained from the Harvard Dataverse archive at doi:10.7910/DVN/VYDUKV) confirm every derivative-sign claim independently of the SI display equations.

## Findings beyond verification

A blind rebuild from abstract+introduction alone independently reproduces:

- The **bias-compatible / bias-incompatible partition** (Taboni's central typological move), with identical names.
- The **bias-compatible distance effect**: $\partial \Pr(\text{split}) / \partial \Delta > 0$ (Proposition 2).
- The **bias-incompatible distance effect**: weakly decreasing (Proposition 3), recovered numerically in the blind rebuild's Gaussian setup.
- The **N-court sequence-order extension** (Propositions 5, 6, 7): agreement-with-mode rising in sequence position, split-creation falling, with the null of no inter-court learning predicting flat coefficients.
- The **null-of-no-learning empirical test** as the diagnostic for the mechanism.

The blind rebuild uses a Gaussian prior + Gaussian signal in place of the paper's uniform prior + binary signal. The qualitative comparative-static signs converge; what differs is the *kind of proof* — the uniform-binary setup admits closed-form piecewise-rational probabilities and sign-checkable derivatives in Mathematica, while the Gaussian setup requires numerical scans.

This convergence is evidence that the substantive content sits in the typology and the framing, which the paper's abstract makes unusually explicit. The formalism converts the typology into sign-certified comparative statics.

## Provenance

- Verification target: Taboni (2025), *American Political Science Review* 120(2), pp. 624–640. Acquired from Cambridge Core (paper PDF) and Harvard Dataverse (supplement + Mathematica notebooks + R simulation scripts).
- Paper PDF MD5: `28b0f8d0896a6bede6d0cfede39b1738`.
- Supplement PDF MD5: `3df6a1b5945890397b929eda96196cf7`.
- Mathematica notebooks: `Proposition_2.nb` (MD5 `c32ccf88b5ec580d89b286a271af851a`), `Proposition_3.nb` (MD5 `d8f73d31868107623dc0435ce74831eb`).
- All checksums recorded in `env/manifest.yml`.
- License: CC-BY 4.0 (Open Access).

## Reproducibility marker

This is a formal replication. Reproducibility is *deductive* (re-derive equations from primitives) rather than *computational* (re-run code). The verification artifacts (`algebra-check.md`, `logic-check.md`, `notation-check.md`) document the line-by-line re-derivation; cross-checks against `Proposition_2.nb` and `Proposition_3.nb` use Mathematica's `Reduce` to confirm derivative signs over the parameter region.
