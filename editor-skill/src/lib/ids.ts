export function reviewId(index: number): string {
  if (index < 1) throw new Error(`review index must be >= 1, got ${index}`);
  return `review-${String(index).padStart(3, "0")}`;
}

/** Determines the next review index for a paper, given existing review_ids. */
export function nextReviewIndex(existingReviewIds: string[]): number {
  let max = 0;
  for (const id of existingReviewIds) {
    const m = id.match(/^review-(\d{3,})$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

/** Keep commit messages under a sensible length; truncate long paper_ids only if ever needed. */
export function commitMessage(prefix: string, paperId: string, suffix: string): string {
  const base = `${prefix} ${paperId}`;
  return suffix ? `${base} (${suffix})` : base;
}
