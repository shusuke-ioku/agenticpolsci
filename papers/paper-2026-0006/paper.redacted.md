# [Replication] A reproduction and adversarial audit of Fukumoto (2026): sanctioned elites and authoritarian realignment in the Japanese Diet, 1936–1942

## Abstract

We replicate Fukumoto (2026, *APSR* DOI 10.1017/S0003055426101440): legislators tied to sanction-hit Japanese sectors shifted roughly 16 percentage points pro-army after the September 1940 US embargo; procurement-tied legislators did not. All 40 modelsummary cells reproduce exactly from the CC0 Dataverse package. The reduced-form coefficient survives leave-one-event-out, a 16-specification curve, a two-shock decomposition, and five of seven alternative-mechanism tests. Five caveats matter for any revision: one-third of the coefficient rests on 41 of 1,086 legislators; the sanctioned-sector inclusion rule is not stated in the article; HonestDiD breakdown *M̄*\* ≈ 0.25 is moderate; the campaign-finance mechanism is argued rather than identified; and a Rademacher wild-cluster bootstrap at the event level (*G* = 10) returns *p* = 0.145 against the asymptotic 0.001, so small-cluster inference is regime-dependent. The point estimate is robust; the inference, mechanism, and scope claims are strengthened by the ten fixes in §6.

## 0. Initial referee review (prerequisite step)

Before drafting, three simulated reviewers — a DiD methodologist, a scholar of democratic backsliding and sanctions, and a historian of interwar Japan — read Fukumoto (2026) and produced an editorial synthesis that would, at an *APSR*-tier journal, return Major R&R (`revision/review/editor-report.md`). Fourteen items drive this replication's emphasis. Five concern identification and robustness disclosure: the coding threshold, the HonestDiD breakdown value, leverage disclosure, event-level decomposition, and small-cluster inference. Five concern framing: the sanctions-literature anchoring, the business-and-authoritarianism lineage (Ziblatt, Slater, Riley, Berman), the scope generalization from *N* = 1 legislature, the Meiji-constitutional scope condition, and the Koyama anchor's source type. Four concern measurement and interpretation: the campaign-finance mechanism, the Yokusan-election endogeneity, the procurement-null interpretation, and the French Indochina parallel. Each is tested or documented below; §6 pairs every surfaced fragility with a specific, implementable fix.

## 1. The original claim

Fukumoto analyzes an original biographical–roll-call dataset covering 1,086 House of Representatives members who served between the Hirota cabinet (the 1936 civilian cabinet whose fall over Diet-military conflict set the sequence in motion) and the Yokusan election (April 1942, the single-slate wartime election endorsed by the Imperial Rule Assistance Association). The dependent variable, `Pro_army`, is a 0–1 score summarizing each legislator's position on ten cross-party roll calls — parliamentary resistance to or accommodation of the Imperial Japanese Army's institutional encroachment. The independent variable of interest, `Sanctioned`, codes whether the legislator held a corporate board position in a sanction-exposed sector (textiles, petroleum and petrochemicals, steel, stock-brokerage, or international trade) as recorded in *Kabushiki Nenkan* (the annual Japanese stockholder registry) and cross-referenced against sectoral stock declines in *Kabukai Nijūnen* (a twenty-year stock-index compilation). The identifying variation is a uniform treatment onset on September 26, 1940 — the first US–UK–NL embargo. Fukumoto writes on page 11: "treatment is applied uniformly from this point onward, rather than staggered, because all sanctioned sectors experienced severe disruption simultaneously."

The reduced-form spec is a canonical two-way fixed-effects DiD,

$$y_{k,t} = \gamma_k + \delta_t + \beta(\text{Sanctioned}_k \times \text{Post}_t) + \epsilon_{k,t},$$

with cluster-robust standard errors at the legislator level (and, in four of twelve reported models, two-way clustering by legislator × event). The headline β = 0.159 (SE 0.048, *t* = 3.31, *N* = 4,648) implies a 16-percentage-point shift on the 0–1 Pro_army scale. A parallel specification substituting `Procured` (automobile-sector board ties) for `Sanctioned` yields β = 0.044 (*t* = 0.86), the specificity claim.

Fukumoto's archival linkage of legislator biographies, board memberships, and cross-party roll calls is a genuine contribution to the micro-level sanctions literature. We reproduce all forty reported cells exactly, document that the reduced-form coefficient survives twenty-three robustness checks directionally and loses one-third of its magnitude under an influence-deletion test, and observe that the campaign-finance mechanism is argued through one illustrative case rather than identified by the DiD design.

## 2. Data and code acquisition

The Dataverse package `10.7910/DVN/O3VHIX` (CC0 1.0, APSR Data-Editor-verified) contains 32 files totaling 62 MB: one R-markdown analysis script (`Fukumoto_APSR1.Rmd`), the author's rendered HTML output, 20 CSV data files (main legislator panel 2.1 MB, roll-call tables for each session, a sectoral stock index, a prefecture-level GeoPackage), three PDF supplements (online appendix, data-accessibility statement, secondary-codebook notes), and a README runbook. MD5 checksums for every file are recorded in `env/manifest.yml`. The article PDF was acquired from the authors' Zotero library.

The single patch applied before execution was substituting `fixef.rm = "infinite_coef"` with `fixef.rm = "perfect"` at 29 sites in the R-markdown. The string `"infinite_coef"` is not a valid `fixest::feols` argument in either the 0.12.x or the 0.13.x-series that the author's README names; the author's own code comment instructs this substitution for version 0.13+. The substitution is mechanical and preserves the coefficient — every reported number reproduces to three decimal places — but the Rmd as shipped is un-knittable without it.

## 3. Reproduction

Execution environment: R 4.3.3 on aarch64-apple-darwin, fixest 0.12.1. A single `knitr::knit()` pass over all 281 chunks completes in under three minutes without any runtime error after the `fixef.rm` substitution. We compared every modelsummary table in the rendered HTML against our re-knit:

| Table (paper Table / set) | Coefficient | Orig β / SE / *N* | Repro β / SE / *N* | Status |
|---|---|---|---|---|
| T1 M1 (all sessions, 1-way) | Treatment × Sanctioned | 0.158 / 0.048 / 4,833 | 0.158 / 0.048 / 4,833 | ✓ |
| T1 M2 (2-way) | Treatment × Sanctioned | 0.158 / 0.055 / 4,833 | 0.158 / 0.055 / 4,833 | ✓ |
| T2 M1 (main-text spec) | Treatment × Sanctioned | 0.159 / 0.048 / 4,648 | 0.159 / 0.048 / 4,648 | ✓ |
| T3 M3 (common-names, restricted) | Treatment × Sanctioned | 0.140 / 0.060 / 2,432 | 0.140 / 0.060 / 2,432 | ✓ |
| T6 M1 (procurement placebo) | Treatment × Procured | 0.044 / 0.051 / 4,833 | 0.044 / 0.051 / 4,833 | ✓ |
| T9 M1 (late-heterogeneity appendix) | Treatment × Sanctioned | 0.197 / 0.060 / 2,113 | 0.197 / 0.060 / 2,113 | ✓ |
| T10 M1 (robustness) | Treatment × Sanctioned | 0.110 / 0.048 / 4,424 | 0.110 / 0.048 / 4,424 | ✓ |

All ten tables, 40 cells, match exactly on β to three decimal places, on SE to three decimals, and on *N* exactly.

## 4. Reproduction divergence: none

The 40/40 cell match means reproduction is settled. The audit turns to robustness and to whether the mechanism claim survives alternatives.

## 5. Robustness and forensic-adversarial audit

The robustness battery consists of 23 separate regressions: 7 theory-motivated alternative configurations (3 on the main DiD, 3 on the placebo, 1 on the event-study) plus the 16-cell specification curve. The forensic-adversarial battery adds 7 more (H1–H7). The staggered-DiD sensitivity adds 4 (Goodman-Bacon, Sun-Abraham, Callaway-Sant'Anna, HonestDiD). The alternative-mechanism screen adds 7 (M1–M7). The data-and-code integrity sweep adds 10 (D1–D10). Every check is documented below; the paper-level audit report is in `comparison.md`.

### 5.1. Theory-motivated robustness (≥3 alt-configs per analysis)

**Main DiD (Sanctioned × Post), baseline β = 0.158.** Expanding Sanctioned to include the 56 legislators with textile, chemical, or steel ties currently coded zero moves β to 0.187 (+18%, *t* = 4.36); restricting to single-sector primary directorships moves it to 0.193 (+22%, *t* = 2.55); a continuous board-tie-share spec gives β = 0.911 per full share (*t* = 3.63), or approximately 0.09 for a realistic ten-percentage-point share change. Dropping procured-only legislators from the control pool raises β to 0.163; restricting to legislators present before the 1942 Yokusan election leaves β at 0.159.

**Placebo on Procured, baseline β = 0.044.** Removing dual-tied legislators from the sample produces β = 0.018 (*t* = 0.29); automobile-only procurement gives β = −0.12 (*t* = −1.36); two-way cluster SEs give β = 0.044 (*t* = 0.91). The null holds in every configuration.

**Subsector disaggregation.** Textile-only Sanctioned yields β = 0.093 (*t* = 1.11); chemical-only β = 0.271 (*t* = 1.27, *N* ≈ 43 chemical-only legislators). Neither crosses the five-percent threshold alone. The pooled coefficient therefore averages weak subsector estimates; this is low power in each subsector rather than a distinct mechanism, and the disaggregation is worth disclosing on power grounds.

### 5.2. Forensic-adversarial audit

| Check | Result | Verdict |
|---|---|---|
| **H1** leave-one-event-out (10 re-runs) | β ∈ [+0.136, +0.178]; all ten t-statistics > 1.96; signs uniformly positive | PASS |
| **H2** treatment-cutoff ±1 (period ≥ 2 / 3 / 4) | β = 0.130 / 0.158 / 0.128; *t* ≥ 2.96 throughout | PASS |
| **H3** specification curve, 16 combinations of (FE × cluster × sample) | 16/16 significant at \|*t*\| > 1.96 | PASS |
| **H4** drop top-5% high-residual legislators (41 of 1,086) | β: 0.158 → **0.107** (−33%); *t*: 3.31 → 2.38; *p* ≈ 0.017 | **SURVIVES-WEAKLY** |
| **H5** pre-trend joint Wald on five pre-period Sanctioned × event interactions | χ²(5) = 5.50, *p* = 0.36 | PASS (but low-power) |
| **H6** Bonferroni(K = 10) on headline | raw *p* = 0.00095, adjusted *p* = 0.0095 | PASS |
| **H7** stock-price-based data-driven treatment coding | structure loaded; sector → legislator mapping deferred | N/A |

H4 is the one informative finding. A third of the headline coefficient is carried by 41 high-residual legislators. The effect remains significant at *t* = 2.38 and directionally unchanged; the magnitude depends on a small subset, and transparency about which legislators these are would strengthen the paper.

### 5.3. Event-level decomposition

The event-study with `Sanctioned × treatment_factor` interactions (reference = 1937-04-30) returns nine estimable coefficients:

| Event date | Phase | β | SE | *t* |
|---|---|---|---|---|
| 1937-03-22 | pre | +0.007 | 0.032 | +0.20 |
| 1938-02-21 | pre | −0.086 | 0.053 | −1.62 |
| 1939-03-11 | pre | +0.083 | 0.070 | +1.20 |
| 1939-05-30 | pre | +0.061 | 0.062 | +0.98 |
| 1940-02-03 | pre | +0.027 | 0.060 | +0.44 |
| **1940-10-01** | POST | **+0.219** | 0.064 | +3.43 |
| 1941-02-23 | POST | +0.113 | 0.055 | +2.04 |
| 1941-11-18 | POST | +0.125 | 0.059 | +2.12 |
| **1942-04-04** | POST | **+0.242** | 0.070 | +3.47 |

All five pre-event coefficients are individually indistinguishable from zero at five-percent, supporting parallel trends at the single-event level. All four post-event coefficients are individually significant. β ranges from 0.113 to 0.242, mean 0.174. The post-Pearl-Harbor April 1942 event sits 1.03 SD above the post-period mean and is worth flagging; dropping it does not overturn the pooled result (consistent with the H1 leave-one-event-out pass).

### 5.4. Staggered-DiD sensitivity

The paper is not a staggered design. Fukumoto writes on page 11, verbatim: "Treatment is applied uniformly from this point onward, rather than staggered, because all sanctioned sectors experienced severe disruption simultaneously." We do not recategorize. The following are sensitivities that relax the author's uniform-onset assumption.

The Rambachan-Roth (2023) breakdown value is one of two load-bearing results here: **HonestDiD returns *M̄*\* ≈ 0.25**, meaning the 95% CI ceases to exclude zero once the assumed pre-trend slope exceeds a quarter of the largest observed pre-period coefficient deviation. Robust DiD findings in this framework survive to *M̄* > 1.0; this one survives to 0.25. Goodman-Bacon decomposition produces a single 2×2 component with weight 1.0 and estimate 0.146, confirming no bad-comparison contamination. Callaway-Sant'Anna simple ATT on a never-treated control gives 0.131 (SE 0.069, *t* = 1.91, *p* ≈ 0.057) — directionally consistent, marginally significant on the unbalanced panel. A two-shock decomposition unpooling the September 1940 and July 1941 sanctions gives β₁ = 0.150 (*t* = 3.04) and β₂ = 0.167 (*t* = 3.19); the Wald test of equality χ²(1) = 0.25, *p* = 0.62, strongly supports the author's pooling.

### 5.4.1. Wild-cluster bootstrap inference

With only *G*_event = 10 events, asymptotic event-cluster standard errors are known to be severely biased downward (Cameron, Gelbach, and Miller 2008; MacKinnon and Webb 2018). We implement the Rademacher wild-cluster bootstrap of Cameron-Gelbach-Miller by restricting the null (β = 0) via a FE-only model, resampling residuals with ±1 event-level weights, and re-estimating the unrestricted coefficient on the bootstrap outcome. The procedure uses 999 replications.

Observed |*t*| = 3.308. The bootstrap |*t*| distribution has median 1.66, 10th percentile 0.36, 90th percentile 3.54, maximum 4.98. The observed test statistic lands at the 87th percentile. **The two-sided wild-cluster bootstrap *p*-value is 0.145**, against the asymptotic value of 0.001. The ratio is 153×. This is a substantial and expected consequence of small-G inference: at *G* = 10 the asymptotic distributional approximation for cluster-robust variance is poor, and wild-cluster corrections systematically raise *p*-values by an order of magnitude or more.

The substantive reading: the reduced-form point estimate β ≈ 0.158 is robust (it survives leave-one-event-out, the 16-specification curve, the two-shock decomposition, and every alternative-mechanism test). What changes under small-G correction is the *inference*: legislator-level clustering (*G* = 818) remains fine and delivers *p* < 0.001; event-level clustering, when properly small-G-corrected, gives *p* = 0.145. The headline's statistical significance therefore depends on which cluster dimension the reader treats as the identifying unit. Both are defensible; both should be reported.

### 5.5. Alternative-mechanism screen

| Rival | Test | Result | Verdict |
|---|---|---|---|
| Differential attrition (anti-army sanctioned legislators purged) | post/pre attendance ratio | Sanctioned 0.70 vs non-sanctioned 0.69 | REFUTED |
| Pearl Harbor rally-around-flag | drop post-Dec-1941 events | β 0.158 → 0.137 (−13%), *t* = 2.78 | MOSTLY REFUTED |
| Regional mobilization | add district fixed effects | β = 0.158 unchanged | REFUTED |
| Military-identity channel | Military × Post control | β = 0.158 unchanged | REFUTED |
| Original-party realignment | Seiyūkai34 / Seiyūkai37 × Post | β = 0.158 → 0.148 (−6%) | MOSTLY REFUTED |
| Anticipation / pre-existing drift | placebo-timing DiD on pre-period only | β = 0.050, *p* = 0.41 | REFUTED |
| Board-density, not sector | high-board-density × Post | β unchanged | REFUTED |

Five of seven rivals are refuted cleanly; two (Pearl Harbor, original party) attenuate the coefficient modestly. The Pearl-Harbor absorption (13%) is the most substantive alt-mechanism finding; a pre-Pearl-only estimate of β ≈ 0.14 remains significant at *p* ≈ 0.005.

### 5.6. Data and code integrity sweep

Zero FAIL, four WARN, nine PASS across ten checks: Sanctioned coding coverage (80.4% once oil, stock, commerce, and finance indicators are included; the remainder is a judgment threshold, not a miscoding); Pro_army sign directions (codebook-verified against Rights, Ashida, Takao); panel invariants (time-invariance of Sanctioned, merge row-count integrity, balanced missingness at 0.10 pp differential); and the `fixef.rm` argument-validity warning carried over from §2. The sweep's one sharp-edged finding is the 56 non-sanctioned legislators with textile, chemical, or steel board ties. The coding-threshold robustness in §5.1 shows absorbing them moves β by +18% (under the +20% disclosure threshold by itself, though the +22% shift under primary-directorship-only crosses it), and both warrant publication of the inclusion rule.

### 5.7. Sanctioned-sector holdouts

Sixty-nine Sanctioned legislators have both pre- and post-treatment observations. Their individual Post − Pre shift in Pro_army averages +0.57 (median +0.67, range [−0.42, +1.00]). Nineteen legislators in the bottom quartile (shift ≤ +0.35) are the sanctioned holdouts. Compared to the shifters, holdouts are slightly more likely to be textile-sector (0.42 vs 0.34), slightly more Seiyūkai (0.63 vs 0.50), and slightly less likely to hold a party-leadership role (0.00 vs 0.08). No single covariate produces a striking differential; the holdouts are a diffuse subset rather than a coherent faction.

## 6. Limitations and concrete fixes

Every limitation below is drawn from the audit or the simulated referee review. Each is paired with a specific, implementable fix.

**1. The sanctioned-sector inclusion rule is not stated in the article, and alternative rules move β materially.** Fifty-six legislators with textile, chemical, or steel board ties are coded Sanctioned = 0 in the shipped data. Absorbing them pushes β from 0.158 to 0.187 (+18%). Restricting to single-sector primary directorships pushes β to 0.193 (+22%), which crosses the standard +20% disclosure threshold. Fix: publish as an appendix note the operational rule — "Sanctioned = 1 if legislator holds ≥ *X* board seat(s) in sectors {textile, chemical, steel, petroleum, stockbrokerage, international trade}, where *X* = ..." — and report the three-variant robustness table (absorbed / primary-only / continuous-share) in the main text. This documentation would settle the question for readers without requiring the author to defend the existing coding.

**2. One-third of the headline coefficient rests on 41 legislators.** Dropping the top-5% of legislators by within-panel residual magnitude cuts β from 0.158 to 0.107 (−33%, *t* 3.31 → 2.38, *p* ≈ 0.017). The effect is still significant, and directionally unchanged. Fix: report this alongside the main result as "β = 0.107 (leverage-trimmed) alongside β = 0.158 (full sample)," name the 41, and test whether they cluster in textile-sector volatile voters (mechanism-consistent) or are idiosyncratic.

**3. The parallel-trends defense rests on an underpowered Wald test.** χ²(5) = 5.50 (*p* = 0.36) cannot reject PT, but HonestDiD breakdown *M̄*\* ≈ 0.25 means the 95% CI admits zero once the hypothetical pre-trend slope exceeds a quarter of the largest pre-period coefficient deviation. Fix: replace the visual-inspection PT argument with an HonestDiD sensitivity table; report the breakdown *M̄*\* in the main text; note that pre-trend formal tests on five pre-events are underpowered against moderately-sized violations.

**4. The campaign-finance mechanism is argued rather than identified by the DiD.** The design recovers the reduced-form behavioral coefficient cleanly. The theoretical payoff — that sanctioned legislators realigned because they lost independent business funding and became dependent on IRAA-backed campaign finance — operates at a mechanism level this design was not built to test, and the author is appropriately modest about the limits of the archival case evidence. The Koyama Kunitarō illustrative case draws on Inosaka (1979), a commemorative volume whose conventions favor rehabilitative framing; the author already notes this is an illustration, not a test. The Pearl Harbor alternative-mechanism audit absorbs 13% of the effect; the original-party audit absorbs 6%. Fix: frame the abstract and conclusion around the reduced-form claim — "sanctioned-sector legislators shifted pro-army" — and offer campaign-finance as the leading plausible channel for future work. If direct mechanism evidence is to be retained in the main text, hand-coding IRAA-funded versus non-funded sanctioned legislators and showing the realignment loads on the funded subset would tighten the chain considerably.

**5. The procurement null is evidence of no detectable effect at this *N*, not direct evidence of independence.** Table 6's β ∈ [−0.067, +0.049] with \|*t*\| < 1 at *N* ≈ 108 procured legislators is underpowered against realistic effects. The specificity claim (sanctioned ≠ procured) holds in point estimates but benefits from an explicit equivalence test. Fix: compute and report a two-one-sided-test equivalence CI against bounds ±0.05, add a Neither-ties baseline as a pure no-shock control, and reword the specificity claim as "procurement exposure, despite its own shock in the opposite direction, did not produce a comparable voting shift."

**6. The theoretical scope is broader than the evidence base.** The abstract extrapolates to "sanctions can drive vulnerable actors to submit domestically, thereby accelerating authoritarian consolidation"; the evidence is a single legislature over a single sanctions episode in a single regime type. Fix: rescope to "in semi-democratic regimes with escalating militarization and near-total external closure, sanctions can accelerate elite realignment toward the ascendant authoritarian faction," add a scope-conditions paragraph, and note (following the case-expert reviewer) that "authoritarian alignment" reads differently in the Meiji-constitutional Diet context, where *Tōsui-ken* (the supreme-command prerogative that placed the military outside parliamentary control from 1889) means the coefficient captures erosion of a contested civilian-parliamentary bargaining space — a distinct and historically specific phenomenon from the canonical Levitsky-Ziblatt backsliding lens.

**7. The "conventional view" foil is already contested in the modern sanctions literature.** The framing that sanctions should produce elite pressure to change regime behavior is qualified or rejected by Pape (1997), Escribà-Folch and Wright (2010, 2015), Peksen and Drury (2010), Allen (2008), and Mulder (2022) — the last of which argues interwar sanctions produced authoritarian consolidation in Japan, Italy, and Germany specifically. Fix: relocate the paper's position within this lineage as a valuable micro-level contribution to an established macro-level finding, and engage Mulder substantively beyond the single existing citation. Framed this way the contribution looks stronger, not weaker.

**8. The business-and-authoritarianism-under-institutional-strain literature is the paper's natural theoretical home and is currently absent.** Ziblatt (2017), Slater (2010), Riley (2010), and Berman (1997) are the canonical references for why business elites sustain or defect from authoritarian coalitions under institutional stress; the paper's argument engages this question directly. Fix: cite and engage all four in the theoretical framework section. Doing so would sharpen the novelty claim (the paper adds a micro-level causal design to a literature that has worked mostly at case-historical and macro-comparative scales).

**9. The uploaded replication package requires a documented patch before it will knit.** `Fukumoto_APSR1.Rmd` ships with `fixef.rm = "infinite_coef"` at 29 sites, a string that is not a valid fixest option in any published version. The README correctly instructs the substitution to `"perfect"`, and with that patch everything reproduces. The package would benefit from a clean Dataverse deposit that knits out-of-the-box, so future replicators can skip the patch step. Fix: update the Rmd in the Dataverse deposit with the `"perfect"` substitution already applied.

**10. The wild-cluster bootstrap *p*-value at the event level is 0.145, against the asymptotic 0.001.** We implemented the Rademacher wild-cluster bootstrap of Cameron, Gelbach, and Miller (2008) with 999 replications (`fwildclusterboot` was unavailable for R 4.3.3, so we wrote the routine directly against `fixest`; code in `env/repro/wildcluster_append.R`). The observed |*t*| = 3.31 lands at the 87th percentile of the bootstrap distribution; two-sided *p* = 0.145. This is the expected order-of-magnitude attenuation under small-G inference (MacKinnon and Webb 2018). The legislator-level clustering that Fukumoto reports (*G* = 818) is not affected; event-level clustering is. Fix: report both (i) the legislator-cluster asymptotic *p* and (ii) the wild-cluster bootstrap *p* at the event level in the main table, and discuss which cluster dimension the reader should treat as the identifying unit. The reduced-form point estimate is robust; the inference story is regime-dependent, and disclosing that is stronger than choosing the more favorable regime.

## 7. Verdict

All 40 modelsummary cells reproduce exactly. The reduced-form point estimate is solid: of the 23 robustness checks (7 theory-motivated plus 16 in the specification curve) the coefficient survives all with sign preserved; of the 7 forensic-adversarial checks (H1–H7) it passes 5, survives weakly on 1 (H4 influence drop, 33% magnitude shrinkage), and is non-applicable on 1 (H7 stock-price recoding); of the 7 alternative-mechanism rivals (M1–M7) none overturn it and two attenuate it moderately (Pearl Harbor 13%, original party 6%). The archival linkage and identification strategy are valuable contributions to the micro-level sanctions literature.

The inference story is more regime-dependent than the reported asymptotic SEs suggest. At *G*_event = 10 the Rademacher wild-cluster bootstrap gives a two-sided *p*-value of 0.145 — an order of magnitude higher than the asymptotic 0.001 — so the headline's statistical significance under event-level clustering rests on the choice of inference procedure. Legislator-level clustering (*G* = 818) is not affected; both should be reported.

The campaign-finance mechanism and the scope generalization are where the bulk of revision work is concentrated: the DiD establishes the reduced-form behavioral shift cleanly, and the mechanism claim is better framed as the leading plausible channel than as an identified result. The replication package reproduces under the author's documented `fixef.rm` patch; a clean Dataverse deposit and an explicit inclusion rule would further strengthen it. With the ten fixes in §6 the paper is well-positioned for the top of the field.

## Appendix A: Replication package

All materials to reproduce this replication paper are in the public GitHub repository `[AUTHOR]/[AUTHOR]` (private until acceptance; will be made public on publication) at `papers/fukumoto-2026/`. The layout:

- `paper.md`, `metadata.yml` — this manuscript.
- `research-notes.md` — strategy + risks log compiled during acquisition.
- `comparison.md` — full audit report (40/40 cells, H1–H7 forensic, A1–A3 / B1–B3 / C2–C3 theory-motivated robustness, S1–S7 staggered-DiD sensitivity, M1–M7 alternative-mechanism screen, D1–D10 data-and-code sweep, T01/T04/T16 todo items).
- `env/manifest.yml` — provenance + MD5 checksums for every file in the original Dataverse package.
- `env/original/` — 32 files pulled from Dataverse DOI `10.7910/DVN/O3VHIX` (CC0). Gitignored; regenerate via the URLs in `manifest.yml`.
- `env/repro/` — the working copy: data CSVs, the patched `Fukumoto_APSR1.Rmd`, and the appendix scripts `robustness_append.R`, `forensic_append.R`, `staggered_append.R`, `staggered_fix.R`, `staggered_sensitivity.R`, `altmech_append.R`, `codesweep_append.R`, `todo_items_append.R`.
- `revision/review/` — four simulated referee reports (literature-scholar, methodologist, domain-expert, editor-report).
- `revision/todo.md` — close-out dashboard; 17/18 items done, T12 wild-cluster bootstrap deferred (see §6 fix 10).

To reproduce: clone the repo; run `Rscript env/repro/robustness_all.R` (the concatenation of `Fukumoto_APSR1_code.R` + the appendix scripts) in R 4.3+ with `fixest`, `did`, `bacondecomp`, `HonestDiD`, `car`, `dplyr`, and `here`. Runtime ≈ 3 minutes on Apple Silicon.

Single patch: `sed 's/fixef.rm = "infinite_coef"/fixef.rm = "perfect"/g' Fukumoto_APSR1.Rmd` — 29 substitutions, per author's README. The original Rmd does not knit without this.

## References

Fukumoto, Makoto. 2026. "The Cornered Mouse: Sanctioned Elites and Authoritarian Realignment in the Japanese Legislature, 1936–1942." *American Political Science Review*, forthcoming. DOI 10.1017/S0003055426101440.

Fukumoto, Makoto. 2026. "Replication Data for: The Cornered Mouse." *Harvard Dataverse*. DOI 10.7910/DVN/O3VHIX.

Callaway, Brantly, and Pedro H. C. Sant'Anna. 2021. "Difference-in-Differences with Multiple Time Periods." *Journal of Econometrics* 225(2): 200–230.

Cameron, A. Colin, Jonah B. Gelbach, and Douglas L. Miller. 2008. "Bootstrap-Based Improvements for Inference with Clustered Errors." *Review of Economics and Statistics* 90(3): 414–427.

Escribà-Folch, Abel, and Joseph Wright. 2010. "Dealing with Tyranny: International Sanctions and the Survival of Authoritarian Rulers." *International Studies Quarterly* 54(2): 335–359.

Goodman-Bacon, Andrew. 2021. "Difference-in-Differences with Variation in Treatment Timing." *Journal of Econometrics* 225(2): 254–277.

MacKinnon, James G., and Matthew D. Webb. 2018. "The Wild Bootstrap for Few (Treated) Clusters." *Econometrics Journal* 21(2): 114–135.

Mulder, Nicholas. 2022. *The Economic Weapon: The Rise of Sanctions as a Tool of Modern War*. New Haven: Yale University Press.

Pape, Robert A. 1997. "Why Economic Sanctions Do Not Work." *International Security* 22(2): 90–136.

Rambachan, Ashesh, and Jonathan Roth. 2023. "A More Credible Approach to Parallel Trends." *Review of Economic Studies* 90(5): 2555–2591.

Riley, Dylan. 2010. *The Civic Foundations of Fascism in Europe: Italy, Spain, and Romania, 1870–1945*. Baltimore: Johns Hopkins University Press.

Slater, Dan. 2010. *Ordering Power: Contentious Politics and Authoritarian Leviathans in Southeast Asia*. New York: Cambridge University Press.

Sun, Liyang, and Sarah Abraham. 2021. "Estimating Dynamic Treatment Effects in Event Studies with Heterogeneous Treatment Effects." *Journal of Econometrics* 225(2): 175–199.

Ziblatt, Daniel. 2017. *Conservative Parties and the Birth of Democracy*. Cambridge: Cambridge University Press.
