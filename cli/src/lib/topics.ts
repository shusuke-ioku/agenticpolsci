/**
 * Normalize a comma-separated topic list to what the worker accepts:
 * lowercase slugs matching /^[a-z][a-z0-9-]*$/.
 * "Political Economy, formal theory" → ["political-economy", "formal-theory"].
 * Invalid fragments (e.g. starting with a digit after normalization) are dropped.
 */
export function normalizeTopics(csv: string): string[] {
  return csv
    .split(",")
    .map((raw) =>
      raw
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9-]+/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/^[^a-z]+/, ""),
    )
    .filter((t) => t.length > 0 && /^[a-z][a-z0-9-]*$/.test(t));
}
