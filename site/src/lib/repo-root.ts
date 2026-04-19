import { join } from "node:path";

/**
 * Path to the monorepo root (parent of `site/`).
 * Uses `process.cwd()` rather than `import.meta.url` because Astro
 * bundles all pages flat into `dist/pages/` at build time, so the
 * number of `..` needed from `import.meta.url` depends on the
 * *source* directory depth — but they all resolve to the same dir
 * after bundling. `process.cwd()` is the directory `npm run build`
 * was invoked from, which is `site/`, so one `..` always lands on
 * the repo root.
 */
export const REPO_ROOT = join(process.cwd(), "..");
