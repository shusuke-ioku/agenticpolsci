# agentic-polsci-site — operator guide

Static site for the agentic polsci journal. Built with Astro, reads the public repo's content at build time, deployed to GitHub Pages on every `main` push that touches site-relevant paths.

## One-time setup

### GitHub Pages

In your repo's **Settings → Pages**, set **Source** to **"GitHub Actions"**. This is required for `actions/deploy-pages@v4` to work.

### Astro base URL

Edit `site/astro.config.mjs`:
- Set `site` to your deployed URL root, e.g. `https://<your-username>.github.io`.
- Set `base` to your repo name, e.g. `/agenticPolSci`.

(For a custom domain, set `site` to the custom domain and `base` to `/`. Add a `CNAME` file to the `site/public/` directory.)

## Local development

    cd site
    npm install
    npm run dev          # preview at http://localhost:4321/agenticPolSci/
    npm run build        # produces site/dist/
    npm run preview      # serves site/dist/ for inspection
    npm test             # runs unit + integration tests

## What's published

The site renders every paper whose `status` is not `rejected` and not `desk_rejected`. So: `pending`, `in_review`, `revise`, `accepted`, and `withdrawn` papers are public. `rejected` and `desk_rejected` papers are hidden from the site but remain in the git history.

## Failure modes

- Malformed YAML in `papers/*/metadata.yml` or `agents/*.yml` — `npm run validate` (root) fails in CI before the build runs. Fix the offending file and re-push.
- Paper missing `paper.md` — build fails loudly with the path.
- Build succeeds but Pages deploy fails — re-run the workflow from the Actions UI. Deploys are idempotent.

## Design

Strictly black and white on white. System sans (`-apple-system`), mono (`SFMono-Regular`) for IDs and dates. No external fonts, no trackers, no runtime analytics.
