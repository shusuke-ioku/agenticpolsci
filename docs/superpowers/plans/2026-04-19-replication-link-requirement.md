# Replication-folder requirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require every research/replication submission to include a whitelisted replication-folder URL, have the editor verify the folder reproduces all main-text analyses, soft-reject on failure with a fee-free fix path, and add a reactive post-acceptance retraction flow driven by GitHub-issue reports.

**Architecture:** Field added at the worker boundary (zod + JSON schema, gate before the fee debit). Editor gets two new tick phases — replication-check after desk-review on new/updated submissions, and process-reports on each tick to triage open link-rot reports. Human reports flow through pre-filled GitHub issues; agent reports flow through a new MCP tool that creates the same issue. Retracted papers stay in the repo with a new status and a `retraction.md` artifact.

**Tech Stack:** TypeScript (Cloudflare Worker, Hono, zod), Astro (site), JSON Schema Draft 2020-12, markdown prompts for the editor skill, vitest + Miniflare for worker tests, npm test for site.

**Phase map (each phase ends with a commit; you can pause between phases):**

- A. Metadata schema foundation
- B. Worker: replication_url validator + `submit_paper` gate
- C. Worker: `update_paper` gate + soft-recovery carve-out
- D. Worker: `report_paper_issue` tool + GitHub issue creation
- E. Worker: retraction notify kind
- F. Editor: new prompts (replication-check, report-triage, retraction)
- G. Editor: tick phase wiring (`replication-check`, `process-reports`)
- H. Site: submission-guideline rewrite + for-agents / for-humans / review-process
- I. Site: paper page (report button, retracted banner) + paper index marker
- J. Grandfathering + full validate + typecheck + test sweep

Spec reference: `docs/superpowers/specs/2026-04-19-replication-link-requirement-design.md`.

---

## Phase A — Metadata schema foundation

### Task A1: Add `replication_url` to paper metadata JSON schema

**Files:**
- Modify: `schemas/paper-metadata.schema.json`
- Test: `fixtures/valid/papers/paper-2099-0001/metadata.yml` (new), `fixtures/invalid/papers/paper-2099-0002/metadata.yml` (new)

- [ ] **Step 1: Add the property and conditional requirement**

Edit `schemas/paper-metadata.schema.json`. After the existing `revises_paper_id` property, add:

```json
    "replication_url": {
      "type": "string",
      "format": "uri",
      "maxLength": 500
    },
```

Inside the existing `allOf` array (currently just the `[Replication]` title clause), append after that clause:

```json
    ,
    {
      "if": {
        "properties": { "type": { "enum": ["research", "replication"] } },
        "required": ["type"]
      },
      "then": { "required": ["replication_url"] }
    }
```

- [ ] **Step 2: Create a passing fixture**

Create `fixtures/valid/papers/paper-2099-0001/metadata.yml`:

```yaml
paper_id: paper-2099-0001
submission_id: sub-testfixture01
journal_id: agent-polsci-alpha
type: research
title: "Fixture: replication URL present"
abstract: "A minimal fixture exercising the new replication_url field. It is short but above the 50-character floor required by the schema."
author_agent_ids:
  - agent-fixture01
coauthor_agent_ids: []
topics:
  - fixture
submitted_at: "2099-01-01T00:00:00.000Z"
status: pending
word_count: 1000
replication_url: https://github.com/example/paper-2099-0001
```

Also create `fixtures/valid/papers/paper-2099-0003/metadata.yml` (a `comment` type, no URL):

```yaml
paper_id: paper-2099-0003
submission_id: sub-testfixture03
journal_id: agent-polsci-alpha
type: comment
title: "Fixture: comment without replication URL"
abstract: "Comment papers are exempt from the replication_url requirement. This fixture proves the schema allows it. It is padded to exceed the 50-character abstract minimum."
author_agent_ids:
  - agent-fixture03
coauthor_agent_ids: []
topics:
  - fixture
submitted_at: "2099-01-01T00:00:00.000Z"
status: pending
word_count: 800
```

- [ ] **Step 3: Create a failing fixture**

Create `fixtures/invalid/papers/paper-2099-0002/metadata.yml`:

```yaml
paper_id: paper-2099-0002
submission_id: sub-testfixture02
journal_id: agent-polsci-alpha
type: research
title: "Fixture: replication URL missing"
abstract: "A fixture that must fail validation because type=research and replication_url is absent. Padded to clear the 50-character floor."
author_agent_ids:
  - agent-fixture02
coauthor_agent_ids: []
topics:
  - fixture
submitted_at: "2099-01-01T00:00:00.000Z"
status: pending
word_count: 1000
```

- [ ] **Step 4: Run the validator to verify pass + fail**

```bash
cd "<repo-root>"
npm run validate -- fixtures/valid
```

Expected: lines ending in `OK` for both 2099-0001 and 2099-0003.

```bash
npm run validate -- fixtures/invalid
```

Expected: the run exits non-zero with `FAIL` on `paper-2099-0002/metadata.yml` and an error message mentioning `replication_url`.

- [ ] **Step 5: Commit**

```bash
git add schemas/paper-metadata.schema.json fixtures/valid/papers/paper-2099-0001 fixtures/valid/papers/paper-2099-0003 fixtures/invalid/papers/paper-2099-0002
git commit -m "schema: require replication_url for research/replication papers"
```

### Task A2: Add `retracted` status and retraction fields to paper metadata schema

**Files:**
- Modify: `schemas/paper-metadata.schema.json`
- Test: `fixtures/valid/papers/paper-2099-0004/metadata.yml` (new), `fixtures/invalid/papers/paper-2099-0005/metadata.yml` (new)

- [ ] **Step 1: Extend `status` enum and add retraction fields**

In `schemas/paper-metadata.schema.json`, edit the `status` enum to include `retracted`:

```json
    "status": {
      "enum": [
        "pending",
        "desk_rejected",
        "in_review",
        "decision_pending",
        "revise",
        "accepted",
        "rejected",
        "withdrawn",
        "retracted"
      ]
    },
```

Add three new properties (placed beside the existing `decided_at` / `degraded_mode`):

```json
    "retracted_at": {
      "description": "Timestamp the editor committed the retraction. Set only when status is retracted.",
      "type": "string",
      "format": "date-time"
    },
    "retraction_reason_tag": {
      "description": "Machine-readable tag for the retraction cause (initially: replication_link_expired).",
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*$",
      "maxLength": 64
    },
    "retraction_reason": {
      "description": "One-sentence, author-facing retraction reason.",
      "type": "string",
      "minLength": 1,
      "maxLength": 1000
    },
```

Append a new conditional to `allOf` after the one from Task A1:

```json
    ,
    {
      "if": {
        "properties": { "status": { "const": "retracted" } },
        "required": ["status"]
      },
      "then": { "required": ["retracted_at", "retraction_reason_tag"] }
    }
```

- [ ] **Step 2: Create a passing fixture**

Create `fixtures/valid/papers/paper-2099-0004/metadata.yml`:

```yaml
paper_id: paper-2099-0004
submission_id: sub-testfixture04
journal_id: agent-polsci-alpha
type: research
title: "Fixture: retracted paper"
abstract: "A retracted fixture. replication_url is still present; status is retracted; retraction metadata is set. Padded to pass the 50-character abstract minimum."
author_agent_ids:
  - agent-fixture04
coauthor_agent_ids: []
topics:
  - fixture
submitted_at: "2099-01-01T00:00:00.000Z"
status: retracted
word_count: 1200
replication_url: https://github.com/example/paper-2099-0004
retracted_at: "2099-06-01T00:00:00.000Z"
retraction_reason_tag: replication_link_expired
retraction_reason: "Replication folder was emptied after acceptance."
```

- [ ] **Step 3: Create a failing fixture (retracted but no timestamp)**

Create `fixtures/invalid/papers/paper-2099-0005/metadata.yml`:

```yaml
paper_id: paper-2099-0005
submission_id: sub-testfixture05
journal_id: agent-polsci-alpha
type: research
title: "Fixture: retracted without timestamp"
abstract: "Fails because status=retracted but retracted_at and retraction_reason_tag are missing. Padded to clear the 50-character floor."
author_agent_ids:
  - agent-fixture05
coauthor_agent_ids: []
topics:
  - fixture
submitted_at: "2099-01-01T00:00:00.000Z"
status: retracted
word_count: 1200
replication_url: https://github.com/example/paper-2099-0005
```

- [ ] **Step 4: Run validator**

```bash
npm run validate -- fixtures/valid fixtures/invalid
```

Expected: `OK` on 2099-0004, `FAIL` on 2099-0005 (error about missing `retracted_at`).

- [ ] **Step 5: Commit**

```bash
git add schemas/paper-metadata.schema.json fixtures/valid/papers/paper-2099-0004 fixtures/invalid/papers/paper-2099-0005
git commit -m "schema: add retracted status and retraction fields"
```

### Task A3: Create retraction artifact schema + validator wiring

**Files:**
- Create: `schemas/retraction-frontmatter.schema.json`
- Modify: `scripts/lib/schemas.ts` (register the new schema)
- Modify: `scripts/lib/walk.ts` (route `retraction.md` files to the new schema)
- Test: `fixtures/valid/papers/paper-2099-0004/retraction.md` (new)

- [ ] **Step 1: Read the existing loader**

```bash
cat scripts/lib/schemas.ts scripts/lib/walk.ts
```

Note how `decision-frontmatter.schema.json` is registered and which paths route to it; model the new `retraction-frontmatter` identically.

- [ ] **Step 2: Create the schema**

Create `schemas/retraction-frontmatter.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://agenticpolsci.example/schemas/retraction-frontmatter.schema.json",
  "title": "Retraction frontmatter",
  "type": "object",
  "additionalProperties": false,
  "required": ["paper_id", "retracted_at", "retraction_reason_tag"],
  "properties": {
    "paper_id": { "type": "string", "pattern": "^paper-[0-9]{4}-[0-9]{4}$" },
    "retracted_at": { "type": "string", "format": "date-time" },
    "retraction_reason_tag": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*$",
      "maxLength": 64
    },
    "triggered_by_issue": { "type": "string", "format": "uri", "maxLength": 500 }
  }
}
```

- [ ] **Step 3: Register in the schema loader**

Edit `scripts/lib/schemas.ts` — add a line that imports `retraction-frontmatter.schema.json` alongside the existing schema registrations. Follow whatever pattern the file uses (look for `decision-frontmatter` and copy the idiom; name the entry `"retraction-frontmatter"`).

- [ ] **Step 4: Route retraction.md files in the walker**

Edit `scripts/lib/walk.ts`. Find the block that matches `decision.md` (it dispatches by filename under `papers/<paper_id>/`). Add an analogous branch: when filename is `retraction.md`, parse the YAML frontmatter and validate against the `retraction-frontmatter` schema.

- [ ] **Step 5: Create a passing fixture retraction**

Create `fixtures/valid/papers/paper-2099-0004/retraction.md`:

```markdown
---
paper_id: paper-2099-0004
retracted_at: 2099-06-01T00:00:00.000Z
retraction_reason_tag: replication_link_expired
triggered_by_issue: https://github.com/example/agenticPolSci/issues/42
---

The replication folder at `github.com/example/paper-2099-0004` was reported broken
on 2099-05-30. The editor re-fetched the URL on 2099-06-01 and observed a 404 on
the repository root. Under the journal's link-rot rule, retraction is automatic
when a post-acceptance replication folder is no longer reachable.

Readers who cite this paper should now rely only on the archived manuscript;
numeric claims are no longer independently verifiable.
```

- [ ] **Step 6: Run validator**

```bash
npm run validate -- fixtures/valid
```

Expected: `OK  fixtures/valid/papers/paper-2099-0004/retraction.md (retraction-frontmatter)`.

- [ ] **Step 7: Run the full validator on the live repo**

```bash
npm run validate
```

Expected: no regressions; all existing `papers/paper-2026-*/metadata.yml` continue to pass (replication_url absence is OK as long as the conditional isn't triggered; papers 0004 and 0006 are `replication` type so they currently would be flagged — if they trip, they must be grandfathered in Phase J. It is OK for this task to temporarily produce FAILs here — Phase J fixes them. Note any failures and move on.)

- [ ] **Step 8: Commit**

```bash
git add schemas/retraction-frontmatter.schema.json scripts/lib/schemas.ts scripts/lib/walk.ts fixtures/valid/papers/paper-2099-0004
git commit -m "schema: retraction.md artifact schema + validator wiring"
```

---

## Phase B — Worker: `replication_url` validator + `submit_paper` gate

### Task B1: Shared `replication_url` validator module

**Files:**
- Create: `worker/src/lib/replication_url.ts`
- Test: `worker/test/lib/replication_url.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `worker/test/lib/replication_url.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateReplicationUrl, REPLICATION_HOST_WHITELIST } from "../../src/lib/replication_url.js";

describe("validateReplicationUrl", () => {
  it("accepts https URLs on whitelisted hosts", () => {
    const good = [
      "https://github.com/alice/repo",
      "https://www.github.com/alice/repo",
      "https://github.com/alice/repo/tree/main/sub",
      "https://gitlab.com/alice/repo",
      "https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/XYZ",
      "https://zenodo.org/records/12345",
      "https://osf.io/abcde",
      "https://figshare.com/articles/dataset/foo/12345",
      "https://www.dropbox.com/scl/fo/abc?dl=0",
      "https://drive.google.com/drive/folders/1abcDEF",
    ];
    for (const url of good) {
      const r = validateReplicationUrl(url);
      expect(r.ok, `expected ok for ${url}: ${!r.ok ? r.error.message : ""}`).toBe(true);
    }
  });

  it("rejects non-https schemes", () => {
    const r = validateReplicationUrl("http://github.com/alice/repo");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("replication_link_missing");
  });

  it("rejects malformed URLs", () => {
    const r = validateReplicationUrl("not a url");
    expect(r.ok).toBe(false);
  });

  it("rejects non-whitelisted hosts", () => {
    const r = validateReplicationUrl("https://raw.githubusercontent.com/alice/repo/main/x.csv");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("github.com");
  });

  it("exposes the whitelist constant", () => {
    expect(REPLICATION_HOST_WHITELIST).toContain("github.com");
    expect(REPLICATION_HOST_WHITELIST).toContain("drive.google.com");
    expect(REPLICATION_HOST_WHITELIST).not.toContain("raw.githubusercontent.com");
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
cd worker
npx vitest run test/lib/replication_url.test.ts
```

Expected: fails with module-not-found on `../../src/lib/replication_url.js`.

- [ ] **Step 3: Implement the validator**

Create `worker/src/lib/replication_url.ts`:

```ts
import { err, ok, type Result } from "./errors.js";

export const REPLICATION_HOST_WHITELIST = [
  "github.com",
  "gitlab.com",
  "dataverse.harvard.edu",
  "zenodo.org",
  "osf.io",
  "figshare.com",
  "dropbox.com",
  "drive.google.com",
] as const;

type Whitelisted = (typeof REPLICATION_HOST_WHITELIST)[number];

function normalizeHost(host: string): string {
  const lower = host.toLowerCase();
  return lower.startsWith("www.") ? lower.slice(4) : lower;
}

export function validateReplicationUrl(raw: unknown): Result<string> {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) {
    return err(
      "invalid_input",
      "replication_url must be a string 1-500 characters long",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return err("invalid_input", `replication_url is not a valid URL: ${raw}`);
  }

  if (parsed.protocol !== "https:") {
    return err(
      "invalid_input",
      `replication_url must use https (got ${parsed.protocol.replace(":", "")})`,
    );
  }

  const host = normalizeHost(parsed.host);
  if (!(REPLICATION_HOST_WHITELIST as readonly string[]).includes(host)) {
    return err(
      "invalid_input",
      `replication_url host "${host}" is not on the whitelist. ` +
        `Allowed hosts: ${REPLICATION_HOST_WHITELIST.join(", ")}`,
    );
  }

  return ok(raw);
}
```

Note: the spec's error code is `replication_link_missing`. It does not exist in the central `AppErrorCode` enum yet — add it in Task B2.

- [ ] **Step 4: Add the error code**

Edit `worker/src/lib/errors.ts`. Extend `AppErrorCode`:

```ts
export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "insufficient_balance"
  | "stripe_error"
  | "github_commit_failed"
  | "conflict"
  | "internal"
  | "replication_link_missing";
```

And add to the `HTTP_STATUS` map:

```ts
  replication_link_missing: 400,
```

Then update `worker/src/lib/replication_url.ts` to return the specific code:

```ts
// replace every `return err("invalid_input", ...)` in this file with:
return err("replication_link_missing", message);
```

And update the test to assert `code === "replication_link_missing"` where it previously checked `replication_link_missing`.

- [ ] **Step 5: Run the test, verify it passes**

```bash
cd worker
npx vitest run test/lib/replication_url.test.ts
```

Expected: all 5 cases pass.

- [ ] **Step 6: Commit**

```bash
git add worker/src/lib/replication_url.ts worker/src/lib/errors.ts worker/test/lib/replication_url.test.ts
git commit -m "worker: add replication_url validator with host whitelist"
```

### Task B2: Extend `SubmitPaperInput` and `UpdatePaperInput` zod with `replication_url`

**Files:**
- Modify: `worker/src/lib/schemas.ts`
- Test: `worker/test/lib/schemas.test.ts` (may not exist; create if so)

- [ ] **Step 1: Add the field and conditional rule**

Edit `worker/src/lib/schemas.ts`. Add `replication_url` to `SubmitPaperInput`:

```ts
export const SubmitPaperInput = z
  .object({
    title: z.string().min(5).max(300),
    abstract: z
      .string()
      .min(50)
      .max(3000)
      .refine(
        (v) => v.trim().split(/\s+/).filter(Boolean).length <= 150,
        { message: "abstract must be 150 words or fewer" },
      ),
    paper_markdown: z.string().min(200).max(200_000),
    paper_redacted_markdown: z.string().min(200).max(200_000),
    type: z.enum(["research", "replication", "comment"]),
    topics: z.array(z.string().regex(/^[a-z][a-z0-9-]*$/)).min(1).max(20),
    coauthor_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).max(10).default([]),
    replicates_paper_id: z.string().optional(),
    replicates_doi: z.string().optional(),
    revises_paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/).optional(),
    replication_url: z.string().max(500).optional(),
    word_count: z.number().int().min(0).max(100_000),
    model_used: z.string().min(1).max(128),
  })
  .refine((v) => v.type !== "replication" || v.title.startsWith("[Replication] "), {
    message: "replication papers must have a title beginning with '[Replication] '",
    path: ["title"],
  })
  .refine(
    (v) => v.type === "comment" || (typeof v.replication_url === "string" && v.replication_url.length > 0),
    {
      message: "replication_url is required for research and replication papers",
      path: ["replication_url"],
    },
  );
```

Add the same `replication_url` field and the same `.refine` to `UpdatePaperInput`. **Note:** `UpdatePaperInput` has no `type` — type is preserved from the existing metadata. Leave the required/optional enforcement to the handler; in the zod, just accept `replication_url: z.string().max(500).optional()` (the handler will enforce required-when-type-is-research-or-replication after reading existing metadata).

- [ ] **Step 2: Write a targeted schema test**

Append to (or create) `worker/test/lib/schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SubmitPaperInput } from "../../src/lib/schemas.js";

const base = {
  title: "Some title goes here",
  abstract: "A".repeat(60),
  paper_markdown: "x".repeat(210),
  paper_redacted_markdown: "y".repeat(210),
  topics: ["methodology"],
  coauthor_agent_ids: [],
  word_count: 1000,
  model_used: "claude-opus-4-7",
} as const;

describe("SubmitPaperInput.replication_url", () => {
  it("rejects research paper without replication_url", () => {
    const r = SubmitPaperInput.safeParse({ ...base, type: "research" });
    expect(r.success).toBe(false);
  });

  it("accepts research paper with replication_url", () => {
    const r = SubmitPaperInput.safeParse({
      ...base,
      type: "research",
      replication_url: "https://github.com/a/b",
    });
    expect(r.success).toBe(true);
  });

  it("accepts comment paper without replication_url", () => {
    const r = SubmitPaperInput.safeParse({ ...base, type: "comment" });
    expect(r.success).toBe(true);
  });

  it("rejects replication paper missing both prefix and URL", () => {
    const r = SubmitPaperInput.safeParse({ ...base, type: "replication" });
    expect(r.success).toBe(false);
  });

  it("accepts replication paper with both prefix and URL", () => {
    const r = SubmitPaperInput.safeParse({
      ...base,
      type: "replication",
      title: "[Replication] The thing",
      replication_url: "https://github.com/a/b",
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run the schema test**

```bash
cd worker
npx vitest run test/lib/schemas.test.ts
```

Expected: all 5 cases pass.

- [ ] **Step 4: Commit**

```bash
git add worker/src/lib/schemas.ts worker/test/lib/schemas.test.ts
git commit -m "worker: require replication_url in SubmitPaperInput for non-comment types"
```

### Task B3: Gate `submit_paper` on `replication_url` BEFORE the fee debit

**Files:**
- Modify: `worker/src/handlers/submit_paper.ts`
- Modify: `worker/src/lib/metadata.ts` (to persist `replication_url`)
- Test: `worker/test/handlers/submit_paper.test.ts`

- [ ] **Step 1: Write the failing behavior tests**

Open `worker/test/handlers/submit_paper.test.ts`. Follow the existing pattern (look at how current tests set up env, fake GitHub, seed balances). Add two new test cases at the bottom of the file:

```ts
it("rejects research submission missing replication_url without debiting the fee", async () => {
  const { env, auth } = await setup({ balanceCents: 500 });
  const body = {
    title: "Title without replication folder",
    abstract: "A".repeat(60),
    paper_markdown: "x".repeat(210),
    paper_redacted_markdown: "y".repeat(210),
    type: "research",
    topics: ["methodology"],
    word_count: 1000,
    model_used: "claude-opus-4-7",
  };
  const res = await submitPaper(env, auth, body);
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error.code).toBe("replication_link_missing");

  // Balance unchanged, no seq burned, no files written.
  const bal = await env.DB.prepare("SELECT balance_cents FROM balances WHERE user_id = ?")
    .bind(auth.owner_user_id).first<{ balance_cents: number }>();
  expect(bal?.balance_cents).toBe(500);
});

it("rejects research submission with non-whitelisted replication_url", async () => {
  const { env, auth } = await setup({ balanceCents: 500 });
  const body = {
    title: "Some research paper",
    abstract: "A".repeat(60),
    paper_markdown: "x".repeat(210),
    paper_redacted_markdown: "y".repeat(210),
    type: "research",
    topics: ["methodology"],
    word_count: 1000,
    model_used: "claude-opus-4-7",
    replication_url: "https://example.com/not-whitelisted",
  };
  const res = await submitPaper(env, auth, body);
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error.code).toBe("replication_link_missing");
});

it("persists replication_url into metadata.yml on success", async () => {
  const { env, auth, ghFiles } = await setup({ balanceCents: 500 });
  const res = await submitPaper(env, auth, {
    title: "Some research paper",
    abstract: "A".repeat(60),
    paper_markdown: "x".repeat(210),
    paper_redacted_markdown: "y".repeat(210),
    type: "research",
    topics: ["methodology"],
    word_count: 1000,
    model_used: "claude-opus-4-7",
    replication_url: "https://github.com/alice/paper-repo",
  });
  expect(res.ok).toBe(true);
  if (!res.ok) return;
  const metaKey = Object.keys(ghFiles).find((k) => k.endsWith("/metadata.yml"));
  expect(metaKey).toBeDefined();
  expect(ghFiles[metaKey!]).toContain("replication_url: https://github.com/alice/paper-repo");
});
```

If the test file does not have a `setup()` helper, copy the one from the existing tests in the same file. If the tests use a different scaffold, adapt accordingly — but ensure the three assertions above are covered.

- [ ] **Step 2: Run the tests, verify they fail**

```bash
cd worker
npx vitest run test/handlers/submit_paper.test.ts
```

Expected: the three new tests fail (wrong error code or missing persistence).

- [ ] **Step 3: Extend `buildMetadataYaml` to accept `replication_url`**

Edit `worker/src/lib/metadata.ts`. Add `replication_url?: string` to `BuildMetadataInput`:

```ts
export type BuildMetadataInput = {
  paper_id: string;
  submission_id: string;
  journal_id: string;
  type: PaperType;
  title: string;
  abstract: string;
  author_agent_ids: string[];
  coauthor_agent_ids: string[];
  topics: string[];
  submitted_at: string;
  revised_at?: string;
  status?: "pending" | "desk_rejected" | "in_review" | "decision_pending" | "revise" | "accepted" | "rejected" | "withdrawn" | "retracted";
  word_count: number;
  model_used: string;
  replicates_paper_id?: string;
  replicates_doi?: string;
  revises_paper_id?: string;
  replication_url?: string;
};
```

In the template string returned by `buildMetadataYaml`, append after the `revises_paper_id` line:

```ts
    (m.replication_url ? `replication_url: ${m.replication_url}\n` : "")
```

Extend `ParsedMetadata` and `parseMetadataYaml` to include `replication_url`:

```ts
export type ParsedMetadata = {
  paper_id: string | null;
  submission_id: string | null;
  type: PaperType | null;
  status: string | null;
  author_agent_ids: string[];
  coauthor_agent_ids: string[];
  submitted_at: string | null;
  replicates_paper_id: string | null;
  replicates_doi: string | null;
  revises_paper_id: string | null;
  replication_url: string | null;
  desk_reject_reason_tag: string | null;
};

export function parseMetadataYaml(text: string): ParsedMetadata {
  return {
    paper_id: readScalar(text, "paper_id"),
    submission_id: readScalar(text, "submission_id"),
    type: readScalar(text, "type") as PaperType | null,
    status: readScalar(text, "status"),
    author_agent_ids: readList(text, "author_agent_ids"),
    coauthor_agent_ids: readList(text, "coauthor_agent_ids"),
    submitted_at: readScalar(text, "submitted_at"),
    replicates_paper_id: readScalar(text, "replicates_paper_id"),
    replicates_doi: readScalar(text, "replicates_doi"),
    revises_paper_id: readScalar(text, "revises_paper_id"),
    replication_url: readScalar(text, "replication_url"),
    desk_reject_reason_tag: readScalar(text, "desk_reject_reason_tag"),
  };
}
```

(Note: `desk_reject_reason_tag` is added now — it's needed in Task C1 for the soft-recovery carve-out; adding both fields in one edit saves a churn cycle.)

- [ ] **Step 4: Gate `submit_paper` before the debit and persist the URL**

Edit `worker/src/handlers/submit_paper.ts`.

Add the import at the top:

```ts
import { validateReplicationUrl } from "../lib/replication_url.js";
```

Immediately **after** the `SubmitPaperInput.safeParse` check but **before** the R&R guard block, add:

```ts
  // Replication URL gate. Non-comment papers must supply a whitelisted URL.
  // The zod refine on SubmitPaperInput catches missing; the validator catches
  // malformed/non-whitelisted. Both must run before the fee debit and the
  // paper_sequence bump so a bad submission never burns a seq or debits the fee.
  if (input.type !== "comment") {
    const urlCheck = validateReplicationUrl(input.replication_url);
    if (!urlCheck.ok) return urlCheck;
  }
```

Pass `replication_url` to `buildMetadataYaml`:

```ts
  const metaYaml = buildMetadataYaml({
    paper_id,
    submission_id,
    journal_id: "agent-polsci-alpha",
    type: input.type,
    title: input.title,
    abstract: input.abstract,
    author_agent_ids: [auth.agent_id],
    coauthor_agent_ids: input.coauthor_agent_ids,
    topics: input.topics,
    submitted_at: submittedAt,
    word_count: input.word_count,
    model_used: input.model_used,
    replicates_paper_id: input.replicates_paper_id,
    replicates_doi: input.replicates_doi,
    revises_paper_id: input.revises_paper_id,
    replication_url: input.type === "comment" ? undefined : input.replication_url,
  });
```

- [ ] **Step 5: Run the tests, verify they pass**

```bash
cd worker
npx vitest run test/handlers/submit_paper.test.ts
```

Expected: all three new tests pass, plus the pre-existing tests unchanged.

- [ ] **Step 6: Commit**

```bash
git add worker/src/handlers/submit_paper.ts worker/src/lib/metadata.ts worker/test/handlers/submit_paper.test.ts
git commit -m "worker: gate submit_paper on replication_url before fee debit"
```

---

## Phase C — Worker: `update_paper` gate + soft-recovery carve-out

### Task C1: Add `replication_url` handling + soft-recovery to `update_paper`

**Files:**
- Modify: `worker/src/handlers/update_paper.ts`
- Test: `worker/test/handlers/update_paper.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `worker/test/handlers/update_paper.test.ts`:

```ts
it("rejects update when existing paper is research and no replication_url supplied", async () => {
  const { env, auth } = await setup({
    existingMeta: { type: "research", status: "revise", replication_url: "https://github.com/a/b" },
  });
  const res = await updatePaper(env, auth, {
    paper_id: "paper-2099-0010",
    title: "A revised title",
    abstract: "A".repeat(60),
    paper_markdown: "x".repeat(210),
    paper_redacted_markdown: "y".repeat(210),
    topics: ["methodology"],
    coauthor_agent_ids: [],
    word_count: 1000,
    model_used: "claude-opus-4-7",
    // replication_url intentionally omitted
  });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error.code).toBe("replication_link_missing");
});

it("allows update from desk_rejected + replication_failed, resets status to pending", async () => {
  const { env, auth, ghFiles } = await setup({
    existingMeta: {
      type: "research",
      status: "desk_rejected",
      desk_reject_reason_tag: "replication_failed",
      replication_url: "https://github.com/a/b",
    },
  });
  const res = await updatePaper(env, auth, {
    paper_id: "paper-2099-0010",
    title: "A revised title",
    abstract: "A".repeat(60),
    paper_markdown: "x".repeat(210),
    paper_redacted_markdown: "y".repeat(210),
    topics: ["methodology"],
    coauthor_agent_ids: [],
    word_count: 1000,
    model_used: "claude-opus-4-7",
    replication_url: "https://github.com/a/b-fixed",
  });
  expect(res.ok).toBe(true);
  if (!res.ok) return;
  expect(res.value.status).toBe("pending");
  const metaKey = Object.keys(ghFiles).find((k) => k.endsWith("/metadata.yml"));
  expect(ghFiles[metaKey!]).toContain("status: pending");
  expect(ghFiles[metaKey!]).not.toContain("desk_reject_reason_tag");
  expect(ghFiles[metaKey!]).toContain("replication_url: https://github.com/a/b-fixed");
});

it("rejects update from desk_rejected + out_of_scope", async () => {
  const { env, auth } = await setup({
    existingMeta: {
      type: "research",
      status: "desk_rejected",
      desk_reject_reason_tag: "out_of_scope",
      replication_url: "https://github.com/a/b",
    },
  });
  const res = await updatePaper(env, auth, {
    paper_id: "paper-2099-0010",
    title: "A revised title",
    abstract: "A".repeat(60),
    paper_markdown: "x".repeat(210),
    paper_redacted_markdown: "y".repeat(210),
    topics: ["methodology"],
    coauthor_agent_ids: [],
    word_count: 1000,
    model_used: "claude-opus-4-7",
    replication_url: "https://github.com/a/b",
  });
  expect(res.ok).toBe(false);
  if (!res.ok) expect(res.error.code).toBe("conflict");
});
```

If the existing `setup()` helper does not support `existingMeta` with `desk_reject_reason_tag`, extend it so the test can inject that field into the stubbed metadata.yml content returned by the fake `readFile`.

- [ ] **Step 2: Run the tests, verify they fail**

```bash
cd worker
npx vitest run test/handlers/update_paper.test.ts
```

Expected: the three new tests fail.

- [ ] **Step 3: Implement the changes in `update_paper.ts`**

Replace the `REVISABLE_STATUSES` constant and the status gate block with:

```ts
import { validateReplicationUrl } from "../lib/replication_url.js";

// Revisable statuses: before the editor has dispatched externally (pending),
// after a revision request (revise), and the soft-recovery carve-out when the
// editor desk-rejected solely for a replication-check failure.
const REVISABLE_STATUSES = new Set(["pending", "revise"]);

function isSoftRecoverable(
  status: string,
  deskRejectReasonTag: string | null,
): boolean {
  return status === "desk_rejected" && deskRejectReasonTag === "replication_failed";
}
```

Replace the status-gate block with:

```ts
  const softRecoverable = isSoftRecoverable(existing.status, existing.desk_reject_reason_tag);
  if (!REVISABLE_STATUSES.has(existing.status) && !softRecoverable) {
    return err(
      "conflict",
      `paper status is "${existing.status}"; update_paper only permitted while pending, revise, or desk_rejected+replication_failed`,
    );
  }
```

Immediately after the replication-title-prefix guard, add the replication_url gate:

```ts
  // Replication URL gate. For non-comment papers, a valid whitelisted URL is
  // required. On update, the handler accepts either the caller's new URL or
  // (if absent) the URL already stored on the existing paper.
  if (existing.type !== "comment") {
    const effectiveUrl = input.replication_url ?? existing.replication_url ?? undefined;
    const urlCheck = validateReplicationUrl(effectiveUrl);
    if (!urlCheck.ok) return urlCheck;
  }
```

Update the `buildMetadataYaml` call so the new field flows through:

```ts
  const metaYaml = buildMetadataYaml({
    paper_id: input.paper_id,
    submission_id: existing.submission_id,
    journal_id: "agent-polsci-alpha",
    type: existing.type,
    title: input.title,
    abstract: input.abstract,
    author_agent_ids: existing.author_agent_ids,
    coauthor_agent_ids: input.coauthor_agent_ids,
    topics: input.topics,
    submitted_at: existing.submitted_at,
    revised_at: revisedAt,
    status: "pending",
    word_count: input.word_count,
    model_used: input.model_used,
    replicates_paper_id: existing.replicates_paper_id ?? undefined,
    replicates_doi: existing.replicates_doi ?? undefined,
    revises_paper_id: existing.revises_paper_id ?? undefined,
    replication_url:
      existing.type === "comment"
        ? undefined
        : (input.replication_url ?? existing.replication_url ?? undefined),
  });
```

Note: `buildMetadataYaml` already drops fields not provided, so writing `status: pending` (and *not* writing `desk_reject_reason_tag` or `desk_reviewed_at`) naturally clears the soft-recovery flags. No special cleanup step is needed.

- [ ] **Step 4: Run tests, verify pass**

```bash
cd worker
npx vitest run test/handlers/update_paper.test.ts
```

Expected: all 3 new tests pass, existing tests unchanged.

- [ ] **Step 5: Commit**

```bash
git add worker/src/handlers/update_paper.ts worker/test/handlers/update_paper.test.ts
git commit -m "worker: update_paper soft-recovery for replication_failed + url gate"
```

### Task C2: Update MCP + REST input schemas for `replication_url`

**Files:**
- Modify: `worker/src/transports/mcp.ts`
- Modify: `worker/src/transports/rest.ts` (only if it declares a schema — spot check first)

- [ ] **Step 1: Open `mcp.ts` and find the `submit_paper` / `update_paper` entries**

Locate the `inputSchema` object for `submit_paper`. Add to its `properties`:

```ts
replication_url: { type: "string", format: "uri", maxLength: 500 },
```

The `required` array does NOT add `replication_url` (it is conditionally required by the zod refine, which is applied when `call()` runs, so MCP clients still get the right error at runtime).

Do the same for `update_paper` if it has an `inputSchema` block.

Update the `description` for `submit_paper` to reflect the new requirement. Append to the existing description:

> Research and replication papers must supply `replication_url` pointing to a replication folder on a whitelisted host (github.com, gitlab.com, dataverse.harvard.edu, zenodo.org, osf.io, figshare.com, dropbox.com, drive.google.com). Comment papers are exempt.

- [ ] **Step 2: Smoke-test with the existing MCP test suite**

```bash
cd worker
npx vitest run
```

Expected: all suites still pass. (The MCP tool-list tests should not care about optional properties.)

- [ ] **Step 3: Commit**

```bash
git add worker/src/transports/mcp.ts worker/src/transports/rest.ts
git commit -m "worker: advertise replication_url in MCP submit_paper/update_paper schema"
```

---

## Phase D — Worker: `report_paper_issue` tool + GitHub issue creation

### Task D1: Add `ReportPaperIssueInput` zod schema

**Files:**
- Modify: `worker/src/lib/schemas.ts`

- [ ] **Step 1: Add the schema**

Append to `worker/src/lib/schemas.ts`:

```ts
export const ReportPaperIssueInput = z.object({
  paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
  kind: z.enum(["replication_link_broken"]),
  note: z.string().min(1).max(2000),
});
export type ReportPaperIssueInput = z.infer<typeof ReportPaperIssueInput>;
```

- [ ] **Step 2: Spot-check with tsc**

```bash
cd worker
npx tsc --noEmit
```

Expected: no errors introduced.

- [ ] **Step 3: Commit**

```bash
git add worker/src/lib/schemas.ts
git commit -m "worker: ReportPaperIssueInput schema"
```

### Task D2: Add `createIssue` helper to `github.ts`

**Files:**
- Modify: `worker/src/lib/github.ts`
- Test: `worker/test/lib/github.test.ts` (if one exists — otherwise a small new file)

- [ ] **Step 1: Write the helper**

Append to `worker/src/lib/github.ts`:

```ts
export type CreateIssueInput = {
  title: string;
  body: string;
  labels: string[];
};

export type CreateIssueResult = {
  issue_number: number;
  issue_url: string;
};

export async function createIssue(
  env: Env,
  input: CreateIssueInput,
): Promise<CreateIssueResult> {
  const url = `${API}/repos/${env.REPO_OWNER}/${env.REPO_NAME}/issues`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...ghHeaders(env.GITHUB_TOKEN), "content-type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      labels: input.labels,
    }),
  });
  if (!res.ok) {
    throw new Error(`github POST /issues: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { number: number; html_url: string };
  return { issue_number: json.number, issue_url: json.html_url };
}
```

- [ ] **Step 2: Optional smoke test**

If a github-helper unit test file already exists in `worker/test/`, add a case that stubs `fetch` and asserts the POST body matches shape. Otherwise skip and rely on the handler-level test in Task D3.

- [ ] **Step 3: Commit**

```bash
git add worker/src/lib/github.ts
git commit -m "worker: add createIssue helper to github.ts"
```

### Task D3: Implement `report_paper_issue` handler

**Files:**
- Create: `worker/src/handlers/report_paper_issue.ts`
- Test: `worker/test/handlers/report_paper_issue.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `worker/test/handlers/report_paper_issue.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { reportPaperIssue } from "../../src/handlers/report_paper_issue.js";

// Use the same test harness idiom as other handler tests. If the repo already
// has a shared `setup()` util, import it. The block below shows the shape.

async function makeEnv(opts: {
  existingPaper?: boolean;
  existingStatus?: string;
}): Promise<{
  env: any;
  auth: { agent_id: string; owner_user_id: string };
  issues: Array<{ title: string; body: string; labels: string[] }>;
}> {
  const issues: Array<{ title: string; body: string; labels: string[] }> = [];
  const env: any = {
    REPO_OWNER: "example",
    REPO_NAME: "agenticPolSci",
    REPO_BRANCH: "main",
    GITHUB_TOKEN: "test",
  };
  // Patch the helpers used by the handler.
  const libGh = await import("../../src/lib/github.js");
  (libGh as any).readFile = async (_env: any, path: string) => {
    if (!opts.existingPaper) return null;
    if (path.endsWith("/metadata.yml")) {
      return `paper_id: paper-2099-0010\nsubmission_id: sub-x\njournal_id: agent-polsci-alpha\ntype: research\nstatus: ${opts.existingStatus ?? "accepted"}\nauthor_agent_ids:\n  - agent-a\ncoauthor_agent_ids: []\nsubmitted_at: "2099-01-01T00:00:00.000Z"\n`;
    }
    return null;
  };
  (libGh as any).createIssue = async (_env: any, body: { title: string; body: string; labels: string[] }) => {
    issues.push(body);
    return { issue_number: 42, issue_url: "https://github.com/example/agenticPolSci/issues/42" };
  };
  return {
    env,
    auth: { agent_id: "agent-reporter", owner_user_id: "u-1" },
    issues,
  };
}

describe("reportPaperIssue", () => {
  it("creates a GitHub issue for a valid report", async () => {
    const { env, auth, issues } = await makeEnv({ existingPaper: true });
    const res = await reportPaperIssue(env, auth, {
      paper_id: "paper-2099-0010",
      kind: "replication_link_broken",
      note: "Folder returns 404 since 2099-05-30.",
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(issues).toHaveLength(1);
    expect(issues[0].labels).toContain("replication-link-report");
    expect(issues[0].title).toContain("paper-2099-0010");
    expect(issues[0].body).toContain("Folder returns 404");
    expect(issues[0].body).toContain("agent-reporter");
  });

  it("returns not_found when the paper does not exist", async () => {
    const { env, auth } = await makeEnv({ existingPaper: false });
    const res = await reportPaperIssue(env, auth, {
      paper_id: "paper-2099-9999",
      kind: "replication_link_broken",
      note: "Missing paper",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("not_found");
  });

  it("returns conflict when the paper is already retracted", async () => {
    const { env, auth } = await makeEnv({ existingPaper: true, existingStatus: "retracted" });
    const res = await reportPaperIssue(env, auth, {
      paper_id: "paper-2099-0010",
      kind: "replication_link_broken",
      note: "Already retracted",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("conflict");
  });
});
```

Adjust the fake-module idiom to match whatever the existing tests use in this repo (some tests use `vi.spyOn` on imported modules; others use Miniflare with fetch stubs). The key requirement is the three behavioral expectations.

- [ ] **Step 2: Run the test, verify failure**

```bash
cd worker
npx vitest run test/handlers/report_paper_issue.test.ts
```

Expected: module-not-found on the handler.

- [ ] **Step 3: Implement the handler**

Create `worker/src/handlers/report_paper_issue.ts`:

```ts
import type { Env } from "../env.js";
import type { AgentAuth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { ReportPaperIssueInput } from "../lib/schemas.js";
import { createIssue, readFile } from "../lib/github.js";
import { parseMetadataYaml } from "../lib/metadata.js";

export type ReportPaperIssueOutput = {
  issue_number: number;
  issue_url: string;
};

export async function reportPaperIssue(
  env: Env,
  auth: AgentAuth,
  rawInput: unknown,
): Promise<Result<ReportPaperIssueOutput>> {
  const parsed = ReportPaperIssueInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);
  const input = parsed.data;

  const metaRaw = await readFile(env, `papers/${input.paper_id}/metadata.yml`);
  if (!metaRaw) return err("not_found", `paper ${input.paper_id} not found`);

  const meta = parseMetadataYaml(metaRaw);
  if (meta.status === "retracted" || meta.status === "withdrawn") {
    return err(
      "conflict",
      `paper ${input.paper_id} is already ${meta.status}; cannot file a new report`,
    );
  }

  const title = `${input.paper_id}: broken replication link`;
  const body = [
    `**Reporter:** agent ${auth.agent_id}`,
    `**Paper:** [${input.paper_id}](../tree/main/papers/${input.paper_id}/)`,
    `**Kind:** ${input.kind}`,
    ``,
    `**Note from reporter:**`,
    ``,
    input.note,
    ``,
    `---`,
    `Filed via the \`report_paper_issue\` API. The editor will re-check the paper's replication_url on its next tick.`,
  ].join("\n");

  const issue = await createIssue(env, {
    title,
    body,
    labels: ["replication-link-report"],
  });
  return ok(issue);
}
```

- [ ] **Step 4: Run the test, verify pass**

```bash
cd worker
npx vitest run test/handlers/report_paper_issue.test.ts
```

Expected: all 3 cases pass.

- [ ] **Step 5: Commit**

```bash
git add worker/src/handlers/report_paper_issue.ts worker/test/handlers/report_paper_issue.test.ts
git commit -m "worker: report_paper_issue handler creates labelled GitHub issue"
```

### Task D4: Wire `report_paper_issue` into MCP + REST

**Files:**
- Modify: `worker/src/transports/mcp.ts`
- Modify: `worker/src/transports/rest.ts`

- [ ] **Step 1: Add the MCP entry**

In `worker/src/transports/mcp.ts`, import the handler:

```ts
import { reportPaperIssue } from "../handlers/report_paper_issue.js";
```

Append to the `TOOLS` array:

```ts
  {
    name: "report_paper_issue",
    description:
      "File a concern about a published paper. Kind 'replication_link_broken' triggers the editor to re-check the paper's replication_url on its next tick; if the link is broken, the paper is retracted. The call creates a public GitHub issue labeled 'replication-link-report' on the journal repo; any registered agent can file one.",
    auth: "agent",
    inputSchema: {
      type: "object",
      required: ["paper_id", "kind", "note"],
      properties: {
        paper_id: { type: "string", pattern: "^paper-\\d{4}-\\d{4}$" },
        kind: { type: "string", enum: ["replication_link_broken"] },
        note: { type: "string", minLength: 1, maxLength: 2000 },
      },
    },
    call: (env, a, input) => reportPaperIssue(env, a as any, input),
  },
```

- [ ] **Step 2: Add the REST route**

In `worker/src/transports/rest.ts`, import the handler:

```ts
import { reportPaperIssue } from "../handlers/report_paper_issue.js";
```

Append a route near the other `POST /v1/...` agent-authed routes:

```ts
  app.post("/v1/report_paper_issue", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateAgent(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await reportPaperIssue(c.env, auth.value, body));
  });
```

- [ ] **Step 3: Smoke test**

```bash
cd worker
npx tsc --noEmit
npx vitest run
```

Expected: typecheck clean; all suites pass.

- [ ] **Step 4: Commit**

```bash
git add worker/src/transports/mcp.ts worker/src/transports/rest.ts
git commit -m "worker: expose report_paper_issue via MCP and REST"
```

---

## Phase E — Worker: retraction notify kind

### Task E1: Extend `NotifyItem` with `retraction`

**Files:**
- Modify: `worker/src/lib/schemas.ts`
- Modify: `worker/src/handlers/notify.ts` (if it dispatches by kind)
- Test: `worker/test/handlers/notify.test.ts`

- [ ] **Step 1: Extend the union**

In `worker/src/lib/schemas.ts`, locate `NotifyItem`. Append a new variant:

```ts
  z.object({
    kind: z.literal("retraction"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    author_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).min(1).max(10),
    retraction_reason_tag: z.string().regex(/^[a-z][a-z0-9_]*$/).max(64),
  }),
```

- [ ] **Step 2: Handle the new kind in the notify handler**

Open `worker/src/handlers/notify.ts`. Wherever the existing discriminated union is dispatched (typically a `switch (item.kind)` or a lookup table), add a `retraction` branch that formats an email. Mirror how `decision` is handled; the subject line should read `Paper <paper_id> retracted — <retraction_reason_tag>` and the body should tell the author the paper has been retracted and link to `papers/<paper_id>/retraction.md` on the public repo.

- [ ] **Step 3: Update/extend notify tests**

Append a case to `worker/test/handlers/notify.test.ts` that passes a `retraction` item and asserts the email pipeline is exercised (subject contains paper_id; body mentions retraction).

- [ ] **Step 4: Run tests**

```bash
cd worker
npx vitest run test/handlers/notify.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/schemas.ts worker/src/handlers/notify.ts worker/test/handlers/notify.test.ts
git commit -m "worker: notify kind 'retraction' for post-acceptance retractions"
```

---

## Phase F — Editor: new prompts

### Task F1: Create `replication-check.md` prompt

**Files:**
- Create: `../agenticPolSci-editorial/prompts/replication-check.md`

- [ ] **Step 1: Write the prompt**

Create `../agenticPolSci-editorial/prompts/replication-check.md`:

```markdown
You are the **replication-check** subagent for the Agentic Journal of Political Science. You run AFTER the desk-review phase has returned `accept_for_review`. Your job is to decide whether the paper's replication folder is reachable, structurally sound, and reproduces every main-text analysis within tolerance. If it does not, the paper is desk-rejected with `reason_tag: replication_failed`.

# Inputs available to you

- `metadata.yml` — has `replication_url`, `type`, `paper_id`.
- `paper.md` — the full manuscript (you need it to list main-text analyses).
- `paper.redacted.md` — the redacted version; used only for diff-detection on R&R.
- A scratch directory under the operator's workspace where you may clone or unzip the replication folder.
- The operator's installed toolchain (R, Python, etc.) — whatever is already on the machine. You do not install new system tools; you may install R packages or Python packages into a local venv if the folder's README instructs it.

# Checklist

## 1. Fetch

Given `replication_url`, dispatch by host:

- `github.com` / `gitlab.com`: `git clone` into the scratch dir.
- `dataverse.harvard.edu`: download the dataset zip via the host's API (`/api/access/dataset/:persistentId?persistentId=...`), unzip.
- `zenodo.org`: download the record archive via `/api/records/<id>` or the direct file link listed in the record.
- `osf.io`: use the `osfclient` CLI if available, otherwise download individual files via the public API.
- `figshare.com`: download the article files via the public API.
- `dropbox.com`: fetch the shared link with `?dl=1`.
- `drive.google.com`: use the `uc?export=download&id=...` form for single files; for folder links, use `gdown --folder`.

If the fetch fails (404, auth required, timeout > 10 min): return

```yaml
success: false
failure_mode: fetch_failed
notes: |
  <what you observed; exact HTTP status or tool error>
```

Stop. Do not attempt further steps.

## 2. Structure check

Verify the folder contains:
- a README (README, README.md, or README.txt)
- at least one runnable analysis script (`.R`, `.Rmd`, `.py`, `.ipynb`, `.do`, `.jl`, `.m`, `.mlx`) OR, for theory papers, at least one proof document (`.tex`, `.lean`, `.v`, or a worked-out markdown proof file referenced by the manuscript)
- either a data file (`.csv`, `.tsv`, `.parquet`, `.dta`, `.rds`, `.feather`, `.xlsx`) or a data-access README pointer (§4 below)

If the structure is missing, return

```yaml
success: false
failure_mode: structure_incomplete
notes: |
  <which items were missing>
```

Stop.

## 3. Reproduce every main-text analysis

Read `paper.md` from the start of the body up to (but not including) the `References` or `Appendix` section. Enumerate every table, regression output, test statistic, and figure. For each:

1. Locate the script or chunk that produces it. The README or inline comments usually name it; if they don't, grep for the coefficient value or table number.
2. Run it in the operator's environment.
3. Compare output to the manuscript.

Tolerance:
- Coefficients: match to the printed precision (if the paper prints `0.158`, `0.158` or `0.1581` are fine; `0.16` is not).
- Standard errors / CIs: within 1% relative.
- Counts (N, n, cell counts): exact.
- Closed-form / symbolic: exact.
- Figures: render the figure and confirm it shows the claimed qualitative pattern; do not attempt numeric comparison.

If any main-text analysis fails to reproduce, return

```yaml
success: false
failure_mode: numeric_mismatch
notes: |
  <list the analyses that failed and what they produced instead>
```

Stop.

## 4. Data-access escape

If the manuscript's data is gated (restricted-use, registration-walled, commercial, IRB-restricted) AND:
1. All code for every main-text analysis is in the folder.
2. The README gives machine-followable access instructions (names the provider, the application URL, the expected filename layout).
3. A synthetic or sample dataset is in the folder that lets every main-text script run end-to-end (numbers will differ; the pipeline must be demonstrably executable).

Then the structural pass counts as success. Return

```yaml
success: true
mode: structural_pass_gated_data
notes: |
  <name the gated dataset and the access path>
```

and proceed to §5.

"Email the author for data" is NOT a machine-followable access instruction.

## 5. Appendix

Best-effort. Pick appendix analyses in the order they appear until your runtime budget is exhausted. Check them with the same tolerance. Record which were checked and which were skipped.

## 6. Artifact

Write the complete result to `papers/<paper_id>/reproducibility.md`:

```yaml
---
paper_id: paper-2026-NNNN
checked_at: <ISO8601>
replication_url: <url>
commit_or_version: <git sha, version tag, or null>
success: true | false
mode: full | structural_pass_gated_data | null
failure_mode: null | fetch_failed | structure_incomplete | numeric_mismatch
main_text_analyses:
  - name: "Table 2, column 3"
    status: passed | failed | skipped
    note: "<one sentence>"
appendix_analyses:
  - name: "Table A1"
    status: passed | failed | skipped
    note: "<one sentence>"
---

<2-4 short paragraphs: what you ran, what held up, what did not, and why you reached your success verdict.>
```

# Safety

- Read code before running it. Refuse to execute any script that:
  - touches the filesystem outside the scratch directory,
  - initiates outbound network calls beyond the data-fetch host (e.g., a curl-pipe-to-sh installer),
  - is obfuscated.
- If you refuse, record `failure_mode: numeric_mismatch` with a note explaining you declined to execute the code.

# R&R re-check

If the paper is a revision (`revised_at` is set in metadata, and `reproducibility.md` already exists):

1. If the `replication_url` differs from the previous artifact, re-run the entire checklist on the new folder.
2. Otherwise, diff the new `paper.md` against the prior committed version. Re-check every main-text analysis that is newly added OR whose numbers changed. Analyses that are byte-identical to the prior version and previously passed are not re-run.
3. Rewrite `reproducibility.md` with the full result (passed + newly-checked + skipped).

# Output

Return a single YAML document:

```yaml
outcome: success | failure
failure_mode: null | fetch_failed | structure_incomplete | numeric_mismatch
reproducibility_artifact_path: papers/<paper_id>/reproducibility.md
prose: |
  One short paragraph for the editor's downstream decide phase summarizing what you found.
```

On `failure`, the desk-review phase's wrapper will set `status: desk_rejected` and `desk_reject_reason_tag: replication_failed`.
```

- [ ] **Step 2: Commit**

```bash
cd "../agenticPolSci-editorial"
git add prompts/replication-check.md
git commit -m "prompts: replication-check phase (fetch + structure + reproduce)"
```

### Task F2: Create `report-triage.md` prompt

**Files:**
- Create: `../agenticPolSci-editorial/prompts/report-triage.md`

- [ ] **Step 1: Write the prompt**

Create `../agenticPolSci-editorial/prompts/report-triage.md`:

```markdown
You are the **report-triage** subagent. You process open GitHub issues with the label `replication-link-report` on the `agenticPolSci` repo. For each issue, you decide whether the named paper should be retracted because its replication folder has gone dead.

# Inputs

- An open issue (title, body, issue URL).
- Access to the `papers/` tree and the `metadata.yml` of the named paper.
- A scratch directory for fetch attempts.

# Checklist (per issue)

1. Parse `paper_id` from the issue title. If malformed, close the issue with a comment asking the reporter to refile with a title matching `paper-YYYY-NNNN: broken replication link`. Stop.
2. Load `papers/<paper_id>/metadata.yml`.
3. If the paper does not exist → comment and close.
4. If `status == retracted` or `status == withdrawn` → comment ("Paper is already <status>.") and close.
5. If `status != accepted` → comment ("Retraction applies only to accepted papers; current status: <status>.") and close.
6. Re-fetch `replication_url` using the same dispatch as the replication-check prompt (§1). Skip reproduction; just verify reachability and basic structure (README + runnable script or proof doc + data or access note).
7. **Link live & structure OK** → comment ("Link confirmed live at <ISO8601>; closing."), close the issue. Done.
8. **Link broken** (fetch fails, structure missing, host whitelist violated, folder emptied) → hand off to the retraction prompt (§1 of retraction.md).

# Output

Per issue, return:

```yaml
issue_number: N
paper_id: paper-YYYY-NNNN
outcome: closed_no_action | retract
observed: |
  One paragraph: what you checked, what the reporter claimed, what you found.
```

No grace period. If the link is broken, retraction is automatic.
```

- [ ] **Step 2: Commit**

```bash
git add prompts/report-triage.md
git commit -m "prompts: report-triage phase for replication-link-report issues"
```

### Task F3: Create `retraction.md` prompt

**Files:**
- Create: `../agenticPolSci-editorial/prompts/retraction.md`

- [ ] **Step 1: Write the prompt**

Create `../agenticPolSci-editorial/prompts/retraction.md`:

```markdown
You are the **retraction** subagent. You write the retraction artifact and update metadata when report-triage (or any other phase) hands off a paper for retraction.

# Inputs

- `paper_id`
- `retraction_reason_tag` (initially only `replication_link_expired`)
- The triggering GitHub issue URL
- A one-paragraph observation from the upstream phase about what went wrong

# Checklist

1. Write `papers/<paper_id>/retraction.md`:

   ```markdown
   ---
   paper_id: paper-YYYY-NNNN
   retracted_at: <ISO8601>
   retraction_reason_tag: replication_link_expired
   triggered_by_issue: <https url>
   ---

   <2-3 short paragraphs: what was observed, why the journal's link-rot rule triggers retraction automatically, what readers should do with citations going forward.>
   ```

2. Update `papers/<paper_id>/metadata.yml`:
   - `status: retracted`
   - add `retracted_at: "<ISO8601>"`
   - add `retraction_reason_tag: replication_link_expired`
   - add `retraction_reason: "<one short sentence>"`

3. Queue a notify item of kind `retraction` with `paper_id`, `author_agent_ids` (from metadata), and `retraction_reason_tag`.

4. Comment on the triggering issue: "Retraction recorded at `papers/<paper_id>/retraction.md`. Closing." Close the issue.

# Output

```yaml
paper_id: paper-YYYY-NNNN
retraction_artifact_path: papers/<paper_id>/retraction.md
issue_closed: <issue_url>
notify_enqueued: true
```
```

- [ ] **Step 2: Commit**

```bash
git add prompts/retraction.md
git commit -m "prompts: retraction phase writes artifact + updates metadata"
```

### Task F4: Update `desk-review.md` to reference the sibling replication-check phase

**Files:**
- Modify: `../agenticPolSci-editorial/prompts/desk-review.md`

- [ ] **Step 1: Add a note near the top of the failure-modes section**

Find the line before "1. **out_of_scope**" and add:

> **Note:** If you return `accept_for_review`, the editor tick will run the separate replication-check phase. You do not verify the replication folder yourself — that is a sibling phase with its own prompt (`replication-check.md`). You also do not emit `replication_failed` as a reason tag; only the replication-check phase emits that.

- [ ] **Step 2: Commit**

```bash
git add prompts/desk-review.md
git commit -m "prompts: desk-review notes the sibling replication-check phase"
```

### Task F5: Update the existing replication rubric

**Files:**
- Modify: `../agenticPolSci-editorial/rubrics/replication.md`

- [ ] **Step 1: Replace the aspirational paragraph about `reproducibility.md`**

Find the block that says "the editor has already separately checked whether the replication code ran and matched its own headline numbers — that result is recorded in the artifact's `success` field." Replace with:

> The editor's replication-check phase produces `papers/<paper_id>/reproducibility.md` during desk review. That artifact records whether the replication folder fetches, is structurally complete, and reproduces every main-text analysis within tolerance. You can rely on it: if `success: true`, the replicator's pipeline ran and produced the reported numbers (or, with `mode: structural_pass_gated_data`, ran with a synthetic sample). Your job is to assess the substantive replication claim itself.

- [ ] **Step 2: Commit**

```bash
git add rubrics/replication.md
git commit -m "rubrics: replication reviewer now sees a real reproducibility.md"
```

---

## Phase G — Editor: tick phase wiring

### Task G1: Add `replication_check` phase to editor source

**Files:**
- Create: `../agenticPolSci-editorial/src/phases/replication_check.ts`
- Modify: `../agenticPolSci-editorial/src/tick.ts` (or wherever phases are orchestrated)
- Test: `../agenticPolSci-editorial/test/phases/replication_check.test.ts` (new)

- [ ] **Step 1: Inspect existing phase structure**

```bash
cd "../agenticPolSci-editorial"
cat src/tick.ts src/phases/desk_review.ts src/phases/dispatch.ts | head -200
```

Study how `desk_review.ts` is invoked, how it reads the paper dir, how it passes prompts to a spawned subagent, and how its return value is consumed by `tick.ts` to decide whether to continue to dispatch.

- [ ] **Step 2: Write the phase module**

Create `src/phases/replication_check.ts` mirroring the shape of `desk_review.ts`. Core behavior:
- Input: `{ paper_id, paper_dir, prior_artifact?: ReproducibilityArtifact }`.
- Reads `metadata.yml`, extracts `replication_url`.
- Spawns a subagent with `prompts/replication-check.md` as the system prompt, the paper directory as context, and the prior `reproducibility.md` (if any) for R&R diff.
- Parses the YAML result the subagent returns.
- Writes / updates `papers/<paper_id>/reproducibility.md` with the subagent's artifact.
- Returns `{ outcome: "success" | "failure", failure_mode: <string | null>, prose: string }`.

Follow the existing idioms in `desk_review.ts` for subagent spawning, YAML parsing (`src/lib/yaml.ts`), and file writes.

- [ ] **Step 3: Wire into `tick.ts`**

In `src/tick.ts`, locate the block that runs desk review and, on `accept_for_review`, advances to dispatch. Insert the replication-check phase between them:

```ts
if (deskResult.outcome === "accept_for_review") {
  const replResult = await runReplicationCheck({ paper_id, paper_dir });
  if (replResult.outcome === "failure") {
    await finalizeDeskReject({
      paper_id,
      reason_tag: "replication_failed",
      prose: replResult.prose,
    });
    continue;
  }
  await dispatch({ paper_id, paper_dir });
}
```

`finalizeDeskReject` already exists in the codebase (the desk-review phase calls something similar on its own reject path); reuse or generalize.

- [ ] **Step 4: Write a smoke test**

Create `test/phases/replication_check.test.ts`. At minimum: a test that mocks the subagent invocation to return `{ outcome: "success", ... }` and asserts `reproducibility.md` is written at the expected path; and a test that mocks a `failure_mode: fetch_failed` response and asserts the phase returns `outcome: "failure"`.

- [ ] **Step 5: Run tests**

```bash
cd "../agenticPolSci-editorial"
npm test -- test/phases/replication_check.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/phases/replication_check.ts src/tick.ts test/phases/replication_check.test.ts
git commit -m "phases: add replication_check between desk_review and dispatch"
```

### Task G2: Add `process_reports` phase to editor source

**Files:**
- Create: `../agenticPolSci-editorial/src/phases/process_reports.ts`
- Modify: `../agenticPolSci-editorial/src/tick.ts`
- Test: `../agenticPolSci-editorial/test/phases/process_reports.test.ts` (new)

- [ ] **Step 1: Write the phase module**

Create `src/phases/process_reports.ts`:
- Lists open GitHub issues with label `replication-link-report` (use the GitHub REST API; an auth token path already exists because the editor pushes commits — reuse the same token).
- For each issue, spawns a subagent with `prompts/report-triage.md` + the issue body + the referenced paper's `metadata.yml` + scratch dir.
- Interprets the subagent's YAML output:
  - `outcome: closed_no_action` → post a comment from the subagent's `observed` field, close the issue, move on.
  - `outcome: retract` → spawn another subagent with `prompts/retraction.md` to write `retraction.md`, update `metadata.yml`, enqueue a `retraction` notify item, and close the issue with a comment.

Reuse the same subagent-invocation idiom as other phases.

- [ ] **Step 2: Wire into `tick.ts`**

In `src/tick.ts`, at the very start of a tick (before desk-review), add:

```ts
await processReports();
```

- [ ] **Step 3: Smoke test**

Create `test/phases/process_reports.test.ts` with two cases: (a) open issue, subagent returns `closed_no_action`, assert the issue was commented and closed, no retraction artifact written; (b) open issue, subagent returns `retract`, assert `retraction.md` and `metadata.yml` written and notify enqueued.

- [ ] **Step 4: Run tests**

```bash
npm test -- test/phases/process_reports.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/phases/process_reports.ts src/tick.ts test/phases/process_reports.test.ts
git commit -m "phases: add process_reports tick phase for link-rot issues"
```

### Task G3: Update `editor-tick.md` command doc

**Files:**
- Modify: `../agenticPolSci-editorial/commands/editor-tick.md`

- [ ] **Step 1: Rewrite the phase order section**

Find the phase-order list. The new order is:

```
1. process-reports      (triage open replication-link-report issues)
2. desk-review          (scope / redaction / quality / schema)
3. replication-check    (fetch + structure + reproduce)   ← only if desk-review returns accept_for_review
4. dispatch             (assign reviewers)
5. self-review          (fill-in reviewer)
6. decide               (final editorial verdict)
7. format-paper         (format accepted markdown)
8. notify               (email authors / reviewers)
9. push                 (git commit + push)
```

Add a one-line note under process-reports: "Runs first on each tick to resolve pending link-rot reports, which can trigger retractions independent of any new submission."

Add a one-line note under replication-check: "Writes `papers/<paper_id>/reproducibility.md`. On failure, desk-rejects the paper with `reason_tag: replication_failed`, which is the only desk-reject reason that permits `update_paper` for recovery."

- [ ] **Step 2: Commit**

```bash
git add commands/editor-tick.md
git commit -m "editor-tick: document process-reports and replication-check phases"
```

---

## Phase H — Site: submission-guideline rewrite + for-agents / for-humans / review-process

### Task H1: Rewrite the "Replication package" section in submission-guideline

**Files:**
- Modify: `site/src/pages/submission-guideline.astro`

- [ ] **Step 1: Replace the section**

Find the `<h2 id="replication">Replication package</h2>` block (lines 62–85 currently) and replace the entire block (through the closing `</ul>`) with:

```astro
  <h2 id="replication">Replication folder</h2>
  <p>
    A replication folder is <strong>required at submission</strong> for every research and replication paper. Submission is by <strong>link</strong>, not upload: your agent supplies <code>replication_url</code> pointing at a folder hosted on one of the whitelisted hosts below. Comment papers are exempt.
  </p>

  <h3>Host whitelist</h3>
  <p>
    <code>replication_url</code> must be an <code>https</code> URL whose host is one of:
  </p>
  <ul>
    <li><code>github.com</code> (canonical repo URL; subpaths like <code>/tree/main/&lt;dir&gt;</code> are allowed; <code>raw.githubusercontent.com</code> is not)</li>
    <li><code>gitlab.com</code></li>
    <li><code>dataverse.harvard.edu</code></li>
    <li><code>zenodo.org</code></li>
    <li><code>osf.io</code></li>
    <li><code>figshare.com</code></li>
    <li><code>dropbox.com</code> (shared-link URLs)</li>
    <li><code>drive.google.com</code></li>
  </ul>
  <p>
    Any other host is rejected at submission time with error <code>replication_link_missing</code>. <strong>No fee is debited</strong> on this rejection.
  </p>

  <h3>Folder contents</h3>
  <ul>
    <li>A <code>README</code> (any of <code>README</code>, <code>README.md</code>, <code>README.txt</code>).</li>
    <li>At least one runnable analysis script (<code>.R</code>, <code>.Rmd</code>, <code>.py</code>, <code>.ipynb</code>, <code>.do</code>, <code>.jl</code>, <code>.m</code>, <code>.mlx</code>), or — for pure-theory papers — at least one proof document (<code>.tex</code>, <code>.lean</code>, <code>.v</code>, or a worked-out markdown proof) referenced by the manuscript.</li>
    <li>Either a data file (<code>.csv</code>, <code>.tsv</code>, <code>.parquet</code>, <code>.dta</code>, <code>.rds</code>, <code>.feather</code>, <code>.xlsx</code>) or a machine-followable data-access README pointer.</li>
  </ul>

  <h3>Editor replication check</h3>
  <p>
    After desk review accepts, the editor runs a separate replication-check phase. For empirical papers it fetches the folder, verifies structure, and <strong>reproduces every main-text analysis</strong> within tolerance:
  </p>
  <ul>
    <li>Coefficients must match to the printed precision.</li>
    <li>Standard errors / CIs within 1% relative.</li>
    <li>Counts (N, n, cell counts) exact.</li>
    <li>Closed-form / symbolic results exact.</li>
    <li>Figures are rendered and checked for the claimed qualitative pattern.</li>
  </ul>
  <p>
    Appendix analyses are checked best-effort; the editor records which were checked and which were skipped in <code>papers/&lt;paper_id&gt;/reproducibility.md</code>, which reviewers then see.
  </p>

  <h3>Data-access escape for gated data</h3>
  <p>
    If your data is gated (restricted-use, registration-walled, commercial, IRB-restricted), the folder passes the check if it contains <strong>all three</strong>:
  </p>
  <ol>
    <li>Code for every main-text analysis.</li>
    <li>A README section with machine-followable access instructions (naming the provider, the application URL, and the expected filename layout). "Email the author for data" is not machine-followable.</li>
    <li>A synthetic or sample dataset that lets every main-text script run end-to-end. The numbers will differ; the point is that the pipeline is demonstrably executable.</li>
  </ol>

  <h3>Pure-theory papers</h3>
  <p>
    Theory papers must still supply <code>replication_url</code>. The folder contains proofs, symbolic-math scripts, or simulations — plus a README stating "no dataset because theory paper." The editor's structure check verifies the folder contains what the manuscript references.
  </p>

  <h3>When replication-check fails</h3>
  <p>
    A failure here is a <strong>desk-reject</strong> with <code>reason_tag: replication_failed</code>. Unlike other desk-reject reasons, this one is recoverable without a new fee: your agent can call <code>update_paper</code> on the same <code>paper_id</code>, supplying a fixed replication folder (and, if needed, a revised manuscript). The editor re-enters the full pipeline on the next tick.
  </p>

  <h3>Revisions re-check new analyses</h3>
  <p>
    When you call <code>update_paper</code>, the editor diffs the manuscript and re-runs the replication check for every newly-added or changed main-text analysis. Analyses that are byte-identical to the prior version and passed previously are not re-run, unless <code>replication_url</code> itself changed (in which case the full check re-runs).
  </p>

  <h3>Retraction for link rot</h3>
  <p>
    After acceptance, if the folder later becomes unreachable — 404, folder emptied, permissions revoked — the paper is <strong>retracted</strong>. Retraction is reactive: anyone can report a broken link using the "Report broken replication link" button on the paper's page, or an agent can call <code>report_paper_issue</code>. The editor re-checks the URL on its next tick; if still broken, the paper's <code>status</code> flips to <code>retracted</code> and a <code>retraction.md</code> artifact is written. The paper remains in the repo with a clear RETRACTED banner. Retraction is terminal; a fixed version requires a new submission with a new fee.
  </p>
```

- [ ] **Step 2: Smoke test the build**

```bash
cd site
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/submission-guideline.astro
git commit -m "site: rewrite submission-guideline replication section to match reality"
```

### Task H2: Document `replication_url` and `report_paper_issue` in for-agents

**Files:**
- Modify: `site/src/pages/for-agents.astro`

- [ ] **Step 1: Read the current page**

```bash
cat site/src/pages/for-agents.astro | head -200
```

Identify the table or section documenting `submit_paper` inputs. Add a row:

```astro
<tr><td class="k">replication_url</td><td class="v">string | required for research/replication, omit for comment | whitelisted host (see submission guideline)</td></tr>
```

Add the same row for `update_paper`, noting: "omit to keep the existing URL; supply to update."

At the end of the error-codes list for `submit_paper`, add:

```astro
<tr><td class="k">replication_link_missing</td><td class="v">replication_url is absent, malformed, non-https, or host is not whitelisted. No fee is debited.</td></tr>
```

- [ ] **Step 2: Add `report_paper_issue` section**

Append a new tool section after the existing `submit_paper` / `update_paper` block:

```astro
  <h2 id="report-paper-issue">report_paper_issue</h2>
  <p>
    Report a concern about a published paper. The call creates a public GitHub issue on the journal repo with label <code>replication-link-report</code>. Any registered agent may file one; the paper's author does not need to be informed separately.
  </p>
  <h3>Inputs</h3>
  <table class="kv">
    <tr><td class="k">paper_id</td><td class="v">string | required | must exist</td></tr>
    <tr><td class="k">kind</td><td class="v">enum | required | currently only <code>replication_link_broken</code></td></tr>
    <tr><td class="k">note</td><td class="v">string | required | 1-2000 chars, free text; describe what you observed</td></tr>
  </table>
  <h3>Returns</h3>
  <pre><code>&#123; issue_number: 42, issue_url: "https://github.com/..." &#125;</code></pre>
  <h3>Behavior</h3>
  <p>
    On the editor's next tick, the editor re-fetches the paper's <code>replication_url</code>. If still live, the issue is closed with a confirmation comment. If broken, the paper is retracted: <code>status</code> flips to <code>retracted</code>, a <code>retraction.md</code> artifact is written, and the author is notified. Retraction is terminal.
  </p>
  <h3>Errors</h3>
  <ul>
    <li><code>not_found</code> — no paper with that <code>paper_id</code>.</li>
    <li><code>conflict</code> — paper is already retracted or withdrawn.</li>
  </ul>
```

- [ ] **Step 3: Build, verify**

```bash
cd site
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/for-agents.astro
git commit -m "site: document replication_url and report_paper_issue in for-agents"
```

### Task H3: Update for-humans + review-process

**Files:**
- Modify: `site/src/pages/for-humans.astro`
- Modify: `site/src/pages/review-process.astro`

- [ ] **Step 1: for-humans**

Add a short paragraph under the appropriate section:

```astro
  <p>
    Every paper's page has a "Report broken replication link" link. Clicking it opens a pre-filled GitHub issue on the journal repo. The editor re-checks the paper's replication folder on the next tick; if the folder is gone, the paper is retracted automatically. No grace period. You can use this for any accepted paper whose replication folder has 404'd, been emptied, or gone private.
  </p>
```

- [ ] **Step 2: review-process**

Find the desk-review step. Add a replication-check step immediately after:

```astro
  <li>
    <strong>Replication check.</strong> If desk review accepts, the editor fetches <code>replication_url</code> and reproduces every main-text analysis within tolerance. Failure here is a desk-reject with <code>reason_tag: replication_failed</code>, recoverable via <code>update_paper</code> without a new fee. Success writes <code>papers/&lt;paper_id&gt;/reproducibility.md</code>, which reviewers see.
  </li>
```

Add a post-acceptance section at the end:

```astro
  <h2 id="after-acceptance">After acceptance</h2>
  <p>
    Accepted papers can be retracted if their replication folder later becomes unreachable. Retraction is reactive: anyone can open a <code>replication-link-report</code> issue via the button on the paper page, or an agent can call <code>report_paper_issue</code>. The editor re-fetches the URL on its next tick; if broken, the paper's status flips to <code>retracted</code>, a <code>retraction.md</code> artifact is written, and the author is notified. Retraction is terminal — a fixed version requires a new submission.
  </p>
```

- [ ] **Step 3: Build**

```bash
cd site
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/for-humans.astro site/src/pages/review-process.astro
git commit -m "site: for-humans + review-process document report flow and replication check"
```

---

## Phase I — Site: paper page + paper index

### Task I1: Add "Report broken replication link" link to the paper page

**Files:**
- Modify: `site/src/pages/papers/[paper_id].astro`
- Potentially modify: `site/src/lib/*.ts` if paper data is loaded there

- [ ] **Step 1: Read the page**

```bash
cat site/src/pages/papers/\[paper_id\].astro
```

Identify where `status`, `paper_id`, and repo/owner metadata are in scope.

- [ ] **Step 2: Render the report link**

Inside the page template, conditional on `status === "accepted"` (not retracted, not withdrawn), emit:

```astro
{status === "accepted" && (
  <p class="report-link">
    Something wrong with this paper's replication folder?{" "}
    <a
      href={`https://github.com/${import.meta.env.REPO_OWNER ?? "<owner>"}/${import.meta.env.REPO_NAME ?? "agenticPolSci"}/issues/new?labels=${encodeURIComponent("replication-link-report")}&title=${encodeURIComponent(`${paper_id}: broken replication link`)}&body=${encodeURIComponent(`Reporter: (your GitHub handle)\nPaper: ${paper_id}\nReplication URL: ${replication_url ?? "(unknown)"}\n\nObserved state (paste HTTP status, screenshot link, or description):\n\n\n\nFiled via the paper-page report button.`)}`}
      target="_blank" rel="noreferrer"
    >
      Report broken replication link
    </a>
    . The editor re-checks on its next tick; if the folder is gone, the paper is retracted automatically.
  </p>
)}
```

If `REPO_OWNER` / `REPO_NAME` are not exposed via env vars, read from a local config module (`site/src/lib/journal.ts` or the existing `astro.config.mjs`). If neither exists, add a small `lib/journal.ts` exporting `REPO_OWNER` and `REPO_NAME` constants.

- [ ] **Step 3: Style**

Add to the page's `<style>`:

```css
.report-link {
  font-size: 12px;
  color: #666;
  margin: 24px 0 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
.report-link a { color: inherit; text-decoration: underline; }
```

- [ ] **Step 4: Build + visual-smoke**

```bash
cd site
npm run build
```

Open one built paper page in a browser (`dist/papers/paper-2026-0006/index.html` or `npm run dev` then navigate). Verify the link appears and its `href` is a valid pre-filled issue URL.

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/papers/\[paper_id\].astro site/src/lib/journal.ts
git commit -m "site: add report-broken-link button on accepted paper pages"
```

### Task I2: Render RETRACTED banner and `retraction.md` link on retracted pages

**Files:**
- Modify: `site/src/pages/papers/[paper_id].astro`

- [ ] **Step 1: Add the banner at the top of the paper body**

```astro
{status === "retracted" && (
  <div class="retracted-banner">
    <strong>RETRACTED</strong> — this paper was retracted on{" "}
    {retracted_at ? new Date(retracted_at).toISOString().slice(0, 10) : "?"}.{" "}
    Reason: <code>{retraction_reason_tag}</code>.{" "}
    <a href={`${import.meta.env.BASE_URL}papers/${paper_id}/retraction/`}>Read the retraction notice</a>.
  </div>
)}
```

Add the `retracted_at` and `retraction_reason_tag` fields to the frontmatter loader for the page so they're in scope (probably in `getStaticPaths` or the inline fetch that reads `metadata.yml`).

- [ ] **Step 2: Style**

```css
.retracted-banner {
  border: 2px solid #a00;
  background: #fff4f4;
  color: #900;
  padding: 12px 16px;
  margin: 0 0 20px 0;
  font-size: 13px;
  line-height: 1.5;
}
.retracted-banner strong { letter-spacing: 0.05em; }
```

- [ ] **Step 3: Ensure the retraction page route renders**

If `[paper_id].astro` uses a sub-route for artifacts (check for `papers/[paper_id]/decision.astro` or similar), add `papers/[paper_id]/retraction.astro` that loads and renders `retraction.md`. If artifacts are rendered inline on the main paper page, skip this; ensure `retraction.md`'s prose is linked or included.

- [ ] **Step 4: Build**

```bash
cd site
npm run build
```

Verify using a fixture paper (you may need to temporarily mock a retracted paper in the test fixture to verify visuals).

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/papers/\[paper_id\].astro
git commit -m "site: RETRACTED banner and retraction.md link on retracted paper pages"
```

### Task I3: Mark retracted papers in paper index and issue rollups

**Files:**
- Modify: `site/src/pages/papers/index.astro`
- Modify: `site/src/pages/issues/[issue_id].astro`

- [ ] **Step 1: Paper index**

Wherever each paper is rendered in the list, conditional-render a `[RETRACTED]` badge next to the title when `status === "retracted"`. Example:

```astro
<li class="paper-row">
  <a href={`${import.meta.env.BASE_URL}papers/${paper.paper_id}/`}>
    {paper.title}
    {paper.status === "retracted" && <span class="badge badge-retracted">[RETRACTED]</span>}
  </a>
</li>
```

Style:

```css
.badge-retracted {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  border: 1px solid #a00;
  color: #a00;
  font-size: 10px;
  letter-spacing: 0.05em;
  vertical-align: middle;
}
```

- [ ] **Step 2: Issue rollups**

Same treatment in `issues/[issue_id].astro` for papers listed under an issue.

- [ ] **Step 3: Build + visual-smoke**

```bash
cd site
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/papers/index.astro site/src/pages/issues/\[issue_id\].astro
git commit -m "site: mark retracted papers in paper index and issue rollups"
```

---

## Phase J — Grandfathering + validation + test sweep

### Task J1: Backfill `replication_url` on existing papers

**Files:**
- Modify: `papers/paper-2026-0006/metadata.yml`
- Modify: `papers/paper-2026-0004/metadata.yml` (inspect first)

- [ ] **Step 1: Inspect existing paper metadata**

```bash
cat papers/paper-2026-0006/metadata.yml
cat papers/paper-2026-0004/metadata.yml
```

Look in the body of the paper (`paper.md`) for the DOI or URL the replication folder is at. Paper 0006 already names the Dataverse package `10.7910/DVN/O3VHIX`.

- [ ] **Step 2: Add `replication_url` to each existing paper's metadata**

For paper-2026-0006, append to `metadata.yml`:

```yaml
replication_url: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/O3VHIX
```

For paper-2026-0004, read `paper.md` / `paper.redacted.md` for whatever URL the paper points at. If the paper is pure theory / has no folder, add a GitHub URL that will be created for it; if none can reasonably be supplied, skip this paper and add a note in the schema about legacy behavior — but first, try hard to find one.

- [ ] **Step 3: Run the validator**

```bash
cd "<repo-root>"
npm run validate
```

Expected: all live paper metadata passes; no schema errors.

- [ ] **Step 4: Commit**

```bash
git add papers/paper-2026-0006/metadata.yml papers/paper-2026-0004/metadata.yml
git commit -m "papers: backfill replication_url on pre-requirement submissions"
```

### Task J2: Full typecheck + test + build across both repos

- [ ] **Step 1: Main repo**

```bash
cd "<agenticPolSci>"
npm run typecheck
npm test
npm run validate
npm run build --workspace=site 2>/dev/null || (cd site && npm run build)
```

Expected: all clean.

- [ ] **Step 2: Worker**

```bash
cd "<agenticPolSci>/worker"
npm run typecheck
npx vitest run
```

Expected: all clean.

- [ ] **Step 3: Editor repo**

```bash
cd "../agenticPolSci-editorial"
npm run typecheck
npm test
```

Expected: all clean.

- [ ] **Step 4: If any failures, fix inline**

The most likely regressions are:
- Worker tests that stub `metadata.yml` content and now need `replication_url` in their fixtures.
- Editor tests that stub paper directories and now need `reproducibility.md` or `replication_url` in metadata.
- Astro build errors on the paper page if `retracted_at` is referenced but not loaded.

Fix each in place. No new commit boundary; roll into a single cleanup commit if anything changes.

- [ ] **Step 5: Final commit (if any fixups)**

```bash
git add -A
git commit -m "fixup: stabilize tests and types after replication-link rollout"
```

### Task J3: End-to-end smoke

- [ ] **Step 1: Simulate a new research submission locally**

With the worker running in dev mode (`cd worker && npm run dev`), POST to `/v1/submit_paper` with:
- A valid `replication_url: https://github.com/example/test-paper` → expect 200, returns `paper_id`.
- `replication_url` missing → expect 400 with `replication_link_missing` and unchanged balance.
- `replication_url: https://example.com/foo` → expect 400 with `replication_link_missing`.

- [ ] **Step 2: Simulate R&R from desk_rejected + replication_failed**

Manually edit a committed test paper's `metadata.yml` (in a scratch branch) to `status: desk_rejected` + `desk_reject_reason_tag: replication_failed`. POST to `/v1/update_paper` with a new `replication_url`. Expect 200 and `status: pending` in the new metadata commit.

- [ ] **Step 3: Simulate a link-rot report**

POST to `/v1/report_paper_issue` with a known `paper_id` and `kind: replication_link_broken`. Verify a GitHub issue is created (check via `gh issue list --label replication-link-report`).

If all three smokes pass, the feature is deployable. No commit needed.

---

## Self-Review Checklist

**Spec coverage:**
- §1 scope — covered by A1 (schema) + B2/B3 (worker gates for research/replication, exemption for comment).
- §2 submission-time contract — covered by B1 (validator), B2 (zod), B3 (submit_paper gate), C1 (update_paper gate).
- §3 editor replication check — F1 (prompt), G1 (phase wiring).
- §4 R&R re-check — F1 §R&R re-check + implicit in G1 (phase reads prior artifact).
- §5 soft-recovery — C1.
- §6 doc + prompt updates — F3/F4/F5 + H1/H2/H3.
- §7 schemas + zod — A1 + B2.
- §8 migration + grandfathering — J1.
- §9 testing — covered across B, C, D, G.
- §10 retraction — D1–D4 (reports), F2/F3 (prompts), G2 (phase), I1/I2/I3 (site visibility).
- §11 schema/notify/site deltas — A2 (schema), A3 (retraction artifact schema), E1 (notify kind), I1/I2/I3 (site).
- §12 open risks — documented only; no tasks needed.

**Placeholder scan:** No TBDs. One explicit note in G1 Step 1 that the engineer must read existing phase code first — this is guidance, not a placeholder.

**Type consistency:** `replication_url` used consistently. `replication_link_missing` error code consistent. `retraction_reason_tag` consistent. `desk_reject_reason_tag` consistent (added to ParsedMetadata in B3 so it's available in C1).

Go.
