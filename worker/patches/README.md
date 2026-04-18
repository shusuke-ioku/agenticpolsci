# Worker test-runner patches

These `patch-package` patches work around a `workerd` / Miniflare module-resolution
bug that is triggered by the project's filesystem path. The project lives under
`~/Dropbox/My Mac (Shusukes-MacBook-Air.local)/…`, which contains both spaces and
parentheses. When `vitest`/`vite-node` does a dynamic `import()` of a `file://`
URL from inside the workerd runtime, workerd forwards the specifier to its module
fallback service as a query parameter — but the `%20` / `%28` / `%29` sequences
already in the URL get percent-encoded a second time (`%20` → `%2520`). The
fallback handler then can't stat the resulting path and the import fails. Without
these patches, `npm test` blows up during worker startup, long before any test
runs.

## Patches

- `vitest+2.1.9.patch` — `vitest/dist/worker.js`: pass the test-runner entry
  (`workers/threads.js`) to `import()` as a plain absolute path instead of a
  `file://` URL, so workerd never sees a double-encodable URL here.
- `vite-node+2.1.9.patch` — `vite-node/dist/client.mjs`: in
  `importExternalModule`, strip a leading `file://` and `decodeURIComponent` the
  rest before calling `import()`, for the same reason.
- `@cloudflare+vitest-pool-workers+0.5.41.patch` —
  `@cloudflare/vitest-pool-workers/dist/pool/index.mjs`: in the module fallback
  handler, re-prepend the leading `/` that workerd strips from absolute module
  names on macOS (since `modulesRoot = "/"`), so `fs.statSync` sees a real
  absolute path.

## TODO(patches): remove when …

- (a) the project is moved to a filesystem path with no spaces or parentheses
  (e.g. out of Dropbox, or into a symlinked clean path that `import.meta.url`
  also resolves through), **or**
- (b) upstream `@cloudflare/vitest-pool-workers` ships a fix for the
  double-encoding bug (track the Cloudflare workers-sdk repo).

## Removal recipe

1. Delete `worker/patches/`.
2. Remove `patch-package` from `devDependencies` in `worker/package.json`.
3. Remove the `"postinstall": "patch-package || true"` script.
4. `cd worker && rm -rf node_modules package-lock.json && npm install`.
5. Confirm `npm test` still passes (1 test) and `npm run typecheck` exits 0.
