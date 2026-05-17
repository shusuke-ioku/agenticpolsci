---
slug: paper-2026-0032
type: replication
replication_kind: formal
replicates_doi: "10.1086/732960"
replicates_title: "A Model of Focusing in Political Choice"
replicates_authors:
  - "Nunnari, Salvatore"
  - "Zápal, Jan"
replicates_journal: "Journal of Politics"
replicates_year: 2025
replicates_volume: 87
replicates_issue: 4
replicates_pages: "1465-1481"
success: true
verdict_summary:
  total_claims: 11
  pass: 4
  weak_pass: 7
  fail: 0
  serious_findings: 6
verification_method: line-by-line independent re-derivation by three parallel checker subagents (algebra with sympy support, logic, notation/plausibility) against the 55-page working-paper PDF (body 1–31, references 32–39, Online Appendix A 40–54; proofs identical to the JOP-published version per author CV).
artifacts:
  - env/verification.md
  - env/algebra-check.md
  - env/logic-check.md
  - env/notation-plausibility-check.md
  - env/manifest.yml
substantive_artifacts:
  - env/topic-sketch.md
  - env/blind-briefing.md
  - blind-rebuild.md
  - env/comparison-substantive.md
craft_notes:
  - library/craft/paper-2026-0032--puzzle-framing.md
  - library/craft/paper-2026-0032--analysis-strategy.md
  - library/craft/paper-2026-0032--theory-setup.md
  - library/craft/paper-2026-0032--validity-moves.md
  - library/craft/paper-2026-0032--narrative-arc.md
date: 2026-05-17
---

# Reproducibility report — Nunnari & Zápal (2025) replication

Formal-theory replication. Reproducibility means each formal claim re-derives from primitives, not re-runs from code.

## Overall verdict

**success: true**

Twelve formal verification targets — Lemma 1, Assumption 1, Proposition 1 with equations (10)–(12), Corollaries 1–4, Proposition 2, Proposition 3, Lemma A.1, and Proposition A.1 with equations (A7)–(A8) — were verified independently against the 55-page working-paper PDF. Aggregate over 11 synthesized verdict rows (the equation-A8 row is reported separately as an isolated Serious typo): 4 PASS, 7 WEAK-PASS, 0 FAIL. Six items are flagged Serious; none invalidates a headline proposition.

The Serious findings cluster in two regions:

- **Formal-model interior (3 items)**: equation (A8) prints a denominator for $\delta_2$ that flips $\delta_2 - \delta_1$ in 33 of 44 calibrated parameter combinations (two transcription errors; corrected expression yields $\delta_1 < \delta_2$ in 44/44); Proposition A.1 Case B.3 asserts eight-candidate non-existence en bloc with no displayed contradiction (Footnote 19 documents the omission); $\sigma_k = \sum_i m_i \theta_{ik}^2$ is labeled "heterogeneity" throughout §3 but is the *uncentered* second moment, not the variance.
- **Model-to-empirics mapping (3 items)**: the scalar $\rho$ in $g(\Delta) = 1 + \rho\Delta$ has different units in §3 (1/utility) and §5 (1/dollar); Proposition 3 imposes $\gamma^B = 0$ for tractability, turning the equilibrium problem into a unilateral optimization; the §4 named exemplars (Greens, Brexit Party, AfD) span two Proposition 2 regimes — Greens fit the $c_k \approx \delta_2$ spoiler regime, Brexit Party and AfD sit in the $c_k > \delta_2$ extreme-entrant regime that *helps* the more-competent major party.

Every numbered equation in the verification set re-derives exactly from stated primitives, with the single exception of the equation-(A8) denominator. The equation-(A8) error is downstream-contained: every proposition using $\delta_2$ references it by name, and the proofs use the inequality $a^* < \delta_1 < \delta_2 < 2b^*$ that the corrected expression delivers.

## Findings beyond verification

A blind formal-modeler received a briefing containing only the abstract and the introduction. From that briefing it independently reproduced:

- The **additive linear focus weight** $g(\Delta) = 1 + \rho\Delta$ functional form.
- The **quadratic competence cost** $C(q) = q^2/(2\gamma)$ with party-issue-specific competence.
- The **probabilistic-voting** equilibrium concept (Lindbeck–Weibull).
- The **closed-form equilibrium-quality formula** $q^{A*} = \gamma_A / [1 - 2\rho\sigma(\gamma_A - \gamma_B)]$ (structurally equation 12 up to relabeling).
- The **closed-form polarization-gap formula** $q^{A*} - q^{B*} = (\gamma_A - \gamma_B) / [1 - 2\rho\sigma(\gamma_A - \gamma_B)]$ (structurally equation 13).
- The **two-channel mechanism decomposition** (rational + focusing-induced-quality + attention-manipulation), matching equation 11 exactly.
- The **consequence-focusing reframing** of the redistribution application (benefit and cost as two attention channels within a single fiscal issue).
- The **Meltzer–Richard sign-flip wedge** $-\rho(t_A - t_B)^2 \cdot \mathrm{Var}(y)$, with the same direction the paper's Proposition 3 delivers.

Convergence at this level is the strongest substantive-credibility signal a formal replication produces. It implies that the paper's structural choices are forced by the framing the abstract fixes, not idiosyncratic to the authors' research path. The places where the blind rebuild diverges (Lemma 1 as scaffolding; the piecewise three-party $(\delta_1, \delta_2)$ non-existence interval; the imposition $\gamma^B = 0$ in §5) coincide with the places where verification flags the Serious findings — independent evidence that those flagged locations are where authorial discretion enters.

Verdict: **HIGH-CONVERGENCE**.

## Provenance

- Verification target: Nunnari, Salvatore, and Jan Zápal. 2025. "A Model of Focusing in Political Choice." *Journal of Politics* 87(4): 1465–1481. DOI 10.1086/732960.
- Working paper PDF MD5: `d605bb4d98754898e2582688a6ead909`. Identical proofs to the JOP-published version per author CV.
- No Dataverse archive: the paper is pure formal theory with no data or code.
- All checksums recorded in `env/manifest.yml`.

## Reproducibility marker

This is a formal replication. Reproducibility is *deductive* (re-derive equations from primitives) rather than *computational* (re-run code). The three verification artifacts (`algebra-check.md`, `logic-check.md`, `notation-plausibility-check.md`) document the line-by-line re-derivation; the algebra checker used sympy for symbolic confirmation of equations (12), (13), the Case B.2 closed form (A23) that anchors the equation-(A8) typo correction, and the strict-concavity bound $\bar\rho < -b/(2u'(0)^2)$ in Proposition 3. The substantive-replication artifacts (`topic-sketch.md`, `blind-briefing.md`, `blind-rebuild.md`, `comparison-substantive.md`) document the independent blind-rebuild that establishes the HIGH-CONVERGENCE substantive verdict.
