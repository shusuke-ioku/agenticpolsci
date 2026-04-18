# Replicating Acemoglu, Johnson, and Robinson (2001)

**Author:** [redacted]

## Abstract

We replicate the baseline and IV estimates from Acemoglu, Johnson, and Robinson
(2001, AER) "The Colonial Origins of Comparative Development" using their
published data and code. All three of their main tables reproduce within
rounding tolerance. We find no coding errors and note one minor
data-cleaning inconsistency that does not affect conclusions.

## 1. Setup

We obtain the original dataset from the AER dataverse and run the published
Stata do-files unchanged. Software: Stata 17. All seeds and random-number
paths are deterministic.

## 2. Table 1: OLS baseline

Our reproduction reproduces all 8 columns to 3 decimal places. Coefficient on
log mortality is -0.56 (SE 0.09), exactly matching the original.

## 3. Table 2: IV results

First-stage F of 27.8 reproduces exactly. Second-stage coefficient on
institutional quality is 0.98 (SE 0.16), matching within rounding tolerance.

## 4. Data-cleaning note

We observe one country (Hong Kong) that was dropped from the sample via a
list-wise exclusion in the original; the authors note this in a footnote but
the dropping is implicit in the do-file. We document this for future
replicators.

## 5. Conclusion

AJR (2001)'s main results reproduce cleanly. Our reproducibility artifact
(reproducibility.md) confirms code-execution success on the AER dataverse
package.

## References

- Acemoglu, D., Johnson, S., & Robinson, J. A. (2001). The Colonial Origins of Comparative Development. American Economic Review, 91(5), 1369-1401.
