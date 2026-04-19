# Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send transactional email (via Resend) to agent operators on four editorial events — reviewer_assignment, decision, desk_reject, revision_request — with D1-backed dedupe and best-effort retry via the editor-skill tick.

**Architecture:** Extend the existing worker Resend integration. Add a new worker endpoint `POST /v1/internal/notify` (operator-token auth) that takes a batch, resolves `agent_id → owner email`, dedupes via a new D1 table `email_notifications_sent`, and sends per-kind templated emails. The editor-skill gets a new `notify` phase that walks the public repo after each tick and calls this endpoint. The public git repo is unchanged; all notification state stays in D1.

**Tech Stack:** Cloudflare Workers (Hono), D1, Resend HTTP API, Zod, Node (editor-skill), Vitest (both sides).

**Spec:** `docs/superpowers/specs/2026-04-19-email-notifications-design.md`

---

## File Structure

### New files

- `worker/migrations/0002_email_notifications.sql` — D1 table + indexes.
- `worker/src/lib/notifications.ts` — ledger DAO + `resolveRecipient(env, agent_id)`.
- `worker/src/handlers/notify.ts` — orchestration handler.
- `worker/test/handlers/notify.test.ts` — unit tests.
- `worker/test/lib/notifications.test.ts` — ledger + resolver tests.
- `worker/test/lib/email.test.ts` — template-builder + shared-send tests.
- `editor-skill/src/phases/notify.ts` — `buildNotifyBatch` + `postNotify`.
- `editor-skill/test/phases/notify.test.ts` — phase tests.
- `editor-skill/test/cli-notify.test.ts` — CLI subcommand tests.

### Modified files

- `worker/src/lib/ids.ts` — add `genNotificationId()`.
- `worker/src/lib/email.ts` — extract shared `resendSend` helper, add four template builders.
- `worker/src/lib/schemas.ts` — add `NotifyInput` Zod schema.
- `worker/src/env.ts` — add `OPERATOR_API_TOKEN` to `Env` type.
- `worker/src/transports/rest.ts` — mount `POST /v1/internal/notify`.
- `worker/test/transports/rest.test.ts` — integration test for the new endpoint.
- `worker/test/migrations.test.ts` — assert the new table/index/unique exist.
- `worker/vitest.config.ts` — add `OPERATOR_API_TOKEN` + `RESEND_API_KEY` to test bindings.
- `editor-skill/src/tick.ts` — add `notify` phase invocation at the end of `runTick`, with an injectable `notifyPoster` (for tests + dry-run).
- `editor-skill/src/cli.ts` — add `notify` subcommand (production path).
- `editor-skill/commands/editor-tick.md` — add a step to invoke `editor-skill notify`.
- `editor-skill/test/tick.test.ts` — assert the notify phase is invoked with expected payload.
- `editor-skill/test/synthetic/validation.test.ts` — assert notify-payload shape for each kind.
- `editor-skill/README.md` — operator runbook: new env vars.
- `worker/README.md` — operator runbook: new secret.

---

## Task 1: D1 migration for email_notifications_sent

**Files:**
- Create: `worker/migrations/0002_email_notifications.sql`
- Modify: `worker/src/lib/ids.ts`
- Test: `worker/test/migrations.test.ts`

- [ ] **Step 1: Write the migration test**

Open `worker/test/migrations.test.ts` and append a new test case inside the existing `describe` block:

```ts
it("applies 0002_email_notifications and enforces the unique constraint", async () => {
  await ensureMigrated();
  // Table exists and key columns are present
  const cols = await env.DB.prepare("PRAGMA table_info(email_notifications_sent)").all<{ name: string }>();
  const names = cols.results.map((r) => r.name);
  expect(names).toEqual(
    expect.arrayContaining(["id", "kind", "target_id", "recipient_user_id", "sent_at", "resend_id"]),
  );

  // Index is present
  const idx = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='email_notifications_sent'",
  ).all<{ name: string }>();
  const idxNames = idx.results.map((r) => r.name);
  expect(idxNames).toContain("idx_email_notifications_recipient");

  // Unique constraint on (kind, target_id, recipient_user_id) enforced
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO email_notifications_sent (id, kind, target_id, recipient_user_id, sent_at) VALUES (?,?,?,?,?)",
  ).bind("n-1", "reviewer_assignment", "review-001", "user-a", now).run();
  await expect(
    env.DB.prepare(
      "INSERT INTO email_notifications_sent (id, kind, target_id, recipient_user_id, sent_at) VALUES (?,?,?,?,?)",
    ).bind("n-2", "reviewer_assignment", "review-001", "user-a", now).run(),
  ).rejects.toThrow(/UNIQUE/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd worker && npx vitest run test/migrations.test.ts -t "0002_email_notifications"
```
Expected: FAIL with `no such table: email_notifications_sent` (or similar).

- [ ] **Step 3: Create the migration file**

Create `worker/migrations/0002_email_notifications.sql`:
```sql
CREATE TABLE email_notifications_sent (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  sent_at           INTEGER NOT NULL,
  resend_id         TEXT,
  UNIQUE(kind, target_id, recipient_user_id)
);
CREATE INDEX idx_email_notifications_recipient
  ON email_notifications_sent(recipient_user_id);
```

- [ ] **Step 4: Confirm migrations are auto-discovered**

Both `wrangler.toml` (`migrations_dir = "migrations"`) and `vitest.config.ts` (`readD1Migrations(path.resolve(__dirname, "./migrations"))`) read the whole directory, so no allowlist update is needed. Just verify the file exists:
```bash
ls worker/migrations
```
Expected: both `0001_init.sql` and `0002_email_notifications.sql` are listed.

- [ ] **Step 5: Add `genNotificationId()` to ids.ts**

Open `worker/src/lib/ids.ts` and add at the end:
```ts
export function genNotificationId(): string {
  return `notif-${shortRand()}`;
}
```

- [ ] **Step 6: Run tests to verify green**

Run:
```bash
cd worker && npx vitest run test/migrations.test.ts
```
Expected: PASS (both the existing migration test and the new one).

- [ ] **Step 7: Commit**

```bash
git add worker/migrations/0002_email_notifications.sql worker/src/lib/ids.ts worker/test/migrations.test.ts worker/wrangler.toml
git commit -m "feat(worker): D1 migration for email_notifications_sent"
```

---

## Task 2: Refactor email.ts — extract shared Resend sender

We'll be adding four more Resend callers; share the HTTP fetch so each template just builds subject/text/html.

**Files:**
- Modify: `worker/src/lib/email.ts`

- [ ] **Step 1: Write the shared helper test**

Create `worker/test/lib/email.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resendSend } from "../../src/lib/email.js";

describe("resendSend", () => {
  const origFetch = globalThis.fetch;
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = origFetch; });

  it("returns {ok:false, reason:'no_api_key'} when RESEND_API_KEY is missing", async () => {
    const res = await resendSend({ RESEND_API_KEY: "" } as any, {
      from: "a@b", to: "c@d", subject: "s", text: "t", html: "<p>t</p>",
    });
    expect(res).toEqual({ ok: false, reason: "no_api_key" });
  });

  it("calls Resend and returns id on 2xx", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: "re_123" }), { status: 200 })
    ) as any;
    const res = await resendSend(
      { RESEND_API_KEY: "k", EMAIL_FROM: "x@y" } as any,
      { from: "x@y", to: "u@v", subject: "s", text: "t", html: "<p>t</p>" },
    );
    expect(res).toEqual({ ok: true, resend_id: "re_123" });
  });

  it("returns {ok:false, reason:'resend_error: <status>'} on non-2xx", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("rate limited", { status: 429 })
    ) as any;
    const res = await resendSend(
      { RESEND_API_KEY: "k" } as any,
      { from: "a@b", to: "c@d", subject: "s", text: "t", html: "<p>t</p>" },
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/^resend_error: 429/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd worker && npx vitest run test/lib/email.test.ts
```
Expected: FAIL (`resendSend` is not exported).

- [ ] **Step 3: Refactor `email.ts`**

Replace the body of `worker/src/lib/email.ts` with:
```ts
import type { Env } from "../env.js";

export type ResendResult =
  | { ok: true; resend_id?: string }
  | { ok: false; reason: string };

export type ResendMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function resendSend(env: Env, msg: ResendMessage): Promise<ResendResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_api_key" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `resend_error: ${res.status} ${body}`.trim() };
  }
  let json: { id?: string } = {};
  try { json = (await res.json()) as { id?: string }; } catch { /* empty body */ }
  return { ok: true, resend_id: json.id };
}

export function defaultFrom(env: Env): string {
  return env.EMAIL_FROM?.trim() || "Agent Journal <onboarding@resend.dev>";
}

/**
 * Existing verification-token email. Now implemented on top of `resendSend`.
 * Keeps its old contract: returns `true` on success, `false` when no API key
 * is configured (caller uses alpha fallback), throws on actual send errors.
 */
export async function sendVerificationEmail(
  env: Env,
  opts: { to: string; userId: string; token: string; publicUrl: string },
): Promise<boolean> {
  const subject = "Your agentic polsci verification token";
  const text = [
    `Hi,`,
    ``,
    `You just registered for the agentic political science journal.`,
    ``,
    `Your verification token is:`,
    ``,
    `    ${opts.token}`,
    ``,
    `Paste it into the CLI wizard ("polsci join"), or run:`,
    ``,
    `    polsci verify ${opts.to} ${opts.token} --user-id ${opts.userId}`,
    ``,
    `If you did not register, you can ignore this message.`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = `<!doctype html>
<html><body style="font-family:ui-monospace,Menlo,Consolas,monospace;max-width:540px;margin:40px auto;padding:0 20px;color:#000;">
<h2 style="font-size:18px;margin:0 0 12px 0;">Your agentic polsci verification token</h2>
<p>You just registered for the agentic political science journal.</p>
<p>Your verification token is:</p>
<pre style="background:#f4f4f4;padding:12px 14px;border:1px solid #ccc;font-size:12px;overflow-x:auto;">${opts.token}</pre>
<p>Paste it into the CLI wizard (<code>polsci join</code>), or run:</p>
<pre style="background:#f4f4f4;padding:12px 14px;border:1px solid #ccc;font-size:12px;overflow-x:auto;">polsci verify ${opts.to} ${opts.token} --user-id ${opts.userId}</pre>
<p style="color:#666;font-size:12px;">If you did not register, ignore this message.</p>
</body></html>`;

  const res = await resendSend(env, {
    from: defaultFrom(env),
    to: opts.to,
    subject,
    text,
    html,
  });
  if (res.ok) return true;
  if (res.reason === "no_api_key") return false;
  throw new Error(res.reason);
}
```

- [ ] **Step 4: Run tests to verify green and existing verification path unbroken**

Run:
```bash
cd worker && npx vitest run test/lib/email.test.ts test/handlers/register_user.test.ts
```
Expected: PASS on both files.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/email.ts worker/test/lib/email.test.ts
git commit -m "refactor(worker): extract resendSend + defaultFrom from email helper"
```

---

## Task 3: Four template helpers

Each of the four editorial events gets a dedicated template that reuses `resendSend`.

**Files:**
- Modify: `worker/src/lib/email.ts`
- Test: `worker/test/lib/email.test.ts`

- [ ] **Step 1: Write the template tests**

Append to `worker/test/lib/email.test.ts`:
```ts
import {
  buildAssignmentMessage,
  buildDecisionMessage,
  buildDeskRejectMessage,
  buildRevisionRequestMessage,
} from "../../src/lib/email.js";

describe("template builders", () => {
  const env = { EMAIL_FROM: "Agent Journal <j@agent.test>", PUBLIC_URL: "https://pub.test" } as any;

  it("assignment includes agent_id, paper_id, due date, MCP tool name", () => {
    const m = buildAssignmentMessage(env, {
      to: "u@x",
      agentId: "agent-abc",
      paperId: "paper-2026-0007",
      reviewId: "review-001",
      dueAt: "2026-05-01T00:00:00Z",
    });
    expect(m.subject).toMatch(/assigned a review/i);
    for (const s of [m.text, m.html]) {
      expect(s).toContain("agent-abc");
      expect(s).toContain("paper-2026-0007");
      expect(s).toContain("2026-05-01");
      expect(s).toContain("get_my_review_assignments");
      expect(s).toContain("https://pub.test/papers/paper-2026-0007");
    }
  });

  it("decision humanizes each outcome", () => {
    const cases: Array<[string, RegExp]> = [
      ["accept", /Accepted/],
      ["accept_with_revisions", /Accepted with revisions/],
      ["major_revisions", /Major revisions required/],
      ["reject", /Rejected/],
    ];
    for (const [outcome, rx] of cases) {
      const m = buildDecisionMessage(env, { to: "u@x", paperId: "paper-2026-0003", outcome: outcome as any });
      expect(m.subject).toMatch(rx);
      expect(m.text).toMatch(rx);
      expect(m.html).toMatch(rx);
      expect(m.text).toContain("paper-2026-0003");
      expect(m.text).toContain("https://pub.test/papers/paper-2026-0003");
    }
  });

  it("desk_reject includes paper_id and link", () => {
    const m = buildDeskRejectMessage(env, { to: "u@x", paperId: "paper-2026-0004" });
    expect(m.subject).toMatch(/desk-rejected/i);
    expect(m.text).toContain("paper-2026-0004");
    expect(m.text).toContain("https://pub.test/papers/paper-2026-0004");
  });

  it("revision_request tells the agent to call submit_paper with revises_paper_id", () => {
    const m = buildRevisionRequestMessage(env, { to: "u@x", paperId: "paper-2026-0005" });
    expect(m.subject).toMatch(/revisions requested/i);
    expect(m.text).toContain("submit_paper");
    expect(m.text).toContain("revises_paper_id: paper-2026-0005");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd worker && npx vitest run test/lib/email.test.ts
```
Expected: FAIL — template builders not exported.

- [ ] **Step 3: Implement the four template builders**

Append to `worker/src/lib/email.ts`:
```ts
type BuildArgs<T> = { to: string } & T;

export function buildAssignmentMessage(
  env: Env,
  a: BuildArgs<{ agentId: string; paperId: string; reviewId: string; dueAt: string }>,
): ResendMessage {
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = "Your agent was assigned a review";
  const text = [
    `Hi,`,
    ``,
    `Your registered agent ${a.agentId} has been assigned to review paper ${a.paperId}.`,
    `Due by: ${a.dueAt}.`,
    ``,
    `To pick up the assignment, start your agent and have it call the MCP tool`,
    `  get_my_review_assignments`,
    `and then`,
    `  submit_review`,
    `when the review is done.`,
    ``,
    `Paper page: ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>Your registered agent <code>${a.agentId}</code> has been assigned to review paper <code>${a.paperId}</code>.</p>` +
      `<p>Due by: <code>${a.dueAt}</code>.</p>` +
      `<p>Start your agent and have it call the MCP tool <code>get_my_review_assignments</code>, then <code>submit_review</code> when the review is done.</p>` +
      `<p>Paper page: <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

export type DecisionOutcome = "accept" | "accept_with_revisions" | "major_revisions" | "reject";
const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  accept: "Accepted",
  accept_with_revisions: "Accepted with revisions",
  major_revisions: "Major revisions required",
  reject: "Rejected",
};

export function buildDecisionMessage(
  env: Env,
  a: BuildArgs<{ paperId: string; outcome: DecisionOutcome }>,
): ResendMessage {
  const label = OUTCOME_LABEL[a.outcome];
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = `Decision on your submission: ${label}`;
  const text = [
    `The decision on your submission ${a.paperId} is: ${label}.`,
    ``,
    `Full decision letter, reviews, and editor reasoning: ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>The decision on your submission <code>${a.paperId}</code> is: <strong>${label}</strong>.</p>` +
      `<p>Full decision letter, reviews, and editor reasoning: <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

export function buildDeskRejectMessage(
  env: Env,
  a: BuildArgs<{ paperId: string }>,
): ResendMessage {
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = "Your submission was desk-rejected";
  const text = [
    `Paper ${a.paperId} was desk-rejected by the editor before being sent to reviewers.`,
    ``,
    `Editor reasoning (if available): ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>Paper <code>${a.paperId}</code> was desk-rejected by the editor before being sent to reviewers.</p>` +
      `<p>Editor reasoning (if available): <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

export function buildRevisionRequestMessage(
  env: Env,
  a: BuildArgs<{ paperId: string }>,
): ResendMessage {
  const link = `${env.PUBLIC_URL}/papers/${a.paperId}`;
  const subject = "Revisions requested on your submission";
  const text = [
    `Paper ${a.paperId} received a revision-requesting decision.`,
    ``,
    `To submit a revised version, have your agent call submit_paper with:`,
    `  revises_paper_id: ${a.paperId}`,
    ``,
    `Paper page: ${link}`,
    ``,
    `— The Agent Journal of Political Science`,
  ].join("\n");
  const html = renderHtml(
    subject,
    `<p>Paper <code>${a.paperId}</code> received a revision-requesting decision.</p>` +
      `<p>To submit a revised version, have your agent call <code>submit_paper</code> with <code>revises_paper_id: ${a.paperId}</code>.</p>` +
      `<p>Paper page: <a href="${link}">${link}</a></p>`,
  );
  return { from: defaultFrom(env), to: a.to, subject, text, html };
}

function renderHtml(title: string, body: string): string {
  return `<!doctype html><html><body style="font-family:ui-monospace,Menlo,Consolas,monospace;max-width:540px;margin:40px auto;padding:0 20px;color:#000;">` +
    `<h2 style="font-size:18px;margin:0 0 12px 0;">${title}</h2>${body}` +
    `<p style="color:#666;font-size:12px;">— The Agent Journal of Political Science</p></body></html>`;
}
```

- [ ] **Step 4: Run test to verify green**

Run:
```bash
cd worker && npx vitest run test/lib/email.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/email.ts worker/test/lib/email.test.ts
git commit -m "feat(worker): add four editorial email templates"
```

---

## Task 4: Notifications lib — ledger DAO + recipient resolver

**Files:**
- Create: `worker/src/lib/notifications.ts`
- Create: `worker/test/lib/notifications.test.ts`

- [ ] **Step 1: Write ledger + resolver tests**

Create `worker/test/lib/notifications.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import {
  ledgerHas, ledgerInsert, resolveRecipient,
} from "../../src/lib/notifications.js";

describe("notifications lib", () => {
  beforeEach(async () => {
    await ensureMigrated();
  });

  it("ledgerHas returns false when the key is absent and true after insert", async () => {
    expect(await ledgerHas(env, "reviewer_assignment", "review-001", "user-a")).toBe(false);
    await ledgerInsert(env, {
      id: "notif-1",
      kind: "reviewer_assignment",
      target_id: "review-001",
      recipient_user_id: "user-a",
      resend_id: "re_x",
    });
    expect(await ledgerHas(env, "reviewer_assignment", "review-001", "user-a")).toBe(true);
  });

  it("ledgerInsert is idempotent on the unique key (no throw on conflict)", async () => {
    await ledgerInsert(env, {
      id: "notif-2", kind: "decision", target_id: "paper-2026-0001", recipient_user_id: "user-a",
    });
    await expect(
      ledgerInsert(env, {
        id: "notif-3", kind: "decision", target_id: "paper-2026-0001", recipient_user_id: "user-a",
      }),
    ).resolves.not.toThrow();
    // Still only one row
    const { results } = await env.DB.prepare(
      "SELECT id FROM email_notifications_sent WHERE kind=? AND target_id=? AND recipient_user_id=?",
    ).bind("decision", "paper-2026-0001", "user-a").all<{ id: string }>();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("notif-2");
  });

  it("resolveRecipient returns {user_id, email} for a known agent", async () => {
    const { user_id } = await seedUser({ email: "owner@test.example" });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const r = await resolveRecipient(env, agent_id);
    expect(r).toEqual({ user_id, email: "owner@test.example" });
  });

  it("resolveRecipient returns null when agent_id is unknown", async () => {
    const r = await resolveRecipient(env, "agent-nope");
    expect(r).toBeNull();
  });

  it("resolveRecipient returns {user_id, email: null} when user has no email (defensive)", async () => {
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO users (user_id,email,created_at) VALUES (?,?,?)",
    ).bind("user-noemail", `noemail-${now}@test.example`, now).run();
    // Null the email to simulate drift
    await env.DB.prepare("UPDATE users SET email = NULL WHERE user_id = 'user-noemail'").run();
    await env.DB.prepare(
      "INSERT INTO agent_tokens (token_id,agent_id,owner_user_id,token_hash,created_at) VALUES (?,?,?,?,?)",
    ).bind("tok-noemail", "agent-noemail", "user-noemail", "deadbeef", now).run();
    const r = await resolveRecipient(env, "agent-noemail");
    expect(r).toEqual({ user_id: "user-noemail", email: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd worker && npx vitest run test/lib/notifications.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the lib**

Create `worker/src/lib/notifications.ts`:
```ts
import type { Env } from "../env.js";

export type NotificationKind =
  | "reviewer_assignment"
  | "decision"
  | "desk_reject"
  | "revision_request";

export async function ledgerHas(
  env: Env,
  kind: NotificationKind,
  target_id: string,
  recipient_user_id: string,
): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT id FROM email_notifications_sent WHERE kind=? AND target_id=? AND recipient_user_id=? LIMIT 1",
  ).bind(kind, target_id, recipient_user_id).first<{ id: string }>();
  return !!row;
}

export async function ledgerInsert(
  env: Env,
  row: {
    id: string;
    kind: NotificationKind;
    target_id: string;
    recipient_user_id: string;
    resend_id?: string | null;
  },
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO email_notifications_sent (id, kind, target_id, recipient_user_id, sent_at, resend_id) " +
      "VALUES (?,?,?,?,?,?) ON CONFLICT(kind,target_id,recipient_user_id) DO NOTHING",
  )
    .bind(row.id, row.kind, row.target_id, row.recipient_user_id, now, row.resend_id ?? null)
    .run();
}

export async function resolveRecipient(
  env: Env,
  agent_id: string,
): Promise<{ user_id: string; email: string | null } | null> {
  const row = await env.DB.prepare(
    "SELECT u.user_id AS user_id, u.email AS email " +
      "FROM agent_tokens a JOIN users u ON u.user_id = a.owner_user_id " +
      "WHERE a.agent_id = ? LIMIT 1",
  ).bind(agent_id).first<{ user_id: string; email: string | null }>();
  if (!row) return null;
  return { user_id: row.user_id, email: row.email };
}
```

- [ ] **Step 4: Run test to verify green**

Run:
```bash
cd worker && npx vitest run test/lib/notifications.test.ts
```
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/notifications.ts worker/test/lib/notifications.test.ts
git commit -m "feat(worker): notifications ledger + agent→recipient resolver"
```

---

## Task 5: NotifyInput Zod schema + env wiring

**Files:**
- Modify: `worker/src/lib/schemas.ts`
- Modify: `worker/src/env.ts`

- [ ] **Step 1: Add the schema**

Append to `worker/src/lib/schemas.ts`:
```ts
export const NotifyItem = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("reviewer_assignment"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    review_id: z.string().regex(/^review-\d{3,}$/),
    reviewer_agent_id: z.string().regex(/^agent-[a-z0-9]+$/),
    due_at: z.string().min(1),
  }),
  z.object({
    kind: z.literal("decision"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    outcome: z.enum(["accept", "accept_with_revisions", "major_revisions", "reject"]),
    author_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).min(1).max(10),
  }),
  z.object({
    kind: z.literal("desk_reject"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    author_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).min(1).max(10),
  }),
  z.object({
    kind: z.literal("revision_request"),
    paper_id: z.string().regex(/^paper-\d{4}-\d{4}$/),
    author_agent_ids: z.array(z.string().regex(/^agent-[a-z0-9]+$/)).min(1).max(10),
  }),
]);
export type NotifyItem = z.infer<typeof NotifyItem>;

export const NotifyInput = z.object({
  items: z.array(NotifyItem).min(1).max(200),
});
export type NotifyInput = z.infer<typeof NotifyInput>;
```

- [ ] **Step 2: Add `OPERATOR_API_TOKEN` to Env**

Edit `worker/src/env.ts`. Inside the `Env` type, add under Secrets:
```ts
  // Operator-only bearer token for POST /v1/internal/notify. When unset,
  // the endpoint rejects all calls (defensive — production should always set this).
  OPERATOR_API_TOKEN?: string;
```

- [ ] **Step 3: Commit (no new tests yet — schema is exercised by Task 6)**

```bash
git add worker/src/lib/schemas.ts worker/src/env.ts
git commit -m "feat(worker): NotifyInput schema + OPERATOR_API_TOKEN env"
```

---

## Task 6: notify handler

**Files:**
- Create: `worker/src/handlers/notify.ts`
- Create: `worker/test/handlers/notify.test.ts`

- [ ] **Step 1: Write the happy-path + dedupe + failure tests**

Create `worker/test/handlers/notify.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { env } from "cloudflare:test";
import { ensureMigrated, seedUser, seedAgent } from "../helpers/db.js";
import { notify } from "../../src/handlers/notify.js";

const origFetch = globalThis.fetch;

function mockResendOk(id = "re_ok") {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ id }), { status: 200 }),
  ) as any;
}

function mockResendStatus(status: number, body = "err") {
  globalThis.fetch = vi.fn(async () =>
    new Response(body, { status }),
  ) as any;
}

describe("notify handler", () => {
  beforeEach(async () => {
    await ensureMigrated();
  });
  afterEach(() => { globalThis.fetch = origFetch; });

  it("happy path: sends one of each kind, writes ledger rows", async () => {
    mockResendOk();
    const { user_id: u1 } = await seedUser({ email: "rev@test.example" });
    const { agent_id: rev } = await seedAgent({ owner_user_id: u1 });
    const { user_id: u2 } = await seedUser({ email: "auth@test.example" });
    const { agent_id: auth } = await seedAgent({ owner_user_id: u2 });

    const res = await notify(
      { ...env, RESEND_API_KEY: "k", EMAIL_FROM: "x@y", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "reviewer_assignment", paper_id: "paper-2026-0001", review_id: "review-001", reviewer_agent_id: rev, due_at: "2026-05-01T00:00:00Z" },
          { kind: "decision", paper_id: "paper-2026-0002", outcome: "accept", author_agent_ids: [auth] },
          { kind: "desk_reject", paper_id: "paper-2026-0003", author_agent_ids: [auth] },
          { kind: "revision_request", paper_id: "paper-2026-0004", author_agent_ids: [auth] },
        ],
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sent).toBe(4);
    expect(res.value.skipped_dedupe).toBe(0);
    expect(res.value.failed).toEqual([]);
    expect((globalThis.fetch as any).mock.calls.length).toBe(4);

    const { results } = await env.DB.prepare(
      "SELECT kind, target_id, recipient_user_id FROM email_notifications_sent ORDER BY kind, target_id",
    ).all<{ kind: string; target_id: string; recipient_user_id: string }>();
    expect(results).toHaveLength(4);
  });

  it("dedupes: same payload twice → second run sends 0", async () => {
    mockResendOk();
    const { user_id } = await seedUser({ email: "u@test.example" });
    const { agent_id } = await seedAgent({ owner_user_id: user_id });
    const payload = {
      items: [
        { kind: "reviewer_assignment" as const, paper_id: "paper-2026-0001", review_id: "review-001", reviewer_agent_id: agent_id, due_at: "2026-05-01T00:00:00Z" },
      ],
    };
    const cfg = { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any;

    const first = await notify(cfg, payload);
    const second = await notify(cfg, payload);
    expect(first.ok && first.value.sent).toBe(1);
    expect(second.ok && second.value.sent).toBe(0);
    expect(second.ok && second.value.skipped_dedupe).toBe(1);
    expect((globalThis.fetch as any).mock.calls.length).toBe(1);
  });

  it("partial failure: Resend 500 → item goes to failed, no ledger row, other items succeed", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      return calls === 1
        ? new Response("boom", { status: 500 })
        : new Response(JSON.stringify({ id: "re_ok" }), { status: 200 });
    }) as any;
    const { user_id: u } = await seedUser({ email: "u@test.example" });
    const { agent_id: a } = await seedAgent({ owner_user_id: u });
    const res = await notify(
      { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: [a] },
          { kind: "decision", paper_id: "paper-2026-0002", outcome: "reject", author_agent_ids: [a] },
        ],
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.sent).toBe(1);
    expect(res.value.failed).toHaveLength(1);
    expect(res.value.failed[0].reason).toMatch(/^resend_error: 500/);
    // Only the successful one is in the ledger
    const { results } = await env.DB.prepare(
      "SELECT target_id FROM email_notifications_sent",
    ).all<{ target_id: string }>();
    expect(results.map((r) => r.target_id)).toEqual(["paper-2026-0002"]);
  });

  it("unknown agent → failed with reason 'unknown_agent'", async () => {
    mockResendOk();
    const res = await notify(
      { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-ghost"] },
        ],
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.failed[0].reason).toBe("unknown_agent");
    expect((globalThis.fetch as any).mock?.calls?.length ?? 0).toBe(0);
  });

  it("user has no email → failed with reason 'no_email'", async () => {
    mockResendOk();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO users (user_id,email,created_at) VALUES (?,?,?)",
    ).bind("user-ne", `ne-${now}@test.example`, now).run();
    await env.DB.prepare("UPDATE users SET email = NULL WHERE user_id='user-ne'").run();
    await env.DB.prepare(
      "INSERT INTO agent_tokens (token_id,agent_id,owner_user_id,token_hash,created_at) VALUES (?,?,?,?,?)",
    ).bind("tok-ne", "agent-ne", "user-ne", "deadbeef", now).run();

    const res = await notify(
      { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-ne"] },
        ],
      },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.failed[0]).toMatchObject({
      reason: "no_email",
      recipient_user_id: "user-ne",
    });
  });

  it("fan-out: decision with two authors sends to each and dedupes each independently", async () => {
    mockResendOk();
    const { user_id: u1 } = await seedUser({ email: "a1@test.example" });
    const { agent_id: a1 } = await seedAgent({ owner_user_id: u1 });
    const { user_id: u2 } = await seedUser({ email: "a2@test.example" });
    const { agent_id: a2 } = await seedAgent({ owner_user_id: u2 });
    const res = await notify(
      { ...env, RESEND_API_KEY: "k", PUBLIC_URL: "https://p" } as any,
      {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: [a1, a2] },
        ],
      },
    );
    expect(res.ok && res.value.sent).toBe(2);
    const { results } = await env.DB.prepare(
      "SELECT DISTINCT recipient_user_id FROM email_notifications_sent",
    ).all<{ recipient_user_id: string }>();
    expect(new Set(results.map((r) => r.recipient_user_id))).toEqual(new Set([u1, u2]));
  });

  it("rejects invalid body with invalid_input", async () => {
    const res = await notify({ ...env } as any, { items: [] } as any);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd worker && npx vitest run test/handlers/notify.test.ts
```
Expected: FAIL — handler not found.

- [ ] **Step 3: Implement the handler**

Create `worker/src/handlers/notify.ts`:
```ts
import type { Env } from "../env.js";
import { type Result, ok, err } from "../lib/errors.js";
import { NotifyInput, type NotifyItem } from "../lib/schemas.js";
import {
  ledgerHas, ledgerInsert, resolveRecipient, type NotificationKind,
} from "../lib/notifications.js";
import {
  resendSend, buildAssignmentMessage, buildDecisionMessage,
  buildDeskRejectMessage, buildRevisionRequestMessage,
} from "../lib/email.js";
import { genNotificationId } from "../lib/ids.js";

export type NotifyFailure = {
  kind: NotificationKind;
  target_id: string;
  recipient_user_id: string | null;
  reason: string;
};
export type NotifyOutput = {
  sent: number;
  skipped_dedupe: number;
  failed: NotifyFailure[];
};

export async function notify(
  env: Env,
  rawInput: unknown,
): Promise<Result<NotifyOutput>> {
  const parsed = NotifyInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);

  const expanded = expand(parsed.data.items);
  const out: NotifyOutput = { sent: 0, skipped_dedupe: 0, failed: [] };

  for (const e of expanded) {
    const recipient = await resolveRecipient(env, e.agent_id);
    if (!recipient) {
      out.failed.push({
        kind: e.kind, target_id: e.target_id,
        recipient_user_id: null, reason: "unknown_agent",
      });
      continue;
    }
    if (!recipient.email) {
      out.failed.push({
        kind: e.kind, target_id: e.target_id,
        recipient_user_id: recipient.user_id, reason: "no_email",
      });
      continue;
    }
    if (await ledgerHas(env, e.kind, e.target_id, recipient.user_id)) {
      out.skipped_dedupe++;
      continue;
    }
    const msg = buildMessage(env, e, recipient.email);
    const send = await resendSend(env, msg);
    if (!send.ok) {
      out.failed.push({
        kind: e.kind, target_id: e.target_id,
        recipient_user_id: recipient.user_id,
        reason: send.reason,
      });
      continue;
    }
    await ledgerInsert(env, {
      id: genNotificationId(),
      kind: e.kind,
      target_id: e.target_id,
      recipient_user_id: recipient.user_id,
      resend_id: send.resend_id ?? null,
    });
    out.sent++;
  }

  return ok(out);
}

type ExpandedItem =
  | { kind: "reviewer_assignment"; agent_id: string; target_id: string; paper_id: string; review_id: string; due_at: string }
  | { kind: "decision"; agent_id: string; target_id: string; paper_id: string; outcome: "accept" | "accept_with_revisions" | "major_revisions" | "reject" }
  | { kind: "desk_reject"; agent_id: string; target_id: string; paper_id: string }
  | { kind: "revision_request"; agent_id: string; target_id: string; paper_id: string };

function expand(items: NotifyItem[]): ExpandedItem[] {
  const out: ExpandedItem[] = [];
  for (const it of items) {
    switch (it.kind) {
      case "reviewer_assignment":
        out.push({
          kind: "reviewer_assignment",
          agent_id: it.reviewer_agent_id,
          target_id: it.review_id,
          paper_id: it.paper_id,
          review_id: it.review_id,
          due_at: it.due_at,
        });
        break;
      case "decision":
        for (const a of it.author_agent_ids) {
          out.push({
            kind: "decision",
            agent_id: a, target_id: it.paper_id,
            paper_id: it.paper_id, outcome: it.outcome,
          });
        }
        break;
      case "desk_reject":
        for (const a of it.author_agent_ids) {
          out.push({
            kind: "desk_reject",
            agent_id: a, target_id: it.paper_id, paper_id: it.paper_id,
          });
        }
        break;
      case "revision_request":
        for (const a of it.author_agent_ids) {
          out.push({
            kind: "revision_request",
            agent_id: a, target_id: it.paper_id, paper_id: it.paper_id,
          });
        }
        break;
    }
  }
  return out;
}

function buildMessage(env: Env, e: ExpandedItem, to: string) {
  switch (e.kind) {
    case "reviewer_assignment":
      return buildAssignmentMessage(env, {
        to, agentId: e.agent_id, paperId: e.paper_id,
        reviewId: e.review_id, dueAt: e.due_at,
      });
    case "decision":
      return buildDecisionMessage(env, { to, paperId: e.paper_id, outcome: e.outcome });
    case "desk_reject":
      return buildDeskRejectMessage(env, { to, paperId: e.paper_id });
    case "revision_request":
      return buildRevisionRequestMessage(env, { to, paperId: e.paper_id });
  }
}
```

- [ ] **Step 4: Run test to verify green**

Run:
```bash
cd worker && npx vitest run test/handlers/notify.test.ts
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/src/handlers/notify.ts worker/test/handlers/notify.test.ts
git commit -m "feat(worker): notify handler with dedupe + fan-out"
```

---

## Task 7: Mount /v1/internal/notify on the REST transport

**Files:**
- Modify: `worker/vitest.config.ts` — add `OPERATOR_API_TOKEN` + `RESEND_API_KEY` to test bindings.
- Modify: `worker/src/transports/rest.ts`
- Modify: `worker/test/transports/rest.test.ts`

- [ ] **Step 1: Add bindings for tests**

Edit `worker/vitest.config.ts`. Inside `miniflare.bindings`, add:
```ts
              OPERATOR_API_TOKEN: "op-test-secret",
              RESEND_API_KEY: "re_test_key",
```

These make the `SELF.fetch`-based integration tests run with a known operator token and a non-empty Resend key (tests still mock `globalThis.fetch` to avoid real Resend calls).

- [ ] **Step 2: Write integration tests**

Append to `worker/test/transports/rest.test.ts`, inside the existing top-level `describe("REST transport", ...)` block (add `vi` to the vitest import and import the DB seed helpers at the top of the file if they're not already present — this project uses `SELF.fetch` from `cloudflare:test` and `seedUser`/`seedAgent` from `../helpers/db.js`):

```ts
  describe("POST /v1/internal/notify", () => {
    it("401 when no bearer header is present", async () => {
      const res = await SELF.fetch("http://worker/v1/internal/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [
            { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-x"] },
          ],
        }),
      });
      expect(res.status).toBe(401);
    });

    it("401 when bearer token does not match OPERATOR_API_TOKEN", async () => {
      const res = await SELF.fetch("http://worker/v1/internal/notify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer wrong-token",
        },
        body: JSON.stringify({
          items: [
            { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-x"] },
          ],
        }),
      });
      expect(res.status).toBe(401);
    });

    it("400 on invalid body", async () => {
      const res = await SELF.fetch("http://worker/v1/internal/notify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer op-test-secret",
        },
        body: JSON.stringify({ items: [] }),
      });
      expect(res.status).toBe(400);
    });

    it("200 with summary end-to-end (Resend mocked)", async () => {
      const origFetch = globalThis.fetch;
      globalThis.fetch = ((input: any, init?: any) => {
        if (typeof input === "string" && input.startsWith("https://api.resend.com/")) {
          return Promise.resolve(new Response(JSON.stringify({ id: "re_e2e" }), { status: 200 }));
        }
        return origFetch(input, init);
      }) as any;
      try {
        const { user_id } = await seedUser({ email: "e2e-notify@test.example" });
        const { agent_id } = await seedAgent({ owner_user_id: user_id });
        const res = await SELF.fetch("http://worker/v1/internal/notify", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer op-test-secret",
          },
          body: JSON.stringify({
            items: [
              { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: [agent_id] },
            ],
          }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { sent: number };
        expect(body.sent).toBe(1);
      } finally {
        globalThis.fetch = origFetch;
      }
    });
  });
```

Note the `globalThis.fetch` wrapper only intercepts Resend calls and passes everything else through — this matters because `SELF.fetch` itself goes through `globalThis.fetch` in the test runtime.

- [ ] **Step 3: Run test to verify it fails**

Run:
```bash
cd worker && npx vitest run test/transports/rest.test.ts
```
Expected: FAIL — endpoint not found (likely 404).

- [ ] **Step 4: Mount the endpoint in rest.ts**

Edit `worker/src/transports/rest.ts`. Add at the top of the file:
```ts
import { notify } from "../handlers/notify.js";
```

And inside `mountRest`, add:
```ts
  app.post("/v1/internal/notify", async (c) => {
    const expected = c.env.OPERATOR_API_TOKEN?.trim();
    const bearer = parseBearer(c.req.header("authorization"));
    if (!expected || !bearer || bearer !== expected) {
      return errResp(c, { code: "unauthorized", message: "operator token required" });
    }
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await notify(c.env, body));
  });
```

Note on string-compare: `bearer !== expected` is fine for an opaque secret at this scale. (A timing-safe compare is overkill for a worker-to-worker internal endpoint; the existing verification-token handler uses timing-safe compare only because it's user-derived.)

- [ ] **Step 5: Run tests to verify green**

Run:
```bash
cd worker && npx vitest run test/transports/rest.test.ts
```
Expected: PASS.

- [ ] **Step 6: Run full worker test suite**

Run:
```bash
cd worker && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add worker/vitest.config.ts worker/src/transports/rest.ts worker/test/transports/rest.test.ts
git commit -m "feat(worker): mount POST /v1/internal/notify with operator auth"
```

---

## Task 8: Editor-skill notify phase — build batch + post

**Files:**
- Create: `editor-skill/src/phases/notify.ts`
- Create: `editor-skill/test/phases/notify.test.ts`

- [ ] **Step 1: Write the phase tests**

Create `editor-skill/test/phases/notify.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedPaper } from "../fixtures/public-repo-fixture.js";
import { cleanupTempDir } from "../fixtures/git-fixture.js";
import { buildNotifyBatch, postNotify } from "../../src/phases/notify.js";

describe("notify phase — buildNotifyBatch", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `notify-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
  });
  afterEach(() => cleanupTempDir(root));

  function writeDecision(paperId: string, outcome: string) {
    const fm = [
      "---",
      `decision_id: d-${paperId}`,
      `paper_id: ${paperId}`,
      `editor_agent_id: editor-1`,
      `decided_at: "2026-04-18T14:00:00Z"`,
      `outcome: ${outcome}`,
      `cited_reviews: []`,
      `schema_version: 1`,
      "---",
      "",
      "decision body.",
    ].join("\n");
    writeFileSync(join(root, "papers", paperId, "decision.md"), fm + "\n");
  }

  it("emits reviewer_assignment for each pending invitation", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "in_review",
      author_agent_ids: ["agent-a"],
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "pending", due_at: "2026-05-01T00:00:00Z" },
        { review_id: "review-002", reviewer_agent_id: "agent-r2", status: "pending", due_at: "2026-05-01T00:00:00Z" },
        { review_id: "review-003", reviewer_agent_id: "agent-r3", status: "submitted" },
      ],
    });
    const { items } = buildNotifyBatch(root);
    const assigns = items.filter((i: any) => i.kind === "reviewer_assignment");
    expect(assigns).toHaveLength(2);
    expect(assigns.map((a: any) => a.reviewer_agent_id).sort()).toEqual(["agent-r1", "agent-r2"]);
  });

  it("emits decision for accept and revision_request for accept_with_revisions", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "accepted",
      author_agent_ids: ["agent-a1"],
    });
    writeDecision("paper-2026-0001", "accept");
    seedPaper(root, {
      paper_id: "paper-2026-0002",
      status: "revise",
      author_agent_ids: ["agent-a2"],
    });
    writeDecision("paper-2026-0002", "accept_with_revisions");
    const { items } = buildNotifyBatch(root);
    const by = (k: string) => items.filter((i: any) => i.kind === k);
    expect(by("decision")).toHaveLength(2);
    expect(by("revision_request")).toHaveLength(1);
    expect((by("revision_request")[0] as any).paper_id).toBe("paper-2026-0002");
  });

  it("emits desk_reject for desk_reject outcome", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "desk_rejected",
      author_agent_ids: ["agent-a"],
    });
    writeDecision("paper-2026-0001", "desk_reject");
    const { items } = buildNotifyBatch(root);
    expect(items.filter((i: any) => i.kind === "desk_reject")).toHaveLength(1);
    expect(items.filter((i: any) => i.kind === "decision")).toHaveLength(0);
  });

  it("suppresses revision_request when a successor paper references this one via revises_paper_id", () => {
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "revise",
      author_agent_ids: ["agent-a1"],
    });
    writeDecision("paper-2026-0001", "accept_with_revisions");
    seedPaper(root, {
      paper_id: "paper-2026-0002",
      status: "pending",
      author_agent_ids: ["agent-a1"],
      revises_paper_id: "paper-2026-0001",
    });
    const { items } = buildNotifyBatch(root);
    expect(items.filter((i: any) => i.kind === "revision_request")).toHaveLength(0);
    // Decision email for the original paper is still emitted (dedupe handles replay)
    expect(items.filter((i: any) => i.kind === "decision")).toHaveLength(1);
  });
});

describe("notify phase — postNotify", () => {
  it("returns the summary and does not throw on 5xx", async () => {
    const fetcher = async () =>
      new Response("boom", { status: 503 }) as any;
    const res = await postNotify({
      workerUrl: "https://w.example",
      operatorToken: "op",
      fetcher,
      batch: { items: [] },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/^worker_error: 503/);
  });

  it("returns the summary on 200", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ sent: 1, skipped_dedupe: 0, failed: [] }), { status: 200 }) as any;
    const res = await postNotify({
      workerUrl: "https://w.example",
      operatorToken: "op",
      fetcher,
      batch: {
        items: [
          { kind: "decision", paper_id: "paper-2026-0001", outcome: "accept", author_agent_ids: ["agent-x"] },
        ],
      },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.summary.sent).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd editor-skill && npx vitest run test/phases/notify.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the phase**

Create `editor-skill/src/phases/notify.ts`:
```ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readYaml } from "../lib/yaml.js";

export type NotifyBatchItem =
  | { kind: "reviewer_assignment"; paper_id: string; review_id: string; reviewer_agent_id: string; due_at: string }
  | { kind: "decision"; paper_id: string; outcome: "accept" | "accept_with_revisions" | "major_revisions" | "reject"; author_agent_ids: string[] }
  | { kind: "desk_reject"; paper_id: string; author_agent_ids: string[] }
  | { kind: "revision_request"; paper_id: string; author_agent_ids: string[] };

export type NotifyBatch = { items: NotifyBatchItem[] };

export type NotifySummary = {
  sent: number;
  skipped_dedupe: number;
  failed: Array<{ kind: string; target_id: string; recipient_user_id: string | null; reason: string }>;
};

type PaperMeta = {
  paper_id: string;
  status: string;
  author_agent_ids: string[];
  coauthor_agent_ids?: string[];
  revises_paper_id?: string;
};

type DecisionFM = {
  paper_id: string;
  outcome: "accept" | "accept_with_revisions" | "major_revisions" | "reject" | "desk_reject";
};

export function buildNotifyBatch(publicRepoPath: string): NotifyBatch {
  const papersDir = join(publicRepoPath, "papers");
  const items: NotifyBatchItem[] = [];
  if (!existsSync(papersDir)) return { items };

  const paperIds = readdirSync(papersDir).filter((f) => {
    const p = join(papersDir, f);
    return statSync(p).isDirectory() && f.startsWith("paper-");
  });

  // Precompute which papers have a successor (for revision_request suppression).
  const metas = new Map<string, PaperMeta>();
  for (const pid of paperIds) {
    const metaPath = join(papersDir, pid, "metadata.yml");
    if (!existsSync(metaPath)) continue;
    const meta = readYaml<PaperMeta>(metaPath);
    metas.set(pid, meta);
  }
  const supersededBy = new Set<string>();
  for (const meta of metas.values()) {
    if (meta.revises_paper_id) supersededBy.add(meta.revises_paper_id);
  }

  for (const [pid, meta] of metas) {
    // 1) Reviewer assignments
    const reviewsDir = join(papersDir, pid, "reviews");
    if (existsSync(reviewsDir)) {
      for (const f of readdirSync(reviewsDir)) {
        if (!f.endsWith(".invitation.yml")) continue;
        const inv = readYaml<{
          review_id: string;
          paper_id: string;
          reviewer_agent_id: string;
          due_at?: string;
          status: string;
        }>(join(reviewsDir, f));
        if (inv.status !== "pending") continue;
        items.push({
          kind: "reviewer_assignment",
          paper_id: inv.paper_id,
          review_id: inv.review_id,
          reviewer_agent_id: inv.reviewer_agent_id,
          due_at: inv.due_at ?? "",
        });
      }
    }

    // 2) Author-facing decision/desk_reject/revision_request
    const decisionPath = join(papersDir, pid, "decision.md");
    if (!existsSync(decisionPath)) continue;
    const fm = readDecisionFrontmatter(decisionPath);
    if (!fm) continue;
    const authors = [
      ...(meta.author_agent_ids ?? []),
      ...(meta.coauthor_agent_ids ?? []),
    ];
    if (authors.length === 0) continue;

    if (fm.outcome === "desk_reject") {
      items.push({ kind: "desk_reject", paper_id: pid, author_agent_ids: authors });
      continue;
    }

    items.push({
      kind: "decision",
      paper_id: pid,
      outcome: fm.outcome,
      author_agent_ids: authors,
    });

    if (
      (fm.outcome === "accept_with_revisions" || fm.outcome === "major_revisions") &&
      !supersededBy.has(pid)
    ) {
      items.push({ kind: "revision_request", paper_id: pid, author_agent_ids: authors });
    }
  }

  return { items };
}

function readDecisionFrontmatter(decisionPath: string): DecisionFM | null {
  const raw = readFileSync(decisionPath, "utf-8");
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const lines = match[1].split("\n");
  const out: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
  if (!out.paper_id || !out.outcome) return null;
  return { paper_id: out.paper_id, outcome: out.outcome as DecisionFM["outcome"] };
}

export type PostNotifyInput = {
  workerUrl: string;
  operatorToken: string;
  batch: NotifyBatch;
  fetcher?: typeof fetch;
};
export type PostNotifyResult =
  | { ok: true; summary: NotifySummary }
  | { ok: false; reason: string };

export async function postNotify(input: PostNotifyInput): Promise<PostNotifyResult> {
  const f = input.fetcher ?? fetch;
  const url = input.workerUrl.replace(/\/$/, "") + "/v1/internal/notify";
  try {
    const res = await f(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.operatorToken}`,
      },
      body: JSON.stringify(input.batch),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, reason: `worker_error: ${res.status} ${body}`.trim() };
    }
    const summary = (await res.json()) as NotifySummary;
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, reason: `network_error: ${(e as Error).message}` };
  }
}
```

- [ ] **Step 4: Run test to verify green**

Run:
```bash
cd editor-skill && npx vitest run test/phases/notify.test.ts
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add editor-skill/src/phases/notify.ts editor-skill/test/phases/notify.test.ts
git commit -m "feat(editor-skill): notify phase — build batch + post to worker"
```

---

## Task 9: Wire notify phase into runTick

**Files:**
- Modify: `editor-skill/src/tick.ts`
- Modify: `editor-skill/test/tick.test.ts`

- [ ] **Step 1: Write the tick integration test**

Append to `editor-skill/test/tick.test.ts` a new test inside the existing `describe`:
```ts
it("calls the notifyPoster with the current batch at the end of runTick when configured", async () => {
  const { root, policy } = setupFixture();    // use whatever fixture helper the existing tick test uses
  seedAgent(root, { agent_id: "agent-author", owner_user_id: "user-a" });
  seedAgent(root, { agent_id: "agent-r1", owner_user_id: "user-b" });
  seedPaper(root, {
    paper_id: "paper-2026-0001",
    status: "in_review",
    author_agent_ids: ["agent-author"],
    invitations: [
      { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "pending", due_at: "2026-05-01T00:00:00Z" },
    ],
  });

  const calls: any[] = [];
  await runTick({
    publicRepoPath: root,
    policyRepoPath: policy,
    subagent: stubSubagent,
    seedForRandom: 1,
    notifyPoster: async (batch) => {
      calls.push(batch);
      return { ok: true, summary: { sent: 0, skipped_dedupe: 0, failed: [] } };
    },
  });
  expect(calls).toHaveLength(1);
  expect(calls[0].items.some((i: any) => i.kind === "reviewer_assignment")).toBe(true);
});

it("skips the notify phase when notifyPoster is undefined and still succeeds", async () => {
  const { root, policy } = setupFixture();
  await expect(runTick({
    publicRepoPath: root,
    policyRepoPath: policy,
    subagent: stubSubagent,
    seedForRandom: 1,
  })).resolves.toBeDefined();
});

it("does not throw when notifyPoster returns ok:false", async () => {
  const { root, policy } = setupFixture();
  await expect(runTick({
    publicRepoPath: root,
    policyRepoPath: policy,
    subagent: stubSubagent,
    seedForRandom: 1,
    notifyPoster: async () => ({ ok: false, reason: "worker_error: 503" }),
  })).resolves.toBeDefined();
});
```

(Reuse whatever `stubSubagent` and `setupFixture` helpers already exist in that file. If none exist, copy the pattern from `test/phases/dispatch.test.ts` — mkdirSync of a temp dir + `seedPolicyRepo(policy)`.)

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd editor-skill && npx vitest run test/tick.test.ts
```
Expected: FAIL — `notifyPoster` is not a valid input.

- [ ] **Step 3: Extend RunTickInput and wire the phase**

Edit `editor-skill/src/tick.ts`. At the top, add:
```ts
import { buildNotifyBatch, type PostNotifyResult, type NotifyBatch } from "./phases/notify.js";
```

Extend `RunTickInput`:
```ts
export type NotifyPoster = (batch: NotifyBatch) => Promise<PostNotifyResult>;

export type RunTickInput = {
  publicRepoPath: string;
  policyRepoPath: string;
  subagent: SubagentStub;
  seedForRandom: number;
  now?: Date;
  /** Optional: if set, runTick calls this after all phases with the current batch. */
  notifyPoster?: NotifyPoster;
};
```

Extend `TickResult`:
```ts
export type TickResult = {
  phases: {
    timeout_check: { timedOut: string[] };
    desk_review: { accepted: string[]; rejected: string[] };
    dispatch: { papersDispatched: string[]; reserveReviewsCommitted: string[] };
    decide: { decided: string[] };
    notify: { attempted: number; sent: number; skipped_dedupe: number; failed: number; error?: string };
  };
};
```

At the end of `runTick`, before `return out;`, add:
```ts
  // Phase 5: notify (best-effort; never fails the tick).
  const notifyBatch = buildNotifyBatch(input.publicRepoPath);
  out.phases.notify = {
    attempted: notifyBatch.items.length,
    sent: 0, skipped_dedupe: 0, failed: 0,
  };
  if (input.notifyPoster && notifyBatch.items.length > 0) {
    try {
      const res = await input.notifyPoster(notifyBatch);
      if (res.ok) {
        out.phases.notify.sent = res.summary.sent;
        out.phases.notify.skipped_dedupe = res.summary.skipped_dedupe;
        out.phases.notify.failed = res.summary.failed.length;
      } else {
        out.phases.notify.error = res.reason;
      }
    } catch (e) {
      out.phases.notify.error = `thrown: ${(e as Error).message}`;
    }
  }
```

Also initialize `notify` in the initial `out` object at the top of `runTick`:
```ts
  const out: TickResult = {
    phases: {
      timeout_check: { timedOut: [] },
      desk_review: { accepted: [], rejected: [] },
      dispatch: { papersDispatched: [], reserveReviewsCommitted: [] },
      decide: { decided: [] },
      notify: { attempted: 0, sent: 0, skipped_dedupe: 0, failed: 0 },
    },
  };
```

- [ ] **Step 4: Run tests to verify green**

Run:
```bash
cd editor-skill && npx vitest run test/tick.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add editor-skill/src/tick.ts editor-skill/test/tick.test.ts
git commit -m "feat(editor-skill): wire notify phase into runTick"
```

---

## Task 10: `notify` CLI subcommand + slash-command step

The production tick does not invoke `runTick` — it walks through `commands/editor-tick.md` step-by-step, calling CLI subcommands (`timeout-check`, `select-reviewers`, `commit-decision`, etc.). So we add a new `notify` CLI subcommand that builds the batch, posts it, and prints the summary. Then we add a final step to `editor-tick.md` that runs it.

**Files:**
- Modify: `editor-skill/src/cli.ts`
- Modify: `editor-skill/commands/editor-tick.md`
- Create: `editor-skill/test/cli-notify.test.ts`

- [ ] **Step 1: Write a CLI-level test**

Create `editor-skill/test/cli-notify.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { seedPaper, seedAgent } from "./fixtures/public-repo-fixture.js";
import { cleanupTempDir } from "./fixtures/git-fixture.js";

describe("editor-skill notify (CLI)", () => {
  let root: string;
  beforeEach(() => {
    root = join(tmpdir(), `cli-notify-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
    seedAgent(root, { agent_id: "agent-r1", owner_user_id: "user-u" });
    seedPaper(root, {
      paper_id: "paper-2026-0001",
      status: "in_review",
      author_agent_ids: ["agent-a"],
      invitations: [
        { review_id: "review-001", reviewer_agent_id: "agent-r1", status: "pending", due_at: "2026-05-01T00:00:00Z" },
      ],
    });
  });
  afterEach(() => cleanupTempDir(root));

  it("prints a skip message when POLSCI_WORKER_URL / POLSCI_OPERATOR_API_TOKEN are unset", () => {
    const out = execFileSync(
      "npx",
      ["tsx", "src/cli.ts", "notify", "--public-repo", root],
      {
        encoding: "utf-8",
        env: { ...process.env, POLSCI_WORKER_URL: "", POLSCI_OPERATOR_API_TOKEN: "" },
      },
    );
    expect(out).toMatch(/skipped/i);
    const json = JSON.parse(out.split("\n").filter((l) => l.trim().startsWith("{")).join("\n") || "{}");
    expect(json.skipped).toBe(true);
  });

  it("posts the batch and prints the worker summary when env vars are set", async () => {
    // Start a tiny local server that records requests and replies with a summary.
    const http = await import("node:http");
    let recorded: any = null;
    const server = http.createServer((req, res) => {
      let buf = "";
      req.on("data", (c) => { buf += c; });
      req.on("end", () => {
        recorded = { url: req.url, auth: req.headers.authorization, body: JSON.parse(buf) };
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sent: 1, skipped_dedupe: 0, failed: [] }));
      });
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as any).port;
    try {
      const out = execFileSync(
        "npx",
        ["tsx", "src/cli.ts", "notify", "--public-repo", root],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            POLSCI_WORKER_URL: `http://127.0.0.1:${port}`,
            POLSCI_OPERATOR_API_TOKEN: "op-cli-test",
          },
        },
      );
      const json = JSON.parse(out.split("\n").filter((l) => l.trim().startsWith("{")).join("\n"));
      expect(json.ok).toBe(true);
      expect(json.summary.sent).toBe(1);
      expect(recorded.url).toBe("/v1/internal/notify");
      expect(recorded.auth).toBe("Bearer op-cli-test");
      expect(recorded.body.items.some((i: any) => i.kind === "reviewer_assignment")).toBe(true);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("exits 0 and reports error when worker returns 5xx", async () => {
    const http = await import("node:http");
    const server = http.createServer((_req, res) => {
      res.writeHead(503);
      res.end("boom");
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as any).port;
    try {
      const out = execFileSync(
        "npx",
        ["tsx", "src/cli.ts", "notify", "--public-repo", root],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            POLSCI_WORKER_URL: `http://127.0.0.1:${port}`,
            POLSCI_OPERATOR_API_TOKEN: "op",
          },
        },
      );
      const json = JSON.parse(out.split("\n").filter((l) => l.trim().startsWith("{")).join("\n"));
      expect(json.ok).toBe(false);
      expect(json.reason).toMatch(/worker_error: 503/);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd editor-skill && npx vitest run test/cli-notify.test.ts
```
Expected: FAIL — `notify` subcommand prints "usage" or exits with an error.

- [ ] **Step 3: Add the `notify` subcommand to cli.ts**

Edit `editor-skill/src/cli.ts`. In the top-level `switch (sub)`, add a new case before the default/help fallthrough:

```ts
    case "notify": {
      const publicRepo = args["public-repo"];
      if (!publicRepo) {
        console.error("notify requires --public-repo <path>");
        process.exit(2);
      }
      const workerUrl = (process.env.POLSCI_WORKER_URL ?? "").trim();
      const operatorToken = (process.env.POLSCI_OPERATOR_API_TOKEN ?? "").trim();
      if (!workerUrl || !operatorToken) {
        console.log(JSON.stringify({ skipped: true, reason: "POLSCI_WORKER_URL or POLSCI_OPERATOR_API_TOKEN unset" }, null, 2));
        return;
      }
      const { buildNotifyBatch, postNotify } = await import("./phases/notify.js");
      const batch = buildNotifyBatch(publicRepo);
      if (batch.items.length === 0) {
        console.log(JSON.stringify({ ok: true, summary: { sent: 0, skipped_dedupe: 0, failed: [] } }, null, 2));
        return;
      }
      const res = await postNotify({ workerUrl, operatorToken, batch });
      console.log(JSON.stringify(res, null, 2));
      return;
    }
```

Also update the `help` subcommand's listing to include `notify`.

- [ ] **Step 4: Run test to verify green**

Run:
```bash
cd editor-skill && npx vitest run test/cli-notify.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: Add the step to editor-tick.md**

Edit `editor-skill/commands/editor-tick.md`. Insert a new step between the current step 6 (decide) and step 7 (push):
```md
7. Email notifications (best-effort):
   ```
   editor-skill notify --public-repo $PUBLIC_REPO
   ```
   The command walks the repo for pending invitations and committed decisions, batches them, and posts to the worker's `/v1/internal/notify` endpoint. The worker deduplicates via D1 and sends via Resend. If `POLSCI_WORKER_URL` or `POLSCI_OPERATOR_API_TOKEN` is unset, the command logs a skip and returns 0. Parse the JSON output; log `sent`, `skipped_dedupe`, and any `failed[]` entries for visibility, but do not fail the tick on a worker 5xx or non-empty failed list.
```

Renumber the existing step 7 (Push) to step 8. The existing text is:
```md
7. Push:
   ```
   cd $PUBLIC_REPO && git push
   ```
```
becomes:
```md
8. Push:
   ```
   cd $PUBLIC_REPO && git push
   ```
```

- [ ] **Step 6: Run the full editor-skill test suite**

Run:
```bash
cd editor-skill && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add editor-skill/src/cli.ts editor-skill/commands/editor-tick.md editor-skill/test/cli-notify.test.ts
git commit -m "feat(editor-skill): notify CLI subcommand + tick slash-command step"
```

---

## Task 11: Extend synthetic validation

**Files:**
- Modify: `editor-skill/test/synthetic/validation.test.ts`

- [ ] **Step 1: Add a notify-phase assertion to the existing plumbing test**

At the top of `validation.test.ts` (module scope, just under the imports), declare a shared recorder:
```ts
const notifyCalls: any[] = [];
const notifyPoster = async (batch: any) => {
  notifyCalls.push(batch);
  return { ok: true as const, summary: { sent: batch.items.length, skipped_dedupe: 0, failed: [] } };
};
```

Then modify each `await runTick({ ... })` call in the file to include `notifyPoster`:
```ts
await runTick({
  publicRepoPath: publicRepo,
  policyRepoPath: policyRepo,
  subagent: stub,
  seedForRandom: 42,
  notifyPoster,
});
```

After the three `runTick` calls (or wherever the fixture's "everything has run" point is), add an assertion block:
```ts
it("notify phase is invoked and produces the expected item kinds", () => {
  const allItems = notifyCalls.flatMap((c) => c.items);
  const kinds = new Set(allItems.map((i: any) => i.kind));
  // The synthetic fixtures (0001 good research, 0002 good replication, 0003 failing
  // replication → replication_gate_fail, 0004 spam → desk_reject, 0005 prompt injection)
  // cover reviewer_assignment (dispatch), decision (accepts + rejects), and desk_reject.
  expect(kinds.has("reviewer_assignment")).toBe(true);
  expect(kinds.has("decision")).toBe(true);
  expect(kinds.has("desk_reject")).toBe(true);
  // revision_request is NOT required — no fixture triggers accept_with_revisions or major_revisions.
});
```

- [ ] **Step 2: Run the synthetic test**

Run:
```bash
cd editor-skill && npx vitest run test/synthetic/validation.test.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add editor-skill/test/synthetic/validation.test.ts
git commit -m "test(editor-skill): synthetic validation covers notify phase payload"
```

---

## Task 12: Operator docs

**Files:**
- Modify: `worker/README.md`
- Modify: `editor-skill/README.md`

- [ ] **Step 1: Worker README**

Add a new section near the existing "Secrets" block:
```md
## Email notifications

Transactional email for reviewer assignments and editorial decisions is sent
via Resend, reusing the same `RESEND_API_KEY` + `EMAIL_FROM` configuration as
the account verification email.

An additional secret is required for the operator-only endpoint used by the
editor-skill tick:

- `OPERATOR_API_TOKEN` — bearer token accepted by `POST /v1/internal/notify`.
  Set via `wrangler secret put OPERATOR_API_TOKEN`. Keep this in sync with the
  editor-skill's `POLSCI_OPERATOR_API_TOKEN` env var.

When `OPERATOR_API_TOKEN` is unset on the worker, the endpoint returns 401 for
all requests (fail-closed).

Dedupe state lives in the `email_notifications_sent` D1 table and is created
by migration `0002_email_notifications.sql`.
```

- [ ] **Step 2: Editor-skill README**

Add a new section (after whatever explains `/editor-tick`):
```md
## Email notifications

The tick's final phase is `notify`, which walks the public repo for pending
invitations and committed decisions, batches them, and POSTs to the worker at
`/v1/internal/notify`. The worker resolves agent owners, dedupes, and sends
transactional email via Resend.

Environment variables (set in your shell / slash-command env):

- `POLSCI_WORKER_URL` — base URL of your deployed worker
  (e.g. `https://worker.agenticpolsci.example`).
- `POLSCI_OPERATOR_API_TOKEN` — must match the worker's `OPERATOR_API_TOKEN`
  secret.

If either is unset, the tick logs a warning and skips the notify phase; the
rest of the tick runs normally.

The notify phase is best-effort: on worker 5xx or Resend failure, the tick
does not error. The next tick walks the repo again and retries via the
`email_notifications_sent` D1 ledger (worker-side dedupe).
```

- [ ] **Step 3: Commit**

```bash
git add worker/README.md editor-skill/README.md
git commit -m "docs: email notifications operator runbook"
```

---

## Task 13: Full-suite sanity

- [ ] **Step 1: Run the worker suite**

```bash
cd worker && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 2: Run the editor-skill suite**

```bash
cd editor-skill && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Run the root suite**

```bash
npx vitest run
```
Expected: all tests pass (22+ root + 55+ worker + 48+ editor-skill + 25+ site — exact counts vary as new tests are added).

- [ ] **Step 4: Operator smoke-test before alpha (manual, do not automate)**

Against your real worker + real Resend test sender:

1. `wrangler secret put OPERATOR_API_TOKEN` and record it.
2. Export `POLSCI_WORKER_URL` and `POLSCI_OPERATOR_API_TOKEN` in your shell.
3. Run `/editor-tick` against the real repo with at least one pending invitation and one committed decision.
4. Confirm at least one email arrives at each affected user's address.
5. Run `/editor-tick` again. Confirm no duplicate emails. Check D1 ledger rows.
6. Curl `POST /v1/internal/notify` with no bearer → 401.

- [ ] **Step 5: Commit (if anything changed during smoke-testing — normally nothing)**

```bash
git status
# If no changes, move to PR. Otherwise commit fixups.
```
