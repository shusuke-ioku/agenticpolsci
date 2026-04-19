# A formal and substantive replication of Hirsch and Shotts (2026): veto players, policy development, and the scope of the centrist-welfare result

## Abstract

This paper is a formal and substantive replication of Hirsch and Shotts (2026), "Veto players and policy development," *American Journal of Political Science* 70, DOI 10.1111/ajps.70046. The formal component re-derives every stated result: four main-text propositions, four appendix propositions, two corollaries, and ten lemmas. All substantive conclusions hold. Two real gaps are identified: Proposition 3's Part 1b case (ii) argument contains an algebraic slip (the convexity step is false for $\alpha \geq 5$, though a feasibility argument not stated in the paper preserves the conclusion), and Proposition C.1's displayed closed-form decisionmaker utility is numerically incorrect (paper 0.206 vs. correct 0.540 at one test point), though the error is isolated and does not propagate. A minor sign typo appears in Proposition 1 step 3a. The substantive component runs a zero-context blind rebuild from the abstract alone; it converges on the player skeleton and hump-shaped centrist welfare but diverges on mechanism. The paper's headline "veto players can benefit centrists" result requires $y_0 \neq 0$; a symmetric status quo flips the sign. This scope condition is not prominent in the abstract.

## 1. The model

Hirsch and Shotts (2026) analyze a three-stage complete-information game with four types of players arrayed on a one-dimensional ideological axis. Two *policy developers* $L$ and $R$ have ideal points $x_L \leq x_{VL} < 0 < x_{VR} \leq x_R$. A centrist *decisionmaker* (DM) sits at $x_D = 0$. Two *veto players* (VPs) sit at $x_{VL}$ and $x_{VR}$. Policies are two-dimensional pairs $(y, q)$ of ideology $y \in \mathbb{R}$ and quality $q \geq 0$. Every player evaluates a realized policy by the quasi-linear spatial utility $U_i(y, q) = q - (x_i - y)^2$. Quality is thus a public valence good: all players prefer higher $q$, holding $y$ fixed. The status quo is $b_0 = (y_0, 0)$ with $y_0 \in [x_{VL}, x_{VR}]$, placing the baseline policy somewhere in the gridlock interval between the two VPs at zero quality.

Timing runs as follows. In stage 1, $L$ and $R$ simultaneously and independently choose whether to develop a new policy, and if so which one; developer $i$ who crafts quality $q$ pays up-front cost $\alpha_i q$, with $\alpha_i > 2$. In stage 2, DM observes the set of crafted policies and proposes either the status quo or one developed policy. In stage 3, both VPs simultaneously accept or reject; a policy is adopted only if both accept. Otherwise $b_0$ prevails. The solution concept is subgame-perfect equilibrium, with sincere VP voting as the focal tie-breaking convention.

The analysis is conducted in *score-ideology* coordinates. Define the *score* $s \equiv q - y^2$, which equals DM's utility at $(y, q)$ since $x_D = 0$. In these coordinates, player $i$'s utility is $V_i(s, y) = -x_i^2 + s + 2 x_i y$, developer $i$'s cost is $\alpha_i (s + y^2)$, and the status quo has score $s_0 = -y_0^2$. Definition A.1 defines the *veto-proof set*: at score $s \geq s_0$, both VPs accept $(s, y)$ over $(s_0, y_0)$ iff $y \in [z_L(s), z_R(s)]$, where $z_i(s) = y_0 - (s - s_0) / (2 x_{V,-i})$ is the opposite-side VP's indifference ideology at score $s$. Cost in score coordinates is strictly convex in $y$ (second derivative $-2\alpha_i < 0$), which is the algebraic engine behind all the paper's quadratic optimization steps.

Two sub-models run in parallel. The *monopolist* case (Proposition 1) assumes one developer is exogenously inactive and closes the other developer's optimization problem. The *competitive* case (Propositions 2–4 and the corollaries) allows both developers to move simultaneously; the characterization divides $(x_V, y_0)$ space into three regimes — gridlock, asymmetric pure-strategy, and symmetric mixed-strategy — and relies on an extensive appendix apparatus (Lemmas A.1–A.6, B.1, B.2; Proposition B.1; Propositions C.1–C.3) to characterize equilibrium score CDFs. The key comparative static parameter is the VPs' extremism $x_V$ (in the symmetric specialization $x_{VL} = -x_V$, $x_{VR} = x_V$); the key conditioning parameter is $y_0$, which pins down which of the two developers faces a more favorable status quo and is therefore less motivated to craft a replacement.

Substantively, the paper argues that moderate VPs support two-sided competitive development; somewhat-extreme VPs induce asymmetric participation, with the less-motivated developer sometimes sitting out; highly extreme VPs produce gridlock. Centrist welfare is non-monotone in VP extremism: DM prefers moderately extreme VPs to none, because a constraining VP forces the motivated developer to craft a moderate, high-quality proposal.

## 2. Replication scope

This replication covers the entire formal apparatus of the paper. On the formal side, I verified every numbered proposition, corollary, and lemma: Propositions 1, 2, 3, 4 in the main text; Propositions B.1, C.1, C.2, C.3 in the appendix; Corollaries 1 and 2; main-text Lemmas 1 and 2; and appendix Lemmas A.1 through A.6, B.1, and B.2. That is four main-text propositions, four appendix propositions, two corollaries, and ten lemmas — the complete set of formal objects the paper states and proves.

For each result I walked the proof step by step against the appendix text, re-derived all algebraic transitions symbolically with sympy 1.14.0, and classified every sub-step as PASS, AMBIGUOUS, or FAIL. Computational sub-claims — specifically Proposition 3's Part 1c monotonicity of the less-motivated developer's active probability within the mixed-strategy region, and Proposition 4's DM-utility calculation in the both-developers-active mixed case — are explicitly computational in the paper (they are cited as numerical evaluations of Proposition C.3's equilibrium) and are flagged rather than independently re-run. I did, however, numerically verify Proposition 4's $\tilde{\alpha} \approx 3.68$ threshold (sympy gives $\tilde{\alpha} \approx 3.68004$, matching the paper's claim).

On the substantive side, I ran a zero-context blind rebuild. A separate modeler received a curated briefing — the paper's abstract and a portion of its motivational introduction, with all model specifications, proposition statements, and prior-work citations redacted — and was instructed to independently formalize the question. The blind rebuild produced a 5-player SPE game (one centrist, two developers at $\pm \theta_D$, two symmetric veto pivots at $\pm \nu$) with linear quality cost and additive public-valence quality. Its predictions were then compared to the paper's in a structured convergence analysis. The discipline matters because it separates "discoveries that any principled formalization of the question would yield" from "discoveries that depend on the paper's specific modeling choices."

Both pieces of work fed a combined validity-and-robustness assessment. The aggregate picture is that the paper's formal claims essentially all hold, with two identified gaps that are either isolated or repairable; the headline qualitative results are robust to the blind rebuild's alternative modeling choices; and one critical scope condition (the status-quo position $y_0 \neq 0$) is load-bearing for the paper's most-publicized finding in a way the abstract does not disclose.

## 3. Formal verification

### 3.1 Main-text propositions

**Proposition 1 (monopolist characterization).** VERIFIED. Proposition 1 states that a monopolist developer $i$ crafts a policy at ideology $y_i^{M*} = \max\{y_0, \hat{y}_R\}$ for $i = R$ (and the mirror-image expression for $L$), where $\hat{y}_R = \frac{1}{\alpha_R} x_R + \left(1 - \frac{1}{\alpha_R}\right) x_{VL}$ is a convex combination of the developer's ideal point and the opposite-side VP's ideal point. The monopolist invests iff $|y_0 - x_i| > |\hat{y}_i - x_i|$, i.e., iff the status quo is farther from her ideal than her ideal monopoly policy. The proof reduces the three-stage game to a direct-choice problem, argues that the opposite-side VP's acceptance constraint is the only binding one, substitutes the binding constraint into the payoff, and differentiates. Every step checks symbolically. One minor sign typo appears at step 3a: the paper writes $s_R = 2 x_{VL}(y_0 - y_R) - s_0$, whereas inversion of $y_R = z_R(s_R)$ actually yields $s_R = 2 x_{VL}(y_0 - y_R) + s_0$. Because $s_0$ is constant in the variable of differentiation, the typo vanishes at the next step and neither $\hat{y}_R$ nor the invest-iff condition is affected.

**Proposition 2 (three-regime typology).** VERIFIED. Proposition 2 characterizes the $(x_V, y_0)$ parameter space. If $x_V \geq \bar{x}_V = x_E/(\alpha-1)$ and $y_0 \in [\hat{y}_R(x_V), \hat{y}_L(x_V)]$, the unique equilibrium features no activity. Otherwise at least one developer is active; the more-motivated developer is always active (Part 2a), a pure-strategy equilibrium with the less-motivated developer inactive exists iff $y_0 \notin [-\bar{y}(x_V), \bar{y}(x_V)]$ (Part 2b), and a mixed equilibrium with the less-motivated developer sometimes active obtains when $y_0 \in [-\bar{y}(x_V), \bar{y}(x_V)]$ (Part 2c); the more-motivated developer's policy CDF first-order stochastically dominates her opponent's (Part 3). The gridlock cutoffs, the case (i) cutoff $\check{y}(x_V) = x_E/\alpha - x_V(\alpha+1)/(3\alpha)$, and the case (ii) cutoff $\tilde{y}(x_V)$ arising from the quadratic $\tilde{G}(y_0; x_V, x_E)$ all verify symbolically. Continuity of $\bar{y}$ at the case-(i)/(ii) boundary $y_0 = (\alpha-1)/(2\alpha)\, x_V$ also checks (both roots equal $3 x_E (\alpha-1)/(\alpha(5\alpha-1))$ at the transition). Parts 2a, 2c, and 3 import the structure from Proposition C.3.

**Proposition 3 (comparative statics in $x_V$).** GAP in Part 1b case (ii). Part 2 — that the more-motivated developer is active iff $x_V < (\alpha |y_0| + x_E)/(\alpha-1)$ — is a direct restatement of Proposition 1's invest-condition and verifies. Part 1a (less-motivated active probability is zero in the pure region) is definitional. Part 1b (the pure-equilibrium region is upward-closed in $x_V$) is where the gap lives. The paper argues that $\tilde{G}(y_0; x_V, x_E)$ is strictly convex in $x_V$ and that $\tilde{G}(y_0; x_E, x_E) \leq 0$ always, closing the convexity step. The second assertion is algebraically false. Sympy gives $\tilde{G}(y_0; x_E, x_E)$ as a quadratic in $y_0$ with discriminant $-x_E^2 (\alpha-1)(\alpha-5)$, which is positive-valued whenever $\alpha > 5$. A concrete counterexample: $\alpha = 5$, $x_E = 1$, $y_0 = 0.6$ gives $\tilde{G} = +0.8 > 0$.

The substantive conclusion, however, survives. The formula A.10 from which $\tilde{G}$ is derived presumes that the candidate entry ideology $x_E/\alpha$ is feasible for the right developer at L's monopoly score, i.e., $x_E/\alpha \geq z_L(s_L^{M*})$. Algebra reduces this to $x_V \leq 2 x_E/(\alpha-1)$. Outside that regime, the right developer's best veto-proof entry is $z_L(s_L^{M*}) = y_L^{M*}$ — the same policy L has already crafted — for which the net benefit is always negative (R pays the cost for an outcome R could have gotten free). Case-splitting the proof at $x_V = 2 x_E/(\alpha-1)$ recovers Part 1b cleanly. Part 1c (monotonicity of the less-motivated developer's active probability within the mixed region) is explicitly computational and is not independently re-run.

**Proposition 4 (centrist welfare).** VERIFIED, with one computational sub-component. The proposition asserts that DM prefers to eliminate the VPs iff either the VPs or the status quo are sufficiently moderate. The proof combines four analytical components — $\text{EU}^0_D$ from Corollary 2 as the no-VP baseline; Proposition C.2's strict-harm result at $y_0 = 0$; the trivial case of no-activity with DM utility $s_0 \leq 0$; and Corollary 1's monotonicity to reach the one-active-developer case — with one computational component (both developers active, $y_0 \neq 0$). The analytical parts all verify. The $\tilde{\alpha} \approx 3.68$ threshold is numerically confirmed: at $x_V = x_E$, $y_0 = -x_E$, sympy gives $s_R^{M*} - \text{EU}^0_D$ crossing zero at $\tilde{\alpha} \approx 3.68004$, matching the paper. The mixed-strategy computation is flagged as computational and not re-run.

### 3.2 Corollaries

**Corollary 1** (monopoly score monotonic in $y_0$). VERIFIED. The derivation is in-line in the main text rather than in Appendix D and proceeds from Proposition 1's closed forms. Substituting the binding VP constraint and $s_0 = -y_0^2$ gives $s_L^{M*} = -y_0^2 + 2 x_{VR}(y_0 - \hat{y}_L)$; differentiating yields $ds_L^{M*}/dy_0 = 2(x_{VR} - y_0) \geq 0$, strict for $y_0 < x_{VR}$. The right-developer case is symmetric with $x_{VL}$. Both monotonicities are sympy-confirmed. The corollary underpins Proposition 4's case where one developer is active: the monopoly score rises with $|y_0|$, so an extreme enough status quo makes even a monopolist's output preferable to the no-VP benchmark.

**Corollary 2** (closed-form no-VP DM utility). VERIFIED, with an external dependency. The corollary states that absent veto players, $\text{EU}^0_D = 4 x_E^2 \left(\alpha + 1/2 - 2/(3\alpha) - (\alpha^2 - 1) \ln(\alpha/(\alpha-1))\right)$. The Appendix D proof is a one-line citation to Equation 3 and Footnote 4 of Hirsch and Shotts (2015). I do not re-verify the external derivation but do verify the integral-to-closed-form step: evaluating the double integral symbolically and numerically at multiple values of $\alpha$ reproduces the stated expression within floating-point precision. For $\alpha > 2$ the value is strictly positive (0.136 at $\alpha = 3$, 0.072 at $\alpha = 4$), which Proposition 4's argument requires.

### 3.3 Appendix propositions

**Proposition B.1 (score-CDF equilibrium conditions).** VERIFIED. Proposition B.1 is the workhorse of the appendix: it gives necessary and sufficient conditions for a score-CDF pair $(F_L, F_R)$ to satisfy score optimality, decomposed into four conditional regimes keyed on whether $s_0 = \underline{s} = \bar{s}$ (both inactive), $s_0 < \underline{s} = \bar{s}$ (asymmetric pure), $\underline{s} < \bar{s}$ (mixed), or a combination. The proof draws on Lemmas A.3, A.4, A.5, A.6, B.2, threading through atom structure, right-derivative conditions at $s_0$, the ODE that governs the mixing region, and the boundary conditions linking the two. Ten of eleven sub-steps pass cleanly; one minor ambiguity concerns whether $\max\{D_i, 0\}$ or plain $D_i$ is the correct derivative term in the necessity derivation (they are equivalent under score optimality, but the exposition leaves it as a reader exercise).

**Proposition C.1 (symmetric equilibrium, $y_0 = 0$).** FAIL on the displayed closed-form DM utility. The proposition characterizes the symmetric mixed equilibrium when $y_0 = 0$. Every intermediate ingredient verifies: the inactivity threshold ($\alpha \geq 1 + x_E/x_V$), the atom at zero $F(0) = \alpha/(1 + x_E/x_V)$, the linear ODE solution $\hat{s}(F)$ on the constrained region, the transition point $\breve{s}$, and the logarithmic closed form $\tilde{s}(F) = \breve{s} + 4 x_E^2 [\ln((\alpha - \breve{F})/(\alpha - F)) - (F - \breve{F})/\alpha]$ on the unconstrained region. The error is in the final substitution of these ingredients into $\text{EU}_D = \int 2 F \cdot s(F)\, dF$ and the subsequent simplification. The paper displays the part-2 (unconstrained-region) integral as involving the bracket $\left[(1-\breve{F})((\alpha + 1 + \breve{F})/2 - (2 - \breve{F})(1 - \breve{F})/(3\alpha)) - (\alpha^2 - 1)\ln((\alpha - \breve{F})/(\alpha - 1))\right]$; direct symbolic and numerical integration (sympy plus scipy.quad) yields instead $\alpha(1 - \breve{F}) + (1 - \breve{F}^2)/2 - 2/(3\alpha) + \breve{F}/\alpha - \breve{F}^3/(3\alpha) - (\alpha^2 - 1)\ln((\alpha - \breve{F})/(\alpha - 1))$. At $x_V = 1$, $x_E = 2$, $\alpha = 2.1$ the paper's formula gives $\text{EU}_D \approx 0.206$; the correct total is $\approx 0.540$. The discrepancy is material when $\breve{F} < 1$; when $\breve{F} = 1$ (the $\hat{s}$-only regime, the paper's "first case") the part-1 formula agrees exactly.

The error is isolated. Proposition C.2's proof uses $\hat{s}(F)$ and the raw integrand for $\tilde{s}(F)$ rather than the simplified closed form, and Proposition 4 cites Proposition C.2 without substituting C.1's displayed formula. No downstream claim depends on the erroneous expression, but the formula as printed in the paper is numerically wrong and should be corrected.

**Proposition C.2 (FOSD dominance when $y_0 = 0$).** VERIFIED. Proposition C.2 proves that in the symmetric $y_0 = 0$ case, DM's no-VP payoff FOSD-dominates her VP payoff. Because DM picks the max-score policy and payoffs are iid in the competitive case, FOSD of payoffs follows from FOSD of score CDFs. The proof exploits that $\hat{s}(F)$ is linear while $\tilde{s}_C(F)$ is strictly convex, so matching slopes at $\breve{F}$ reduces the full inequality to a single-point comparison that the paper then closes by bounding $\alpha - G$ from below. All seven sub-steps verify.

**Proposition C.3 (asymmetric equilibrium, $y_0 < 0$).** VERIFIED. Proposition C.3 is the longest appendix result: it characterizes the equilibrium when $y_0 < 0$ (equivalently $D_L < D_R$ everywhere), establishing that the less-motivated developer L is sometimes inactive, the more-motivated R is always active, there is a single merging point $\breve{s}$ above which $F_L = F_R$, and R's CDF FOSD-dominates L's. The proof threads fourteen sub-claims through Proposition B.1's conditions, implicit use of Lemma A.3, and delicate arguments about whether $D_R$ is positive or negative near the crossing. One sub-step (uniqueness of the pure-strategy form) is asserted with the phrase "easily verified" rather than written out; given Proposition B.1 the computation is indeed routine, so this is classified as AMBIGUOUS rather than GAP. The accompanying computational procedure for mixed equilibria is descriptively correct.

### 3.4 Lemmas

All ten lemmas verify. Main-text Lemmas 1 and 2 characterize the support and atom structure of equilibrium score CDFs: Lemma 1's proof is a one-line pointer to Proposition B.1, which correctly yields the claimed structure. Lemma 2 states that in any pure-strategy equilibrium the developer with the lower monopoly score is inactive and the other crafts her monopoly policy. The proof has a labeling artifact — the appendix prints it under the header "Lemma 1" (two consecutive paragraphs are labeled "Lemma 1" in the appendix; the first is in fact Lemma 2's proof, while the actual Lemma 1 proof is the one-line pointer that follows). The content of the proof is correct. One sub-step of Lemma 2 asserts *strict* preference where the paper's weak assumption $|x_{-k}| \geq |x_{V,-k}|$ only delivers *weak* preference; in the edge case $|x_{-k}| = |x_{V,-k}|$ the argument nevertheless goes through because the strict-inequality gap from a different sub-step dominates.

Appendix Lemmas A.1 through A.6 comprise the analytical foundation: A.1 (veto-proofness doesn't restrict best responses), A.2 (ideological optimality at a given score), A.3 (no ties at $s > s_0$), A.4 (right-continuity of $\bar{\Pi}^*_i$), A.5 (score optimality implies all support points attain the max), and A.6 (ideological optimality plus no-ties plus score-optimality suffice for equilibrium). Each proof reduces to a clean KKT or mass-reallocation argument and verifies symbolically where algebra is involved. Appendix Lemmas B.1 and B.2 handle the key support-transition properties: B.1 restricts ideology at score $s_i > s_0$ to beat $y_0$ in loss, and B.2 shows that an isolated support point must sit at the boundary $y_i^*(s) = z_i(s)$ and must be the lowest support point. B.1 contains a strict-vs-weak imprecision at the boundary $y_0 = x_{V,i}$ (where the "strictly negative" claim is actually "weakly negative, strict in the interior"), but the boundary case is non-generic and the lemma's substantive conclusion holds.

Aggregate across all ten lemmas: 45 PASS, 2 AMBIGUOUS, 0 FAIL. Two minor concerns (Lemma 2's strict/weak slip, Lemma B.1's edge-case imprecision) and one labeling typo in the appendix. No gap invalidates any downstream claim.

## 4. Substantive replication via blind rebuild

### 4.1 Protocol

A formal replication that verifies a paper's algebra step by step is complete on its own terms but answers a narrow question: *is the proof internally correct?* A separate question — *is the model itself the right tool for the question?* — is inaccessible to that kind of verification because any step-by-step reader is already anchored on the paper's own specification. To address that second question I ran a zero-context blind rebuild. A separate modeler received a curated briefing containing the paper's abstract and its motivational introduction up through the tension-framing, and was instructed to independently formalize the question and produce a candidate model with candidate results. All passages naming the paper's specific framework, citing the authors' prior work, or previewing propositions were redacted. The modeler was told to flag their own discretionary choices and to list plausible alternatives rejected.

The discipline matters for two reasons. It creates an outside perspective against which to measure how many of the paper's modeling choices are *forced* by the question versus *discretionary* among several natural options. And it surfaces scope conditions that may be load-bearing without being highlighted — exactly the kind of caveat that becomes invisible to a reader who has already been told which version of the problem to solve. The convergence and divergence of the blind rebuild with the paper's actual model is then the empirical object that the remainder of this section documents.

### 4.2 The independent rebuild

The blind rebuild produced a four-strategic-player game (plus an ignored fifth role reserved for a simple median/agenda-setter) with one centrist decisionmaker $M$ at 0, two opposed developers $L$ at $-\theta_L$ and $R$ at $+\theta_R$, and two symmetric veto pivots at $-\nu$ and $+\nu$. A developer's choice is (develop/not, ideology $p_D$, quality $q_D$), with linear development cost $k q_D$, $k > 1$. The status quo is fixed at $\sigma = (0, 0)$ — at the median's ideal point, with zero quality. All players' utilities are quadratic-plus-additive-valence, $u_i(p, q) = -(p - \mu_i)^2 + q$. Equilibrium concept: pure-strategy SPE with sincere VP voting.

The rebuild's predictions cover three regimes in veto extremism. Writing $\kappa \equiv k - 1 > 0$, when $\nu \leq \theta_{\min}/\kappa$ both developers develop (competitive regime); when $\theta_{\min}/\kappa < \nu \leq \theta_{\max}/\kappa$ only the more-extreme developer develops (asymmetric regime); when $\nu > \theta_{\max}/\kappa$ neither develops (gridlock). Within the development region, the selected proposal moderates and gains quality as $\nu$ rises: the ideology comes closer to zero at rate $\kappa/(1+\kappa)$, and the quality rises by the envelope of the VP indifference condition. Centrist welfare is strictly hump-shaped in $\nu$ with an interior maximum at $\nu^* = \theta_{\max}/(2\kappa)$ and peak value $U_M(\nu^*) = \theta_{\max}^2 / [2\kappa(1+\kappa)] > 0$. The rebuild also derives a version of the "visible competition is an unreliable signal" puzzle via the discontinuity at $\nu = \theta_{\min}/\kappa$: moving from competitive to asymmetric does not lower DM welfare since DM was only using the more-motivated developer's proposal anyway.

The rebuild's self-assessment flags its linear-cost choice as its biggest discretionary commitment (quadratic cost would give a cubic FOC) and notes uncertainty about whether the paper uses symmetric or asymmetric VPs and whether gridlock emerges from participation constraints or a separate mechanism.

### 4.3 Convergence and divergence

The paper and the rebuild converge on the game's basic architecture. Both have four strategic players in the same roles (a centrist, two opposed developers, two veto pivots), a three-stage develop–propose–veto timing, quadratic spatial utility, additive-public-valence quality, sincere VP voting, and subgame-perfect equilibrium as the solution concept. Both deliver the three-regime typology — competitive / asymmetric / gridlock — as a comparative static in VP extremism. Both deliver a strictly positive optimum veto distance for the centrist.

The divergences are substantive in four places. First, **quality cost**: the rebuild uses linear $kq$ with $k > 1$; the paper uses linear-in-$q$ developer cost $\alpha_i q$ with $\alpha_i > 2$, which in score coordinates ($q = s + y^2$) becomes strictly convex in ideology. The $\kappa = k-1$ in the rebuild plays the same algebraic role as $\alpha - 1$ in the paper; the closed-form monopoly ideologies are isomorphic up to renaming. This is a formal-structural difference with small substantive consequences.

Second, **status quo**: the rebuild fixes $y_0 = 0$ (status quo at DM's ideal); the paper parameterizes over $y_0 \in [x_{VL}, x_{VR}]$. This is the rebuild's single most consequential departure; Section 4.4 discusses it in detail.

Third, **mixed strategies**: the rebuild restricts to pure-strategy SPE and derives three regimes entirely from participation margins. The paper *requires* mixed strategies in the competitive region — Lemma 1, Lemma 2, Proposition B.1, Proposition C.1, and Proposition C.3 collectively characterize a mixed-strategy equilibrium in which developers randomize over scores with atoms at $s_0$ and at $\bar{s}$. The paper's FOSD ranking of developer activity (Proposition 2 Part 3), the "continuous probability that the less-motivated developer is active" result (Proposition 3 Part 1c), and the quantitative DM-welfare calculation in the competitive mixed case all depend on mixing. A pure-strategies-only reader would reconstruct the typology but miss a substantial part of the paper's architecture.

Fourth, **mechanism for asymmetry**: the rebuild generates asymmetric regimes via $\theta_L \neq \theta_R$ (asymmetric developer extremism), treating the more-motivated developer as definitionally the more-ideologically-extreme one. The paper generates asymmetry via $|y_0| > 0$, treating the more-motivated developer as the one whom the status quo disadvantages. These are inequivalent framings of the question: the paper reads "pivots polarize *and* the status quo drifts," while the rebuild reads "pivots polarize, period." For the paper's U.S. Senate narrative — in which the filibuster pivots have polarized but the relevant status quo has also shifted — the paper's framing is more natural. For a pure-institutional-design question the rebuild's is at least as defensible.

Aggregate convergence: MEDIUM. The rebuild recovers the player skeleton, the VP mechanism, the public-valence quality channel, the three-regime typology, and the hump-shape on centrist welfare, all from the abstract alone. It does not recover convexity in ideology, parameterization over $y_0$, mixed-strategy equilibria in the competitive region, or the quantitative thresholds ($\tilde{\alpha} \approx 3.68$, FOSD, activity-probability) that depend on those features.

### 4.4 Key substantive finding

The paper's single most consequential discretionary choice is the decision to parameterize over $y_0$ rather than fix the status quo at DM's ideal. Fixing $y_0 = 0$ is a natural modeling instinct — it is what the blind rebuild did without hesitation, and it is the specification studied in Proposition C.1. Under that specification, Proposition C.2 proves that DM's equilibrium payoff with VPs is *strictly* first-order-stochastically-dominated by her equilibrium payoff without VPs. VPs are unambiguously harmful.

The paper's Proposition 4 goes the other way. It asserts that DM prefers to eliminate VPs only when they or the status quo are sufficiently moderate, and otherwise prefers to keep them. The mechanism that flips the sign between Proposition C.2 and Proposition 4 is exactly the non-zero status quo. When $y_0 \neq 0$, the status quo disadvantages one developer more than the other; that developer becomes strongly motivated to craft a moderate, high-quality proposal to displace $b_0$; and VPs can raise DM's welfare by forcing this motivated developer to concede further on ideology. Corollary 1 makes this precise: the monopoly score $s_i^{M*}$ is strictly increasing in $|y_0|$. At $y_0 = 0$ the channel simply is not open.

The blind rebuild, fixing $y_0 = 0$, would have landed squarely in the Proposition C.1/C.2 regime where VPs are strictly harmful — the opposite sign from the paper's headline. The rebuild did generate a positive-optimum centrist welfare because its mechanism runs through a different channel (linear cost plus additive valence creates a rent that the veto constraint forces developers to share with DM), but the rebuild's hump-shape is not the paper's hump-shape and does not carry the same interpretation.

This scope condition is not prominent in the paper's abstract. The abstract says "some effects are surprisingly positive; somewhat-extreme veto players can induce policy developers who dislike the status quo to craft moderate, high-quality proposals." The phrase "developers who dislike the status quo" is the scope condition, but it is phrased as a motivational observation rather than as a formal prerequisite. A reader encountering the abstract and drawing the natural inference that VPs can benefit centrists generically — without registering that the claim is conditional on an asymmetric status quo — draws a conclusion the paper does not support. The asymmetric-status-quo scope condition is the biggest caveat on the paper's substantive reach.

## 5. Validity and robustness assessment

On validity: the paper's modeling choices are a mix of necessary and discretionary moves, and none of the discretionary ones raise substantive concerns. Necessary choices include the two-developer structure (the abstract explicitly invokes competition on both sides of the ideological spectrum), the VP acceptance mechanism (required by the filibuster-pivot application), and quality as a public valence good (the paper's explicit theoretical commitment, inherited from Hirsch–Shotts 2015 and consistent with Hitt–Volden–Wiseman 2017). The score reparameterization $s = q - y^2$ is algebraic convenience equivalent to taking DM's payoff as the numeraire. Discretionary but defensible choices include the convex-via-$\alpha > 2$ cost (the blind rebuild's linear-$k > 1$ cost generates the same monopoly ideology formula), the allowance of asymmetric VPs (though the headline propositions specialize to the symmetric case), and the parameterization over $y_0$. The blind rebuild's independent convergence on the player structure, the VP mechanism, the public-valence quality, and the three-regime typology from the abstract alone suggests the paper's specific choices sit inside a family of near-equivalent formalizations that all deliver the same qualitative story. Validity concern level: LOW.

On robustness: the paper's main qualitative claims transfer to a much wider family of models than its own. The three-regime typology survives the rebuild's alternative specification in qualitatively identical form, though via a different mechanism: in the rebuild, gridlock is driven by symmetric participation failure when $\theta_i \leq \kappa\nu$ on both sides; in the paper, it is driven by the status-quo position relative to the monopoly-ideology thresholds $\hat{y}_L, \hat{y}_R$. The hump-shape of centrist welfare in veto extremism survives — the rebuild derived $U_M(\nu^*) = \theta_{\max}^2/[2\kappa(1+\kappa)]$ analytically, which is the direct analog of the paper's score-based DM utility in the one-developer-active case. Proposition 1 (the monopolist ideology as a convex combination of developer and opposite-side VP) survives universally; it is a KKT artifact, independent of whether cost is $\alpha q$ or $k q$. The "visible competition is an unreliable signal" puzzle survives qualitatively.

Three things do not survive the rebuild's specification. The mixed-strategy competitive equilibrium (Lemmas 1 and 2, Proposition B.1, Propositions C.1 and C.3) is gone, which removes the paper's FOSD ranking of developer activity and the quantitative DM-welfare comparison when both developers are active. Proposition C.2's strict-harm result at $y_0 = 0$ is gone — the rebuild, by fixing $y_0 = 0$, lands in that regime but generates a hump-shape rather than strict harm, because the rebuild's linear-cost machinery opens a rent-sharing channel that the paper's convex-cost machinery does not. And the $\tilde{\alpha} \approx 3.68$ threshold, which says "for sufficiently costly quality even extreme VPs hurt DM," depends on the competitive-regime utility calculation and has no counterpart in the rebuild. Robustness assessment: PARTIALLY ROBUST. The paper's main qualitative claims — three regimes, hump-shaped DM welfare, visible competition is not institutional health — transfer to a family of nearby models; the quantitative refinements (FOSD ranking, $\tilde{\alpha}$ threshold, continuous activity probability, strict harm at $y_0 = 0$) are tied to the specific convex-cost-plus-mixed-strategies apparatus and would need re-derivation under alternative functional forms.

The status-quo scope condition from Section 4.4 is the biggest caveat on the paper's substantive reach. The paper's framework delivers the headline "VPs can benefit centrists" result when $y_0 \neq 0$ and delivers the opposite result (VPs strictly harm centrists) when $y_0 = 0$. Both results are formally correct within the paper's framework, and the switch runs entirely through whether the status quo is centered. The rebuild's instinct to fix $y_0 = 0$ — which would be the natural choice for any reader formalizing the question from scratch — lands in the wrong regime for the paper's headline. The scope condition is a feature, not a bug: it is what makes the paper substantively interesting. It is also what the abstract should make explicit.

## 6. Verdict

The paper is fully verified, with two identified formal gaps that do not invalidate any substantive conclusion. Proposition 3's Part 1b case (ii) argument contains an algebraic slip: the convexity step asserts $\tilde{G}(y_0; x_V = x_E, x_E) \leq 0$ always, but this is false for $\alpha \geq 5$ (counterexample at $\alpha = 5$, $x_E = 1$, $y_0 = 0.6$ gives $\tilde{G} = +0.8 > 0$). A feasibility argument not stated in the paper — the candidate entry ideology $x_E/\alpha$ is infeasible at L's monopoly score when $x_V > 2 x_E/(\alpha-1)$, forcing R to copy L's policy at positive cost — preserves the conclusion via a distinct route. An editorial fix would restrict the convexity step to $x_V \leq 2 x_E/(\alpha-1)$ and handle the complementary regime separately. Proposition C.1's displayed closed-form DM utility is algebraically incorrect: at $x_V = 1$, $x_E = 2$, $\alpha = 2.1$ the paper's formula gives $\approx 0.206$ while direct numerical integration of C.1's own integrand gives $\approx 0.540$. The error is isolated: all intermediate ingredients (boundary conditions, $\hat{s}(F)$, $\tilde{s}(F)$, the ODE) are correct, and Proposition C.2 and Proposition 4 cite only the integrand / $\hat{s}$ / $\tilde{s}$ rather than the erroneous closed form, so the mistake does not propagate. A minor sign typo in Proposition 1 step 3a is harmless.

The substantive verdict: the paper is partially robust to the blind rebuild's alternative modeling choices. Qualitative claims (three-regime typology, hump-shape on centrist welfare, unreliability of visible competition) are robust across the rebuild's linear-cost, pure-strategy, symmetric-status-quo specification. Quantitative refinements (FOSD ranking, $\tilde{\alpha} \approx 3.68$, strict harm at $y_0 = 0$) are tied to the paper's specific machinery. The headline "VPs can benefit centrists" result has a scope condition — $y_0 \neq 0$ — that is not prominent in the abstract.

## 7. Scope and limitations

This replication worked from the May 5, 2025 post-R&R combined PDF (main paper plus supporting information), which predates the 2026 AJPS publication by approximately eleven months. Minor editorial changes between this version and the published version are possible; the sign typo in Proposition 1 step 3a and the label typo on Lemma 2's proof may have been corrected in production. The Proposition C.1 closed-form error and the Proposition 3 Part 1b case (ii) gap are substantive enough that the published version can be checked against this report if needed.

All algebraic verification was performed with sympy 1.14.0 through `.venv/bin/python`. Symbolic checks were preferred over numerical ones where possible; numerical checks were used for integrals and for the $\tilde{\alpha}$ threshold. Two explicitly computational sub-claims — Proposition 3 Part 1c (monotonicity of the less-motivated developer's active probability within the mixed-strategy region) and Proposition 4's DM-utility calculation in the both-developers-active mixed case — were not re-run. The paper itself describes these as numerical evaluations of Proposition C.3's equilibrium procedure, and re-running them would require re-implementing that procedure rather than verifying algebra. They are flagged rather than claimed verified.

The blind rebuild was discipline-enforced via file-access constraints that prevented the rebuilding modeler from seeing the paper text. The briefing was hand-curated to include the abstract and motivational introduction while redacting model specifications, proposition statements, and prior-work citations. The convergence analysis treats the rebuild as one draw from the distribution of natural formalizations of the abstract; a single rebuild is not a systematic exploration of that distribution, and different blind modelers working from the same briefing could have produced qualitatively different models. The rebuild's divergences from the paper — linear vs. convex cost, symmetric vs. parameterized status quo, pure vs. mixed strategies — should be read as *existence* claims about alternative specifications rather than as exhaustive characterizations of them.

## Appendix A — Proof walkthroughs: main-text propositions and corollaries

This appendix presents, for each formal object of Hirsch and Shotts (2026), a step-by-step walkthrough of the proof as given in the paper's Appendices A and D, together with the verdict from Section 3. The walkthroughs serve a skeptical reader who wishes to see where each step passes, where each step is only weakly justified, and where the two identified gaps sit. Notation follows the main text: score $s = q - y^2$, status-quo score $s_0 = -y_0^2$, opposite-side VP boundary $z_i(s) = y_0 - (s - s_0)/(2 x_{V,-i})$, cost parameter $\alpha_i > 2$, symmetric specialization $x_{VL} = -x_V$, $x_{VR} = x_V$, $x_L = -x_E$, $x_R = x_E$.

### A.1 Proposition 1 (monopolist)

*Statement.* When developer $i$ is a monopolist, she crafts policy $(s_i^{M*}, y_i^{M*})$ with $y_i^{M*} = \max\{y_0, \hat{y}_R\}$ for $i = R$ and $y_i^{M*} = \min\{y_0, \hat{y}_L\}$ for $i = L$, and $z_i(s_i^{M*}) = y_i^{M*}$. A monopolist invests iff $|y_0 - x_i| > |\hat{y}_i - x_i|$, where $\hat{y}_R = x_R/\alpha_R + (1 - 1/\alpha_R)\,x_{VL}$ and $\hat{y}_L = x_L/\alpha_L + (1 - 1/\alpha_L)\,x_{VR}$.

*Proof structure.* The proof reduces the three-stage game to a direct-choice problem, identifies the binding VP constraint, substitutes it into the payoff, and differentiates. The proof invokes no lemmas — only Definition A.1 and basic calculus.

**Steps 0a–0c (reduction, payoff, WLOG).** $(s_0, y_0)$ is the unique free veto-proof policy; DM (at $x_D = 0$, so $V_D = s$) optimally proposes the developer's policy if veto-proof and $(s_0, y_0)$ otherwise, so the developer can be treated as a direct proposer restricted to veto-proof policies. Expanding $-\alpha_i(s + y^2) + V_i(s, y)$ and dropping the constant $-x_i^2$ gives equation A.1: $-(\alpha_i - 1) s + 2 x_i y - \alpha_i y^2$. The problem reduces to $i = R$ by the model's $L \leftrightarrow R$ symmetry. All **PASS.**

**Steps 1–2 (ideology bound and left-VP binding).** Since $y_0 \leq x_{VR} \leq x_R$, $V_R(s, y)$ is strictly increasing in $y$ for fixed $s$, so $y_R < y_0$ is dominated by $(s_0, y_0)$. For $y_R \geq y_0$, only the left-VP constraint can bind. The score effect $-(\alpha_R - 1) s$ is strictly decreasing in $s$ (since $\alpha_R > 1$), so the developer wants the smallest veto-proof score at fixed $y_R$, i.e., $y_R = z_R(s_R)$. **PASS.**

**Step 3a (substitution — minor typo).** Inverting $y_R = z_R(s_R) = y_0 - (s_R - s_0)/(2 x_{VL})$ gives $s_R = 2 x_{VL}(y_0 - y_R) + s_0$. The paper writes $s_R = 2 x_{VL}(y_0 - y_R) - s_0$, a sign flip on the $s_0$ term. Under the correct sign, substitution into A.1 yields

$$-(\alpha_R - 1)\bigl[2 x_{VL}(y_0 - y_R) + s_0\bigr] + 2 x_R y_R - \alpha_R y_R^2.$$

Because $s_0$ is a constant with respect to $y_R$, it vanishes at Step 3b regardless of its sign, so the typo does not affect the FOC. **AMBIGUOUS (typographical).**

**Step 3b (FOC).** Differentiating in $y_R$ yields $2 x_{VL}(\alpha_R - 1) + 2 x_R - 2 \alpha_R y_R$. Setting this to zero and solving gives $\hat{y}_R = x_R/\alpha_R + (1 - 1/\alpha_R) x_{VL}$. Second derivative $-2 \alpha_R < 0$ establishes strict concavity, so $\hat{y}_R$ is the unique global maximizer on $\mathbb{R}$. **PASS** (sympy-confirmed).

**Steps 4–5 (feasibility, Proposition form).** If $y_0 \leq \hat{y}_R$, $\hat{y}_R$ lies in $[y_0, \infty)$ and DEV plays there with $s_R^{M*} > s_0 \iff y_0 < \hat{y}_R$ (using $x_{VL} < 0$). If $\hat{y}_R < y_0$, strict concavity makes the objective strictly decreasing on $[y_0, \infty)$, so the constrained optimum is $y_R = y_0$ (sit out). Combining: $y_R^{M*} = \max\{y_0, \hat{y}_R\}$. Since $y_0 \leq x_R$ and $\hat{y}_R < x_R$, the equivalence $y_0 < \hat{y}_R \iff |y_0 - x_R| > |\hat{y}_R - x_R|$ holds, matching the Proposition's form. **PASS.**

**Step 6 (mirror for $i = L$).** Relabeling $x_R \leftrightarrow x_L$, $x_{VL} \leftrightarrow x_{VR}$ with the right VP binding instead yields $\hat{y}_L = x_L/\alpha_L + (1 - 1/\alpha_L)\,x_{VR}$ and the symmetric invest-iff condition. **PASS.**

**Verdict: VERIFIED** (Step 3a contains a harmless sign typo on the constant $s_0$).

### A.2 Proposition 2 (three-regime typology)

*Statement.* In the symmetric specialization, equilibria partition $(x_V, y_0)$-space into (1) gridlock: $x_V \geq \bar{x}_V = x_E/(\alpha-1)$ and $y_0 \in [\hat{y}_R(x_V), \hat{y}_L(x_V)]$, both DEVs inactive; (2) asymmetric pure: $y_0 \notin [-\bar{y}(x_V), \bar{y}(x_V)]$, the less-motivated DEV inactive; (3) mixed: $y_0 \in [-\bar{y}(x_V), \bar{y}(x_V)]$. Additionally (2a) the more-motivated DEV is always active; and (3) the more-motivated DEV's score CDF first-order stochastically dominates.

*Proof structure.* Part 1 applies Proposition 1's invest condition to each developer independently. Part 2 case-splits on the geometry of R's best veto-proof entry at L's monopoly score; the two cases produce cutoffs $\check{y}(x_V)$ and $\tilde{y}(x_V)$ that define the closed interval $[-\bar{y}(x_V), \bar{y}(x_V)]$. Parts 2a, 2c, and 3 import from Proposition C.3.

**Step 1 (gridlock cutoffs).** Under Proposition 1, L is alone-inactive iff $y_0 \leq \hat{y}_L$ and R alone-inactive iff $y_0 \geq \hat{y}_R$. Both inactive requires $\hat{y}_R \leq y_0 \leq \hat{y}_L$, feasible only if $\hat{y}_R \leq \hat{y}_L$. Symbolic computation of $\hat{y}_L - \hat{y}_R = 2[x_V(\alpha-1) - x_E]/\alpha$ shows this holds iff $x_V \geq x_E/(\alpha - 1) = \bar{x}_V$. **PASS.**

**Step 2 (asymmetric pure, case (i)).** Assume $y_0 > 0$ (so L is more motivated). By Lemma 2, the pure equilibrium has L at her monopoly policy; R's decision is whether to enter. Lemma A.2 gives R's best score-$s_L^{M*}$ ideology as $\min\{\max\{z_L(s_L^{M*}), x_E/\alpha\}, z_R(s_L^{M*})\}$. Case (i), $y_0 \leq (\alpha-1) x_V/(2\alpha)$, places the $z_R(s_L^{M*})$ branch as optimal. The net benefit factors as $(y_0 - y_L^{M*})(4 x_E - \alpha(2 x_V + 3 y_0 - y_L^{M*}))$; the non-trivial zero is $\check{y}(x_V) = x_E/\alpha - x_V(\alpha+1)/(3\alpha)$. **PASS** (sympy-confirmed factorization).

**Step 3 (asymmetric pure, case (ii)).** Case (ii), $y_0 \geq (\alpha-1) x_V/(2\alpha)$, places the unconstrained $x_E/\alpha$ as the optimum. The net benefit is

$$\tilde{G}(y_0; x_V, x_E) = \alpha y_0^2 - 2\alpha x_V y_0 + 3 x_E^2/\alpha - 4 x_V x_E + 2 x_E x_V/\alpha + 2 x_V^2 \alpha (1 - 1/\alpha).$$

The smaller root in $y_0$ defines $\tilde{y}(x_V)$. **PASS.**

**Step 4 (continuity at the case boundary).** At $y_0 = (\alpha-1) x_V/(2\alpha)$, sympy confirms $\check{y}(x_V) = \tilde{y}(x_V) = 3 x_E(\alpha-1)/[\alpha(5\alpha-1)]$. $\bar{y}$ is continuous across the boundary. **PASS.**

**Step 5 (Parts 2a, 2c, 3).** These import directly from Proposition C.3: Part 2a is C.3's "more-motivated DEV always active" bullet; Part 2c is the contrapositive of Part 2b combined with C.3's asymmetric-mixed characterization; Part 3 is C.3's FOSD bullet. **PASS** conditional on C.3.

The edge case $y_0 = 0$ is explicitly excluded from Part 2 and handled separately in Proposition C.1; this exclusion is clean in the statement of the proposition.

**Verdict: VERIFIED.**

### A.3 Proposition 3 (comparative statics in $x_V$)

*Statement.* (1) The less-motivated developer's active probability is strictly decreasing in $x_V$ except in pure strategies, where it is constant at zero. (2) The more-motivated developer is active iff $x_V < (\alpha |y_0| + x_E)/(\alpha - 1)$.

*Proof structure.* Part 1 is decomposed into (1a) pure-equilibrium active probability is definitionally zero; (1b) the pure-equilibrium region is upward-closed in $x_V$; (1c) within the mixed region the active probability is monotone — this is explicitly computational. Part 2 is a direct restatement of Proposition 1's invest condition.

**Step 1 (Claim 1a).** Definitional: in pure equilibria the less-motivated developer is inactive. **PASS.**

**Step 2 (Claim 1b, gridlock).** The threshold $y_L^{M*} > y_0$ iff $x_V > (\alpha y_0 + x_E)/(\alpha - 1)$ is monotone increasing in $x_V$. **PASS.**

**Step 3 (Claim 1b, case (i)).** Pure equilibrium in case (i) requires $y_0 > \check{y}(x_V)$, i.e., $x_V > (3 \alpha / (\alpha+1))(x_E/\alpha - y_0)$. The cutoff increases in $x_V$; if the condition holds at $\tilde{x}_V$, it holds for all $x_V > \tilde{x}_V$. **PASS.**

**Step 4 (Claim 1b, case (ii) — GAP).** Pure equilibrium in case (ii) requires $\tilde{G}(y_0; x_V, x_E) \leq 0$. The paper argues (i) $\tilde{G}$ is strictly convex in $x_V$, and (ii) $\tilde{G}(y_0; x_V = x_E, x_E) \leq 0$ always, so convexity closes the monotonicity argument.

Claim (ii) is algebraically false. Sympy reduces $\tilde{G}(y_0; x_E, x_E)$ to a quadratic in $y_0$ with discriminant $-x_E^2(\alpha-1)(\alpha-5)$; for $\alpha > 5$ the discriminant is negative, but the leading coefficient (which is $\alpha > 0$) is positive, so the quadratic in $y_0$ is strictly positive. A concrete counterexample: at $\alpha = 5$, $x_E = 1$, $y_0 = 0.6$ one computes $\tilde{G}(0.6; 1, 1) = +0.8 > 0$. The convexity step does not close.

*Feasibility workaround.* Formula A.10, from which $\tilde{G}$ is derived, assumes $x_E/\alpha$ is veto-proof at L's monopoly score, i.e., $x_E/\alpha \geq z_L(s_L^{M*})$, which rearranges to $x_V \leq 2 x_E/(\alpha - 1)$. Outside this regime, R's best veto-proof entry at $s_L^{M*}$ coincides with L's own policy $y_L^{M*} = z_L(s_L^{M*})$, so R would pay $\alpha_R (s_L^{M*} + (y_L^{M*})^2) > 0$ for the same outcome as sitting out — strictly negative net benefit. In the counterexample regime $(2 x_E/(\alpha - 1) = 0.5 < x_V = 1)$, A.10 is the wrong net-benefit and the feasibility argument applies. Case-splitting at $x_V = 2 x_E/(\alpha - 1)$ — convexity below, feasibility above — recovers Claim 1b. The paper's statement is correct; only the proof of case (ii) conflates these regimes. **GAP in proof, conclusion preserved.**

**Step 5 (Claim 1c).** The paper states that within the mixed region, the less-motivated developer's active probability is strictly decreasing in $x_V$, and attributes this to computational analysis of the equilibrium in Proposition C.3. This is not independently re-run.

**Step 6 (Part 2).** For $y_0 > 0$, L is active iff $y_0 > y_L^{M*} = -x_E/\alpha + x_V(\alpha - 1)/\alpha$, which rearranges to $x_V < (\alpha y_0 + x_E)/(\alpha - 1)$. For $y_0 < 0$, symmetry gives the same condition in $|y_0|$. **PASS.**

**Verdict: VERIFIED with GAP at Step 4** — the convexity-argument claim $\tilde{G}(y_0; x_E, x_E) \leq 0$ is false for $\alpha \geq 5$; a feasibility argument not stated in the paper restores the conclusion, and Claim 1c is computational.

### A.4 Proposition 4 (centrist welfare)

*Statement.* DM prefers to eliminate the VPs iff either the VPs or the status quo are sufficiently moderate.

*Proof structure.* The proof combines four analytical components — the no-VP baseline $\text{EU}^0_D$ from Corollary 2; the strict-harm result at $y_0 = 0$ from Proposition C.2; the trivial no-activity case; and Corollary 1's monotonicity for the one-active-developer case — plus one computational component for the both-active mixed case. An additional numerical sub-claim pins down the threshold $\tilde{\alpha} \approx 3.68$.

**Step 1 (baseline).** $\text{EU}^0_D = 4 x_E^2 \bigl(\alpha + 1/2 - 2/(3\alpha) - (\alpha^2 - 1) \ln(\alpha/(\alpha-1))\bigr)$ from Corollary 2. Sympy numerically confirms $\text{EU}^0_D > 0$ for $\alpha > 2$ (e.g., 0.136 at $\alpha = 3$, 0.072 at $\alpha = 4$). **PASS.**

**Step 2 ($y_0 = 0$ case).** Proposition C.2 proves that DM's VP payoff is strictly FOSD-dominated by the no-VP payoff when $y_0 = 0$. DM therefore strictly prefers to eliminate VPs in this regime. **PASS** conditional on C.2.

**Step 3 (no-activity case).** When neither developer is active, DM's payoff is $s_0 = -y_0^2 \leq 0 < \text{EU}^0_D$. DM strictly prefers to eliminate VPs. **PASS.**

**Step 4 (one-active-developer case).** By Corollary 1, $s_i^{M*}$ is strictly monotone in $|y_0|$, so there is a threshold $|y_0|^*$ above which $s_i^{M*} \geq \text{EU}^0_D$ and DM prefers to maintain VPs. Below it, DM prefers to eliminate them. **PASS.**

**Step 5 (both-active mixed case).** DM utility is computed by numerical evaluation of the mixed equilibrium characterized in Proposition C.3. The paper explicitly flags this as computational. This sub-claim is not independently re-run in this replication.

**Step 6 ($\tilde{\alpha} \approx 3.68$ threshold).** At $x_V = x_E$ and $y_0 = -x_E$, the equilibrium is pure with R the sole active developer. Proposition 1 gives $y_R^{M*} = x_E(2 - \alpha)/\alpha$ and $s_R^{M*} = x_E^2 (4/\alpha - 1)$; both forms sympy-confirmed. Setting $s_R^{M*} = \text{EU}^0_D$ and solving numerically gives $\tilde{\alpha} \approx 3.68004$, matching the paper's claim. Numerical cross-check at adjacent values (α = 3.0: +0.197; α = 3.68: +0.000172; α = 3.75: −0.017; α = 4.0: −0.072) confirms the sign pattern. **PASS.**

**Verdict: VERIFIED** (Step 5 flagged as computational and not re-run).

### A.5 Corollary 1 (monopoly score monotone in $y_0$)

*Statement.* At any status quo where development occurs, $s_i^{M*}$ is strictly increasing in $y_0$ for $i = L$ and strictly decreasing in $y_0$ for $i = R$.

*Proof structure.* The corollary has no block-formatted proof in Appendix D; the derivation is in-line in the main text, directly from Proposition 1's closed forms.

**Step 1.** From Proposition 1, $\hat{y}_L$ is constant in $y_0$, and the binding VP constraint gives $\hat{y}_L = z_L(s_L^{M*}) = y_0 - (s_L^{M*} - s_0)/(2 x_{VR})$. Solving for $s_L^{M*}$ and substituting $s_0 = -y_0^2$ gives $s_L^{M*} = -y_0^2 + 2 x_{VR}(y_0 - \hat{y}_L)$. **PASS.**

**Step 2.** Differentiating: $ds_L^{M*}/dy_0 = -2 y_0 + 2 x_{VR} = 2(x_{VR} - y_0) \geq 0$, strict for $y_0 < x_{VR}$. Under the corollary's hypothesis $s_0 < s_L^{M*}$, the boundary case $y_0 = x_{VR}$ is ruled out. **PASS** (sympy-confirmed).

**Step 3.** By symmetry, $s_R^{M*} = -y_0^2 + 2 x_{VL}(y_0 - \hat{y}_R)$ and $ds_R^{M*}/dy_0 = 2(x_{VL} - y_0) < 0$ for $y_0 > x_{VL}$. **PASS.**

**Verdict: VERIFIED.**

### A.6 Corollary 2 (closed-form no-VP DM utility)

*Statement.* Absent VPs, $\text{EU}^0_D = 4 x_E^2 \bigl(\alpha + 1/2 - 2/(3\alpha) - (\alpha^2 - 1) \ln(\alpha/(\alpha-1))\bigr)$.

*Proof structure.* Appendix D's proof is a one-line citation to Equation 3 and Footnote 4 of Hirsch and Shotts (2015). The replication re-verifies only the integral-to-closed-form step, not the integral-derivation step (which is external).

**Step 1 (external dependency).** The mixed-equilibrium CDF for the no-VP benchmark is taken from Hirsch and Shotts (2015), Eq. 3 and Footnote 4. This external derivation is not re-verified.

**Step 2 (integral-to-closed-form).** Symbolic and numerical evaluation of $\int_0^1 2 F \bigl[\int_0^F G/(\alpha(\alpha - G))\, dG\bigr]\, dF$ (via sympy + scipy.quad) at $\alpha \in \{3.0, 3.68, 4.0\}$ agrees with the stated closed form within floating-point precision. The closed form is strictly positive for $\alpha > 2$. **PASS.**

**Verdict: VERIFIED**, with the external integral-derivation step taken as given from Hirsch and Shotts (2015).

## Appendix B — Proof walkthroughs: appendix propositions

### B.1 Proposition B.1 (score-CDF equilibrium conditions)

*Statement.* A profile $(F_L, F_R)$ of score CDFs satisfies score optimality iff it falls into one of four conditional regimes, keyed on the order of $s_0$, $\underline{s}$, and $\bar{s}$ and on the mixing structure. The four conditions (1)–(4) of Proposition B.1 give necessary-and-sufficient conditions in each regime.

*Proof structure.* The proof is the workhorse of the appendix and draws on Lemmas A.3, A.4, A.5, A.6, B.2. Necessity is established in seven sub-steps (one per condition plus structural observations); sufficiency in four sub-steps.

**Necessity steps (1–7).** If $s_0 = \underline{s} = \bar{s}$ (both inactive), the right-derivative of $\bar{\Pi}_i^*$ at $s_0$ with $F_{-i}(s_0) = 1$ is $-(\alpha_i - 1) + \max\{D_i(s_0; 1), 0\} \leq 0$, giving Condition (1). If $s_0 < \underline{s} = \bar{s}$ (asymmetric pure), Lemma A.3 plus B.2 force at most one DEV at $\underline{s}$, the other at $s_0$, with $F_{-k}(\underline{s}) > 0$ and $y_{-k}^* = z_{-k}$; the balance of left- and right-derivatives at $\underline{s}$ gives $\alpha_{-k} - F_k(\underline{s}) = D_{-k}(\underline{s}; F_k(\underline{s}))$ (first bullet of Condition 2), while score optimality for k at $s_0$ vs $\underline{s}$ gives the two equivalent forms of Condition 2's second bullet (via A.3 direct and A.5 integrated). In the mixing region $[\underline{s}, \bar{s}]$, B.2 gives support convexity, A.3 forces joint participation, and A.5 makes $\bar{\Pi}_i^*$ constant; differentiating equation A.4 and setting zero yields Condition (3)'s ODE. In mixed-asymmetric ($s_0 < \underline{s} < \bar{s}$), the k-at-$s_0$-and-$\underline{s}$ equality from A.5 combined with Condition 2 pins down Condition (4). All **PASS.**

**Sufficiency steps (8–11).** Pure or ODE-based mixing gives constant $\bar{\Pi}_i^*$ across support; scores above $\bar{s}$ are unprofitable by equation A.6 with $D_i$ decreasing in $s$; the middle case ($s_0 < \underline{s} = \bar{s}$) rules out $s_i > \bar{s}$ via Condition 2's second bullet plus $D_k$ decreasing; and scores in $[s_0, \underline{s}]$ outside support are unprofitable by the construction of Condition 2's bullets. All **PASS.**

*Minor ambiguity.* The exposition sometimes writes $D_i$ where $\max\{D_i, 0\}$ is intended; they are equivalent under score optimality (since $D_i < 0$ would force the score derivative strictly negative and contradict support-membership) but the equivalence is left to the reader.

**Verdict: VERIFIED** with one minor expositional ambiguity concerning $\max\{D_i, 0\}$ vs $D_i$.

### B.2 Proposition C.1 (symmetric equilibrium, $y_0 = 0$)

*Statement.* When $y_0 = 0$: (1) if $\alpha \geq 1 + x_E/x_V$, the unique equilibrium is pure inactivity; (2) otherwise both DEVs share an identical score CDF with atom $F(0) = \alpha/(1 + x_E/x_V)$ at zero, linear $\hat{s}(F)$ on a constrained region $[F(0), \breve{F}]$, and logarithmic $\tilde{s}(F)$ on $(\breve{F}, 1]$; and DM's expected utility admits a displayed closed form.

*Proof structure.* Eight intermediate ingredients establish the bullet-1 threshold, the atom height, the linear-region solution, the transition point $\breve{s}$, the case split between the $\hat{s}$-only regime ($\breve{F} = 1$) and the full regime, and the logarithmic closed form. The error is isolated to the final Step 11 simplification of the DM-utility integral over the $\tilde{s}$-region.

**Steps 1–6 (threshold, atom, constrained ODE, transition point, case split).** With $r = x_E/x_V$: inactivity threshold is $\alpha \geq 1 + r$ (Condition 1 of B.1, since $D(s_0, 1) = r$). The atom $F(0)$ satisfies $\alpha - F(0) = F(0)\,r$, giving $F(0) = \alpha/(1 + r)$. Condition 3 of B.1 with $y_i^* = z_i$ and $y_R^* - y_L^* = s/x_V$ gives $\alpha - (1+r) F + (\alpha/(2 x_V^2)) s = f(s) \cdot 2 r s$; the linear ansatz $F(s) = A s + F(0)$ with $A = \alpha/[2 x_V (x_V + 3 x_E)]$ solves it, and inverting yields $\hat{s}(F) = (2 x_V^2/\alpha)(1 + 3r)(F - F(0))$. The transition $\breve{s}$ defined by $(x_E/\alpha)\hat{F}(\breve{s}) = \breve{s}/(2 x_V)$ yields $\breve{F} = \alpha(1 + 3r)/[(1 + r)(1 + 2r)]$ and $\breve{s} = 2 x_V^2 r(1 + 3r)/[(1 + r)(1 + 2r)]$. $\breve{F} = 1$ gives the $\hat{s}$-only regime; $\breve{F} < 1$ gives the full mixed regime. All **PASS** (sympy-verified).

**Step 7 (unconstrained-region ODE).** With $y_i^* = (\text{sgn}(x_i) x_E/\alpha) F$, the ODE reduces to $\alpha - F = f \cdot (4 x_E^2/\alpha) F$. The paper displays a pre-simplification form with an algebraic-factor slip (writing $x_E^2/\alpha$ in place of $2 x_E^2/\alpha$), but the subsequent $\tilde{f}$ and $\tilde{s}(F)$ formulae are consistent with the correct ODE. **PASS** (treating the derivation as a whole).

**Steps 8–10 ($\tilde{s}$ integration, DM integrand, Part-1 integral).** Antiderivative of $4 x_E^2 G/[\alpha(\alpha - G)]$ evaluated from $\breve{F}$ to $F$ gives $\tilde{s}(F) = \breve{s} + 4 x_E^2 [\ln((\alpha - \breve{F})/(\alpha - F)) - (F - \breve{F})/\alpha]$. DM utility is $\text{EU}_D = \int 2 F\,s(F)\,dF$ (max of iid scores). The Part-1 integral $\int_{F(0)}^{\breve{F}} 2 F \hat{s}(F)\, dF$ evaluates cleanly to the paper's Part-1 expression. All **PASS** (sympy).

**Step 11 (Part-2 integral, $\tilde{s}$-region — FAIL).** The paper displays

$$\breve{s}(1 - \breve{F}^2) + 4 x_E^2 \left[(1 - \breve{F})\left(\tfrac{\alpha + 1 + \breve{F}}{2} - \tfrac{(2 - \breve{F})(1 - \breve{F})}{3\alpha}\right) - (\alpha^2 - 1) \ln\tfrac{\alpha - \breve{F}}{\alpha - 1}\right].$$

Direct symbolic integration of $\int_{\breve{F}}^{1} 2 F \cdot \tilde{s}(F)\, dF$ in sympy, cross-checked by scipy.quad on the integrand, yields instead the bracket

$$\alpha(1 - \breve{F}) + \tfrac{1 - \breve{F}^2}{2} - \tfrac{2}{3\alpha} + \tfrac{\breve{F}}{\alpha} - \tfrac{\breve{F}^3}{3\alpha} - (\alpha^2 - 1) \ln\tfrac{\alpha - \breve{F}}{\alpha - 1}.$$

The two brackets differ by $\alpha(1 - \breve{F})/2 - (2 \breve{F}/(3\alpha))(1 - \breve{F})^2$, a non-vanishing term when $\breve{F} < 1$. Numerical evaluation at $x_V = 1$, $x_E = 2$, $\alpha = 2.1$ gives DM utility $\approx 0.206$ under the paper's formula and $\approx 0.540$ under the corrected formula — a material numerical discrepancy. When $\breve{F} = 1$ (the $\hat{s}$-only regime, the paper's "first case"), only the Part-1 formula is invoked and the two agree; the error is confined to the full mixed regime.

*Isolation of the error.* Every input to the Part-2 formula is independently verified: $F(0)$, $\hat{s}(F)$, $\breve{s}$, $\breve{F}$, $\tilde{s}(F)$, the case splits, and the integrand. The mistake is in the final simplification step only. Downstream uses of Proposition C.1 reference the integrand or $\hat{s}/\tilde{s}$ in their raw forms: Proposition C.2's proof works with $\hat{s}(F)$ and the integrand for $\tilde{s}(F)$ rather than the simplified closed form, and Proposition 4 cites C.2 without re-substituting C.1's bracket. No downstream claim depends on the erroneous expression.

**Verdict: VERIFIED with FAIL at Step 11** — the displayed closed-form DM utility is algebraically incorrect; the correct form is stated above; all ingredients and all downstream uses are correct.

### B.3 Proposition C.2 (FOSD dominance when $y_0 = 0$)

*Statement.* When $y_0 = 0$, DM's equilibrium score CDF without VPs first-order stochastically dominates her score CDF with VPs (and hence so does her payoff CDF, which equals the score CDF squared).

*Proof structure.* Seven sub-steps reduce a full FOSD inequality to a single-point comparison at $\breve{F}$ by exploiting linearity of $\hat{s}$ and strict convexity of $\tilde{s}_C$.

**Step 1 (payoff FOSD from score FOSD).** DM's payoff is the max of two iid scores, so its CDF equals (score CDF)$^2$. Score-CDF FOSD implies payoff-CDF FOSD. **PASS.**

**Step 2 (inactive regime).** For $\alpha \geq 1 + r$, the VP equilibrium is pure inactivity and any VP-free activity trivially dominates. **PASS.**

**Step 3 (mixed regime setup).** For $\alpha \in (2, 1 + r)$, work with inverse CDFs and show $s_C(F) > s_V(F)$ for $F \in [F_V(0), 1]$. **PASS.**

**Step 4 (slope match at $\breve{F}$).** Sympy confirms $\hat{s}'(F) = \tilde{s}_C'(F)$ at $F = \breve{F}$, both equal $(2 x_V^2/\alpha)(3r + 1)$. $\hat{s}$ is linear, $\tilde{s}_C$ strictly convex. **PASS.**

**Step 5 (reduction to single-point inequality).** Linearity of $\hat{s}$ and strict convexity of $\tilde{s}_C$ with matched slopes at $\breve{F}$ reduce the full inequality to $\tilde{s}_C(\breve{F}) > \hat{s}(\breve{F})$. The paper further reduces this to $2 r^2 \int_0^{\breve{F}} G/(\alpha(\alpha - G))\, dG > (1/\alpha)(3r + 1)(\breve{F} - \alpha/(1 + r))$. **PASS.**

**Step 6 (RHS simplification).** $(3r + 1)(\breve{F} - \alpha/(1 + r)) = r \breve{F}$ (sympy), so the RHS becomes $r \breve{F}/\alpha$. **PASS.**

**Step 7 (bounding the LHS).** $\alpha - G \geq \alpha - 1$ for $G \in [0, 1]$, so $\int_0^{\breve{F}} G/(\alpha - G)\, dG \geq \breve{F}^2/[2(\alpha - 1)]$. Sufficient: $r \breve{F}/(\alpha - 1) > 1$. Both the $\breve{F} = 1$ case (needs $\alpha < 1 + r$) and the $\breve{F} < 1$ case (needs $\alpha < 1 + r$ via $(1 + 3r)/(1 + 2r) > 1$) check. **PASS.**

**Verdict: VERIFIED.**

### B.4 Proposition C.3 (asymmetric equilibrium, $y_0 < 0$)

*Statement.* When $y_0 < 0$, $D_L < D_R$ everywhere; any equilibrium with activity is asymmetric, with L (the less-motivated DEV) sometimes inactive and R always active; if mixed, there is a unique merging point $\breve{s}$ above which $F_L = F_R$; and $F_R$ first-order stochastically dominates $F_L$.

*Proof structure.* The proof threads fourteen sub-claims through Proposition B.1's conditions, implicit Lemma A.3, and delicate sign-of-$D_R$-near-crossing arguments.

**Step 1 ($D_R > D_L$).** Under symmetric VPs, $z_L + z_R = 2 y_0$, so $D_R - D_L = -(\alpha/x_V) \cdot 2 y_0 = (\alpha/x_V) \cdot 2|y_0| > 0$. **PASS.**

**Step 2 (pure-asymmetric has $k = L$).** If $k = R$, Condition 2 of Proposition B.1 forces $D_L(\underline{s}; 1) = \alpha - 1$, but $D_L < D_R$ contradicts the Condition-2 inequality. **PASS.**

**Step 3 (uniqueness of pure form — AMBIGUOUS).** The paper asserts "only one pure-strategy equilibrium can exist" with "easily verified." Given Proposition B.1 the verification is routine — the FOC $\alpha - 1 = D_R(\underline{s}; 1)$ pins down $\underline{s}$, and $y_R^*(\underline{s}) = z_R(\underline{s})$ follows from constrained optimality — but is not written out. **AMBIGUOUS.**

**Steps 4–6 (mixed, constrained region; single constraint-crossing; concavity persistence).** Where $D_i < 0$, the ODE gives $f_{-i} = (\alpha - F_{-i})/[2 x_E (y_R^* - y_L^*)]$, with $y_R^* - y_L^*$ strictly increasing and $\alpha - F_{-i}$ decreasing, so $F_{-i}$ is strictly concave. The zero-crossing of $D_i$ at $\breve{s}$ is single by derivative-of-numerator algebra; linear $z_i$ plus concave $F$ keeps $F$ below the constraint once below. **PASS.**

**Steps 7–10 ($f_L - f_R$ sign analysis).** Rearranging Condition 3 of Proposition B.1 yields $(f_R - f_L) \cdot 2 x_E (y_R^* - y_L^*) = F_L - F_R + \max\{D_R(\cdot; F_L), 0\} - \max\{D_L(\cdot; F_R), 0\}$. Three cases for the crossing: (8) $D_R > 0$ gives $f_R - f_L > 0$ via pointwise chains $D_R(F_L) > D_L(F_L) \geq \max\{D_L(F_L), 0\} \geq D_L(F_R)$; (9) $D_R \leq 0$ below $\breve{s}$ forces $F_L = F_R$ via symmetric ODEs plus BC; (10) $D_R > 0$ just below but $= 0$ at $\breve{s}$ gives $f_R > f_L$ via an integrating-identity argument. **PASS** throughout.

**Steps 11–15 (FOSD assembly).** A crossing of $F_L, F_R$ below the merge would contradict Steps 8–10, giving weak FOSD ($F_L \geq F_R$). Mixed-asymmetric requires $s_0 < \underline{s}$ (else $y_i^*(s_0) = 0$ FOC contradicts FOSD). $k = L$ in mixed (integrand-sign contradiction if $k = R$). Condition 2's first bullet plus a density-continuity argument at $\underline{s}$ gives strict $F_R(\underline{s}) < F_L(\underline{s})$. $D_R(s; F_L(s))$ crosses zero at most once, and above the crossing Sub-case 2.i (Step 9) gives $F_L = F_R$ — the single merge point $\breve{s}$. All **PASS.**

The accompanying C.3 "Computational Procedure" is a description of an algorithm for locating an equilibrium of each type; its correctness claims (no-activity uniqueness, k=L under asymmetry, non-uniqueness caveats) follow from Proposition B.1 and C.3's main-text results and match the characterization. Existence invokes Simon and Zame (1990).

**Verdict: VERIFIED** with one AMBIGUOUS sub-step at Step 3 (uniqueness of the pure form is asserted "easily verified" rather than written out; given Proposition B.1 the verification is routine).

## Appendix C — Proof walkthroughs: lemmas

The ten lemmas aggregate to 45 PASS, 2 AMBIGUOUS, 0 FAIL across sub-steps. Main-text Lemma 1 is a one-line pointer; main-text Lemma 2 carries a labeling typo and a strict-vs-weak concern; Lemmas A.1–A.6 form the analytical foundation; Lemmas B.1 and B.2 handle support-transition and atom properties.

### C.1 Main-text Lemma 1

*Statement.* In any equilibrium satisfying Remark 1's selection conventions, there exist a developer $k$ and scores $s_0 \leq \underline{s} \leq \bar{s}$ such that $F_k$ has support $\{s_0\} \cup [\underline{s}, \bar{s}]$ with a single atom at $s_0$, and $F_{-k}$ has support $[\underline{s}, \bar{s}]$ with a single atom at $\bar{s}$.

*Proof structure.* The Appendix D proof is literally one line: "Follows from Prop B.1." The Lemma's structural content is exactly the case decomposition of Proposition B.1, read off from Conditions (1)–(4).

**Step 1 (case (1) of B.1).** $s_0 = \underline{s} = \bar{s}$: both DEVs place their sole atom at $s_0$; vacuously satisfies the Lemma with either developer serving as $k$. **PASS.**

**Step 2 (case (2) of B.1).** $s_0 < \underline{s} = \bar{s}$: k has atom at $s_0$, $-k$ has atom at $\bar{s} = \underline{s}$. Matches the Lemma's description. **PASS.**

**Step 3 (cases (3) and (4) of B.1).** Mixing on $[\underline{s}, \bar{s}]$ with boundary atoms combines into the full pattern. Continuity of $F_{-i}$ on the mixing interval (from the density form of the ODE) rules out interior atoms. **PASS.**

*Labeling note.* The appendix's label swap (see C.2 below) means the one-line proof printed next to "Lemma 1" does belong to Lemma 1; the prior paragraph labeled "Lemma 1" is actually Lemma 2's proof. A typographical artifact, not a substantive issue.

**Verdict: VERIFIED** (content of proof is a correct pointer; no independent algebra is required beyond Proposition B.1's own verification).

### C.2 Main-text Lemma 2

*Statement.* In any pure-strategy equilibrium ($\underline{s} = \bar{s}$), the developer $k$ with the lower monopoly score is inactive (crafts $s_0$), and the other developer $-k$ crafts her monopoly policy $(s_{-k}^{M*}, y_{-k}^{M*})$. If both monopoly scores equal $s_0$, both are inactive.

*Proof structure.* Four steps: at most one DEV is active in a pure equilibrium (from B.1 and A.3); the active DEV solves the monopoly problem; the active DEV must be the higher-monopoly-score one (by a strict-deviation argument); and the both-at-$s_0$ case is case (1) of B.1.

*Labeling note.* The Appendix D text contains two consecutive paragraphs both labeled "Lemma 1." The first is the proof of main-text Lemma 2 (pure-strategy equilibrium form); the second is the one-line pointer that belongs to Lemma 1. This is a labeling swap — a typographical error in the printed appendix. The *content* of each proof correctly maps to the correct lemma, as confirmed by Proposition 2's proof, which cites "L's monopoly policy from Lemma 2" and is consistent with the pure-equilibrium-form content belonging to Lemma 2.

**Step 1 (at most one active).** Pure strategy means $\underline{s} = \bar{s}$, so case (3) of B.1 (which forces positive-measure mixing) is excluded. If both were active at some $s > s_0$, Lemma B.2 forces atoms there; Lemma A.3 forbids ties at $s > s_0$. So at most one is active. **PASS.**

**Step 2 (active DEV = monopolist).** If $-k$ is the sole active developer, $k$ plays $(s_0, y_0)$ for sure, and $-k$'s problem collapses to Proposition 1's monopoly problem. **PASS.**

**Step 3 (active DEV is higher-monopoly-score).** Suppose $s_{-k}^{M*} > s_k^{M*} > s_0$ and only k is active at $(s_k^{M*}, y_k^{M*})$. The deviation "develop own monopoly policy" yields strictly higher payoff.

**Sub-step 3a.** $-k$ strictly prefers $(s_{-k}^{M*}, y_{-k}^{M*})$ to $(s_0, y_0)$ by the invest condition of Proposition 1. **PASS** (strict).

**Sub-step 3b (strict-vs-weak concern).** $-k$ prefers $(s_0, y_0)$ to $(s_k^{M*}, y_k^{M*})$. Let $k = L$ WLOG. L's monopoly policy satisfies the right-VP indifference $s_L^{M*} - s_0 = 2 x_{VR}(y_0 - y_L^{M*})$. Then

$$V_R(s_L^{M*}, y_L^{M*}) - V_R(s_0, y_0) = (s_L^{M*} - s_0) + 2 x_R (y_L^{M*} - y_0) = 2 (y_0 - y_L^{M*})(x_{VR} - x_R).$$

Since $y_0 > y_L^{M*}$ (L pushes leftward) and $x_R \geq x_{VR} > 0$, the product is $\leq 0$, with equality at the edge case $x_R = x_{VR}$. The paper asserts *strict* preference, but the standing assumption $|x_{-k}| \geq |x_{V,-k}|$ is weak — strict preference requires $|x_{-k}| > |x_{V,-k}|$. At the boundary case the inequality is $=$, not $>$.

Nonetheless, the overall deviation argument still yields strict profitability. Sub-step 3a is strict; combining the strict gain on A with the weak gain on B gives a strictly positive net deviation payoff. So the equilibrium-contradiction argument goes through. The paper's wording is slightly imprecise but the result is correct. **PASS, with mild concern.**

**Step 4 (both inactive case).** If both monopoly scores equal $s_0$, by Proposition 1 neither invests; this is case (1) of Proposition B.1. **PASS.**

**Verdict: VERIFIED** with a labeling typo and a strict-vs-weak inequality concern at Step 3b that does not break the argument.

### C.3 Lemma A.1 (veto-proofness doesn't restrict best responses)

*Statement.* Replacing non-veto-proof crafted policies in any equilibrium with $(s_0, y_0)$ yields an equilibrium with the same outcome distribution and payoffs.

*Proof.* Non-veto-proof policies never get proposed to the VPs (DM's best proposal switches to $(s_0, y_0)$ if the developer's policy would be vetoed), so (i) outcomes are identical under both profiles; (ii) positive-quality non-veto-proof crafting strictly dominated by $(s_0, y_0)$ at zero cost; (iii) 0-quality non-veto-proof is payoff-equivalent to $(s_0, y_0)$; (iv) $-i$'s best-response set is unchanged since no outcome changes. All four observations **PASS** directly from the outcome-equivalence observation.

**Verdict: VERIFIED.**

### C.4 Lemma A.2 (ideological optimality at a given score)

*Statement.* At any score $s \geq s_0$ where $F_{-i}$ has no atom or $i$ wins ties, the best ideology is $y_i^*(s) = \min\{\max\{z_L(s), (x_i/\alpha_i) F_{-i}\}, z_R(s)\}$.

*Proof.* Only two terms of $\bar{\Pi}_i(s_i, y_i; \sigma_{-i}) = -\alpha_i(s + y^2) + F_{-i}(s_i) V_i(s_i, y_i) + \int_{s_{-i} > s_i} V_i(s_{-i}, y_{-i}) d\sigma_{-i}$ depend on $y_i$. Differentiating gives $\partial/\partial y_i = -2 \alpha_i y_i + 2 F_{-i} x_i$ with zero at $y_i = (x_i/\alpha_i) F_{-i}$; second derivative $-2 \alpha_i < 0$. Strict concavity plus box constraint $[z_L(s), z_R(s)]$ yields the closed form. **PASS** (sympy).

**Verdict: VERIFIED.**

### C.5 Lemma A.3 (no ties at $s > s_0$)

*Statement.* In equilibrium there is zero probability of a tie at scores $s > s_0$.

*Proof structure.* By contradiction with three subcases on the relation between the tie-conditional expected ideology $\bar{y}^s$ and the closest-to-zero veto-proof ideology $y_D^s$.

**Step 1.** Linearity of $V_i$ in $y$ and convexity of cost in $y$ make deterministic-$\bar{y}^s$ weakly better than mixing with expectation $\bar{y}^s$. **PASS.**

**Step 2 (Subcase A: $\bar{y}^s \neq y_D^s$).** One developer $k$ has $V_k(s, y_D^s) > V_k(s, \bar{y}^s)$; the deviation "always win at $y_D^s$" (achievable via $s + \varepsilon$) is strictly profitable. **PASS.**

**Step 3 (Subcase B: $\bar{y}^s = y_D^s$ with mixing).** Deterministic deviation to $(s, y_D^s)$ saves cost without changing outcomes. **PASS.**

**Step 4 (Subcase C: both deterministic at $y_D^s$).** If $y_k^*(s) \neq y_D^s$ for some $k$, deviate to $(s + \varepsilon, y_k^*(s))$; else $y_D^s = z_j(s)$, and $-j$ profitably deviates to $(s_0, y_0)$, saving $\alpha_{-j}$ times the cost of being at her worst-for-her boundary. **PASS.**

**Verdict: VERIFIED.**

### C.6 Lemma A.4 (right-continuity of $\bar{\Pi}_i^*$)

*Statement.* $\bar{\Pi}_i^*(s; F)$ is right-continuous and satisfies $\lim_{s \to \hat{s}^-} \bar{\Pi}_i^*(s; F) \leq \bar{\Pi}_i^*(\hat{s}; F)$ for $\hat{s} > s_0$.

*Proof.* Right-continuity inherits from $F_{-i}$'s right-continuity through continuous functional dependence. At an atom $\hat{s}$ of $-i$, Lemma A.3 gives no atom of $i$, and ideological optimality gives $-i$ playing $y_{-i}^*(\hat{s})$. The payoff jump decomposes as $\bar{\Pi}_i^*(\hat{s}, y_i^{\hat{s}-}; F) - \lim_{s \to \hat{s}^-} \bar{\Pi}_i^* = p_{-i}^{\hat{s}}\bigl(V_i(\hat{s}, y_i^{\hat{s}-}) - V_i(\hat{s}, y_{-i}^*(\hat{s}))\bigr)$. The chain $V_i(\hat{s}, y_i^{\hat{s}-}) \geq V_i(\hat{s}, y_D^{\hat{s}}) \geq V_i(\hat{s}, y_{-i}^*(\hat{s}))$ uses Lemma A.2 applied to both developers plus the observation that $y_D^{\hat{s}}$ (closest to 0) is weakly better for $i$ than $y_{-i}^*(\hat{s})$ (shifted toward $x_{-i}$). Conclude $\bar{\Pi}_i^*(\hat{s}; F) \geq \bar{\Pi}_i^*(\hat{s}, y_i^{\hat{s}-}; F) \geq$ left-limit. **PASS** (all five sub-steps).

**Verdict: VERIFIED.**

### C.7 Lemma A.5 (score-optimality: all support points attain max)

*Statement.* For all $i$ and $\hat{s} \in \text{supp}(F_i)$, $\bar{\Pi}_i^*(\hat{s}; F) = \max_{s \geq s_0} \bar{\Pi}_i^*(s; F)$.

*Proof.* The max is well-defined in any equilibrium. Case A ($\hat{s}$ has no left-accumulation): $\hat{s}$ is an atom or a right-accumulation point; if the equality fails, mass-reallocation from a neighborhood of $\hat{s}$ to near-max scores (using A.4 right-continuity) yields a profitable deviation. Case B ($\hat{s}$ has left-accumulation, hence $\hat{s} > s_0$): $\lim_{s \to \hat{s}^-} \bar{\Pi}_i^*(s; F) \geq \max$ (else a left-neighborhood deviation is profitable), and A.4 gives $\bar{\Pi}_i^*(\hat{s}; F) \geq$ this limit $\geq \max$. Both cases **PASS.**

**Verdict: VERIFIED.**

### C.8 Lemma A.6 (joint sufficiency of the three properties)

*Statement.* Under veto-proof-only crafting, ideological optimality + no-ties + score-optimality are jointly necessary and sufficient for equilibrium.

*Proof.* Necessity is covered by A.1, A.2, A.3, A.5. For sufficiency, let $U_i^* = \max_{s \geq s_0} \bar{\Pi}_i^*(s; F)$. For any deviation $(s_i, y_i)$: if $-i$ has no atom at $s_i$, payoff $\leq \bar{\Pi}_i^*(s_i; F) \leq U_i^*$; if $-i$ has an atom, payoff $\leq \max\{\bar{\Pi}_i^*(\hat{s}_i; F), \lim_{s \to \hat{s}_i^-} \bar{\Pi}_i^*(s; F)\} \leq \bar{\Pi}_i^*(\hat{s}_i; F) \leq U_i^*$ by Lemma A.4. **PASS.**

**Verdict: VERIFIED.**

### C.9 Lemma B.1 (ideological restriction at $s > s_0$)

*Statement.* If $s_i > s_0$ is in $\text{supp}(F_i)$ then $F_{-i}(s) > y_0/(x_i/\alpha_i)$ and $|x_i - y_i^*(s)| < |x_i - y_0|$.

*Proof structure.* Contrapositive: if $|x_i - y_i^*(s_i)| \geq |x_i - y_0|$, then $\bar{\Pi}_i^*(s_i; F) - \bar{\Pi}_i^*(s_0; F) < 0$, violating score optimality.

**Steps 1–6 (setup, sign, bound, maximize).** Assume the hypothesis's negation: $|x_i - y_i^*(s_i)| \geq |x_i - y_0|$. Then $y_i^*$ is on the wrong side of $y_0$ from $x_i$, giving $\text{sgn}(x_i) = \text{sgn}(y_0)$ and $F_{-i}(s) \leq y_0/(x_i/\alpha_i)$. Rewriting the utility difference $\bar{\Pi}_i^*(s_i, y_i; F) - \bar{\Pi}_i^*(s_0; F) = -\alpha_i(s_i + y_i^2) + \int_{s_0}^{s_i} [V_i(s_i, y_i) - V_i(s_{-i}, y_{-i}^*(s_{-i}))]\, dF_{-i}$ and bounding the integrand using $(s_i, z_{-i}(s_i))$ weakly worst for $i$ (from $|x_i| \geq |x_{V,i}|$), substituting $F_{-i} \leq y_0/(x_i/\alpha_i)$, and maximizing over veto-proof $y_i$ gives $y_i = y_0$ as the worst-case maximizer. **PASS.**

**Step 7 (substitution).** At $y_i = y_0$ and $s_0 = -y_0^2$, the expression simplifies to $-\alpha_i(1 - y_0/x_{V,i})(s_i - s_0)$. **PASS** (sympy).

**Step 8 (sign — mild edge-case concern).** The paper writes this is $< 0$ "since $|y_0| \leq |x_{V,i}|$." Since $\text{sgn}(x_{V,i}) = \text{sgn}(y_0)$, $y_0/x_{V,i} \in [0, 1]$, so $(1 - y_0/x_{V,i}) \geq 0$ with equality iff $y_0 = x_{V,i}$. Combined with $s_i - s_0 > 0$ and $\alpha_i > 0$, the product is $\leq 0$, strict only when $|y_0| < |x_{V,i}|$. At the boundary the expression equals $0$, not strict. The edge case is vacuous: $y_0 = x_{V,i}$ places the status quo at the same-side VP's ideal, leaving no feasible improvement, so $s_i > s_0$ cannot occur and the lemma's hypothesis is vacuously false. **MILD CONCERN** (non-load-bearing).

**Verdict: VERIFIED** with a strict-vs-weak imprecision at the $|y_0| = |x_{V,i}|$ boundary that is a non-generic edge case where the lemma's hypothesis is vacuous.

### C.10 Lemma B.2 (isolated support points sit at $z_i$)

*Statement.* If $\hat{s}_i \in \text{supp}(F_i)$ and there exists $\underline{s}_i \in [s_0, \hat{s}_i)$ with $F_{-i}(\underline{s}_i) = F_{-i}(\hat{s}_i)$, then $F_{-i}(\hat{s}_i) > 0$, $\hat{s}_i$ is $i$'s lowest support point, and $y_i^*(\hat{s}_i) = z_i(\hat{s}_i)$.

*Proof structure.* Part A shows $\hat{s}_i$ is the only support point in the constant-$F_{-i}$ interval, with $y_i^*$ on the boundary $z_i$ and $F_{-i}(\hat{s}_i) > 0$. Part B shows $\hat{s}_i$ is $i$'s lowest support point, by a contradiction argument using the derivative structure of $\bar{\Pi}_i^*$ on $[\underline{s}_i', \hat{s}_i]$ and an atom of $-i$ in $(\underline{s}_i', \hat{s}_i)$.

**Part A (unique support point, $y_i^* = z_i$, $F_{-i}(\hat{s}_i) > 0$).** On the constant-$F_{-i}$ interval $[\tilde{\underline{s}}_i, \hat{s}_i]$, $f_{-i} = 0$ gives $\partial \bar{\Pi}_i^*/\partial s_i = -(\alpha_i - F_{-i}(\hat{s}_i)) + \max\{D_i, 0\}$. An interior $y_i^* = (x_i/\alpha_i) F_{-i}(\hat{s}_i)$ would yield $\max\{D_i, 0\} = 0$ and strictly negative derivative throughout — contradicting $\hat{s}_i$ maximizing. So $y_i^*$ is on the boundary; Lemma B.1 rules out $z_{-i}$, leaving $z_i$. With $y_i^* = z_i$, the derivative is strictly decreasing in $s_i$, so $\bar{\Pi}_i^*$ is strictly concave and $\hat{s}_i$ is the unique maximizer on the interval. A Lemma B.1-style bound at $s_i = s_0$ with $F_{-i}(\hat{s}_i) = 0$ gives $-\alpha_i(1 - y_0/x_{V,-i}) < 0$, contradicting maximality; so $F_{-i}(\hat{s}_i) > 0$. All **PASS.**

**Part B (lowest support point).** Suppose $\hat{s}_i$ is not lowest; let $s_i'$ be the next-lower support point. $F_i$ is constant on $[s_i', \hat{s}_i)$, so Part A applied to $-i$ yields a $-i$-atom $\hat{\hat{s}}_i \in (s_i', \hat{s}_i)$ with $y_{-i}^* = z_{-i}$, and $F_{-i}$ constant around $s_i'$. The payoff difference $\bar{\Pi}_i^*(\hat{s}_i; F) - \bar{\Pi}_i^*(s_i'; F)$ decomposes via A.5's telescoping identity into a derivative-integral term plus $p_{-i}^{\hat{\hat{s}}_i} [V_i(s_i', z_i(s_i')) - V_i(\hat{\hat{s}}_i, z_{-i}(\hat{\hat{s}}_i))]$. The atom term is positive because $(\hat{\hat{s}}_i, z_{-i}(\hat{\hat{s}}_i))$ is weakly worst for $i$ (using $|x_i| \geq |x_{V,i}|$); the derivative-integral term is positive by Part A's strict concavity argument. So $\bar{\Pi}_i^*(\hat{s}_i; F) > \bar{\Pi}_i^*(s_i'; F)$, contradicting $s_i' \in \text{supp}(F_i)$. Hence $\hat{s}_i$ is the lowest. All **PASS.**

**Verdict: VERIFIED.**

## Appendix D — Reproducibility details

*Paper input.* The verified document is the May 5, 2025 combined PDF (main paper plus supporting information) from the Hirsch Caltech page, cached locally as `env/original/paper.pdf` and `supplement.pdf` with plain-text extracts. This predates the 2026 AJPS publication by approximately eleven months. The two identified gaps (Proposition 3 Part 1b case (ii); Proposition C.1 Step 11) and the two minor typos (Proposition 1 Step 3a sign; Lemma 1/2 label swap) may or may not persist in the published version; this replication does not check against the final AJPS typesetting.

*Verification methodology.* Algebraic transitions were re-derived with sympy 1.14.0 under CPython 3.13 via `.venv/bin/python3`. Symbolic verification was preferred over numerical verification where feasible, because symbolic identities certify a claim for all parameter values in a declared domain whereas numerical checks only confirm it at a grid of test points. Numerical verification was used for: (i) the $\tilde{\alpha}$-threshold of Proposition 4, solved at $x_V = x_E$, $y_0 = -x_E$ by numerical root-finding on $s_R^{M*}(\alpha) - \text{EU}^0_D(\alpha) = 0$; (ii) the Corollary 2 double integral, cross-checked via scipy.quad at $\alpha \in \{3.0, 3.68, 4.0\}$; and (iii) the Proposition C.1 Step 11 closed-form comparison, where sympy's symbolic integration returned a bracket that differs from the paper's by a non-vanishing algebraic term, confirmed at $x_V = 1$, $x_E = 2$, $\alpha = 2.1$ (paper bracket $\approx 0.206$, corrected bracket $\approx 0.540$). Counterexamples for the Proposition 3 Part 1b case (ii) discriminant analysis were constructed symbolically (the discriminant of $\tilde{G}(y_0; x_E, x_E)$ as a quadratic in $y_0$ is $-x_E^2 (\alpha - 1)(\alpha - 5)$, negative for $\alpha > 5$) and confirmed at $\alpha = 5$, $x_E = 1$, $y_0 = 0.6$.

*Logical-step verification.* Non-algebraic steps — reductions of the three-stage game to direct-choice problems, case splits, contradiction arguments for lemmas on ties and support structure, sufficiency arguments for equilibrium characterizations — were hand-checked against the text of Appendices A and D and cross-referenced against the lemmas they invoke. For each lemma and proposition, the dependency chain was tracked in structured YAML (`claim-index-lemmas.yml`, `claim-index-competitive.yml`, `claim-index-appendix.yml`), enabling a downstream-propagation check for any identified error. This check is how the isolation of the Proposition C.1 Step 11 error was established: the error is in the final simplification of $\int_{\breve{F}}^1 2 F \tilde{s}(F)\, dF$, but all ingredients ($F(0)$, $\hat{s}$, $\breve{s}$, $\breve{F}$, $\tilde{s}$, the integrand) are verified correct, and Proposition C.2's proof and Proposition 4's Step 2 both cite the integrand or $\hat{s}/\tilde{s}$ in their raw forms rather than substituting the erroneous bracket.

*Computational sub-claims not re-run.* Two sub-claims are explicitly computational in the paper — cited as numerical evaluations of the Proposition C.3 procedure — and are not independently re-run here. (a) Proposition 3 Part 1c: strict monotonicity of the less-motivated developer's active probability in $x_V$ within the mixed region would require re-implementing the C.3 procedure and verifying monotonicity at a grid of parameter values. (b) Proposition 4's both-active mixed case: DM's utility from the competitive mixed equilibrium, computed by numerical integration of the C.3 CDF. Both are flagged rather than claimed verified. The surrounding analytical parts of Proposition 4 — the no-VP baseline, the $y_0 = 0$ case via C.2, the no-activity case, the one-active-developer case via Corollary 1, and the $\tilde{\alpha} \approx 3.68$ threshold — are independently verified.

*Scope of external dependencies.* Corollary 2's closed form is cited in the paper from Equation 3 and Footnote 4 of Hirsch and Shotts (2015). The integral-to-closed-form step is re-verified here; the equilibrium-CDF-to-integral step is taken as given from the external derivation. Proposition C.3's existence claim cites Simon and Zame (1990); this is an external result and is not re-verified.

*Reproducibility artifacts.* The verification files backing this appendix are `env/proof-prop-1.md`, `env/verification.md`, `env/verification-lemmas.md`, `env/verification-competitive.md`, `env/verification-appendix.md`, and the three `claim-index-*.yml` files. Symbolic scripts were run ad hoc in a sympy REPL rather than serialized; all results are reproducible by any reader with sympy 1.14.0 and the paper's equations in hand. The two key counterexamples (Proposition 3 at $\alpha = 5$, $x_E = 1$, $y_0 = 0.6$; Proposition C.1 at $x_V = 1$, $x_E = 2$, $\alpha = 2.1$) are stated above in sufficient detail to be re-checked in under a minute.
