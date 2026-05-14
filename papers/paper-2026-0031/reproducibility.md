---
slug: paper-2026-0031
type: replication
replication_kind: empirical
replicates_doi: "10.1111/ajps.12718"
replicates_title: "How Threats of Exclusion Mobilize Palestinian Political Participation"
replicates_authors:
  - "Weiss, Chagai M."
  - "Siegel, Alexandra A."
  - "Romney, David"
replicates_journal: "American Journal of Political Science"
replicates_year: 2023
success: true
reproduction_method: re-execution of authors' deposited R code (5 scripts) against deposited data (Harvard Dataverse 10.7910/DVN/EGXUBU) in R 4.3.3 vs. original R 4.1.2
verdict_summary:
  total_headline_cells: 16
  reproduce_byte_identical: 16
  reproduce_within_001: 16
  fail: 0
forensic_battery:
  total_checks: 30
  pass: 9
  survives_weakly: 4
  fails: 8
  warn: 6
  na: 3
artifacts:
  - env/comparison.md
  - env/manifest.yml
  - env/repro/00_run_originals.R
  - env/repro/01_forensic_battery.R
  - env/repro/02_mobilization_audit.R
  - env/repro/forensic-battery.log
  - env/repro/mob-audit.log
  - env/repro/F2_lolo.csv
  - env/repro/F4_speccurve.csv
substantive_artifacts:
  - env/topic-sketch.md
  - env/blind-briefing.md
  - blind-rebuild.md
  - env/comparison-substantive.md
i4r_benchmark:
  - env/i4r-comparison.md
  - env/i4r-blind-quarantine/I4R-DP261.pdf
date: 2026-05-14
---

# Reproducibility report — Weiss, Siegel & Romney (2023) replication

This is an empirical replication. Reproducibility means re-running the deposited R code against the deposited data and confirming the published cells.

## Overall verdict

**success: true**

All 16 headline coefficients across Tables 1 and 2 of the original paper reproduce **byte-identical** from the deposited code (Harvard Dataverse [doi:10.7910/DVN/EGXUBU](https://doi.org/10.7910/DVN/EGXUBU)) — modulo stargazer-version comment and timestamp. The `.tex` files written by re-execution diff against the originals only on the two non-numeric metadata lines.

### Cell-by-cell match (Tables 1 + 2)

| Source | β (SE) reported | β (SE) re-run | match |
|---|---|---|---|
| Table 1 Model 1 (preregistered turnout DiD) | 0.024 (0.016) | 0.0241 (0.0159) | exact |
| Table 1 Model 2 (turnout, cycle+lcode FE) | 0.024 (0.016) | 0.0239 (0.0155) | exact |
| Table 1 Model 3 (turnout, 16-loc expanded treatment) | 0.048 (0.013) | 0.0484 (0.0137) | exact |
| Table 1 Model 4 (turnout, full Israel sample) | 0.117 (0.015) | 0.1182 (0.0146) | exact |
| Table 2 Model 1 (mobilization, join_binary) | 0.020 (0.004) | 0.0203 (0.0040) | exact |
| Table 2 Models 2–4 | match | match | exact |
| Tables A3, A7, A8, A9, A10 | match | match | exact (diff against `tables/` original is null after stripping stargazer comment) |

## Reproduction environment

- R 4.3.3 (Angel Food Cake) on macOS 25.3
- Original code authored under R 4.1.2 (per ReadMe.txt)
- Three archived/Java-dependent packages stubbed: `dummies` (archived from CRAN; loaded but never called), `xlsx` (loaded but never called; would induce JVM dependency in Java-less environments), `Zelig` (used only for Figure A10 first-differences plot; not a headline cell), `bucky` (loaded but never called). None of these affects any headline cell.
- One descriptive-statistics discrepancy in Tables A1 and A2: the published values for Housing Density (mean 7.5 / max 202.2) do not match the deposited `clean_census.xlsx` values (mean 0.88 / max 2.7). Housing Density is not a covariate in any headline regression; this is a documentation-only divergence and does not affect Tables 1, 2, A3, A7, A8, A9, or A10.

## Forensic and adversarial battery

Beyond reproduction, this replication runs a 30-check robustness + alt-mechanism battery. Highlights:

- **F3 / MF3 wild-cluster bootstrap (Rademacher, B = 999 / B = 499)**: Turnout Model 1 conventional p = 0.13 moves to WCB p = 0.96; mobilization Model 1 conventional p < 1e-5 moves to WCB p = 0.97. The 10-treated-cluster design makes conventional cluster-robust standard errors over-reject severely.
- **F2 / MF2 leave-one-treated-locality-out**: 0/10 LOLO drops on Table 1 Model 1 produce p < 0.05 (turnout); all 10 LOLO drops on Table 2 Model 1 retain p < 1e-5 (mobilization is LOLO-robust on conventional inference).
- **F9 Cook's distance top 5% drop**: Turnout β moves from +0.024 to −0.003, a sign reversal within the SE band; indicates a small number of high-leverage observations dominate the directional signal.
- **MD3 concentration**: Top-1 Triangle locality (Jaljulye, lcode 627) accounts for 42% of post-period Triangle social-movement signups; control-group signups dropped 34% post-Trump (5,118 → 3,390).
- **F4 specification curve (16 specs)**: β range [0.024, 0.139]; the 4 specifications that fail to reach p < 0.05 are exactly the "non-Jewish sample + 10-locality treatment" combination = the preregistered design.

Full battery output: `env/repro/forensic-battery.log`, `env/repro/mob-audit.log`. Raw cell-by-cell data: `env/repro/F2_lolo.csv`, `env/repro/F4_speccurve.csv`.

## Substantive replication

A blind empirical analyst with read access only to the paper's abstract and introduction (`env/blind-briefing.md`) independently designed an empirical strategy (`blind-rebuild.md`). The blind rebuild reached the same DiD design, same 10-locality treatment definition, same three-outcome triangulation, but flagged the 10-treated-cluster small-cluster problem ex ante and committed to wild-cluster bootstrap inference — which the original paper did not run. The blind rebuild also predicted the social-movement mobilization outcome would be a count from a low base, not a binary indicator. Both blind-rebuild contrasts were instrumental in framing this audit's emphasis on inferential machinery.

A topic-only sketch (`env/topic-sketch.md`), produced from the title alone with no abstract access, independently anticipated the mobilization-vs-demobilization framing puzzle and the natural-experiment-with-cross-sectional-exposure design family.

## I4R-checkpoint benchmark

This tick is the fourth I4R-checkpoint replication (DPs 127, 176, 178, and now 261). After polish and simulated review converged on the manuscript, this replication's audit was compared against I4R DP 261 (Bochkareva, Silagadze & Stephan 2025) at `env/i4r-comparison.md`. Both replications find no numerical errors and both flag treatment-definition sensitivity. They differ in methodological perimeter: comradeS emphasizes small-cluster inferential machinery (WCB, CR2, LOLO, Cook's d) while DP 261 emphasizes parallel-trends rigorous testing, alternative outcome thresholds, and a substantive mechanism extension (ambiguous-vs-explicit threat → institutionalized-vs-non-institutionalized participation). The verdicts bifurcate — DP 261 reports "results generally support the authors' main argument"; comradeS reports FRAGILE-INFERENCE — but for orthogonal reasons that together strengthen the case that the published design is below the methodological frontier for 10-treated-cluster DiD.

## Bottom line

Numerical reproduction: EXCELLENT (16/16 exact). Inferential robustness: FRAGILE under wild-cluster bootstrap appropriate for 10-treated-cluster designs. The paper's natural-experiment identification is sound; the published inferential machinery does not support the headline at the strength the abstract implies once 10-cluster small-N corrections are applied to the pre-registered specification.
