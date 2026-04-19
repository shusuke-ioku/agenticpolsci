import { Hono } from "hono";
import type { Context } from "hono";
import type { Env } from "../env.js";
import { HTTP_STATUS, type AppError } from "../lib/errors.js";
import {
  parseBearer,
  authenticateUser,
  authenticateAgent,
  authenticateAny,
} from "../auth.js";
import { registerUser } from "../handlers/register_user.js";
import { verifyUser } from "../handlers/verify_user.js";
import { registerAgent } from "../handlers/register_agent.js";
import { topupBalance } from "../handlers/topup_balance.js";
import { handleStripeWebhook } from "../handlers/stripe_webhook.js";
import { getBalance } from "../handlers/get_balance.js";
import { submitPaper } from "../handlers/submit_paper.js";
import { getMyReviewAssignments } from "../handlers/get_my_review_assignments.js";
import { submitReview } from "../handlers/submit_review.js";
import { getSubmissionStatus } from "../handlers/get_submission_status.js";
import { notify } from "../handlers/notify.js";

type C = Context<{ Bindings: Env }>;

export function mountRest(app: Hono<{ Bindings: Env }>): void {
  app.post("/v1/register_user", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await registerUser(c.env, body));
  });

  app.post("/v1/verify_user", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await verifyUser(c.env, body));
  });

  app.post("/v1/register_agent", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateUser(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await registerAgent(c.env, auth.value, body));
  });

  app.post("/v1/topup_balance", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateUser(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await topupBalance(c.env, auth.value, body));
  });

  app.post("/webhooks/stripe", async (c) => {
    const raw = await c.req.text();
    const sig = c.req.header("stripe-signature") ?? null;
    const res = await handleStripeWebhook(c.env, raw, sig);
    if (!res.ok) return errResp(c, res.error);
    return c.json(res.value, 200);
  });

  app.get("/v1/balance", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateAny(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    return toResponse(c, await getBalance(c.env, auth.value));
  });

  app.post("/v1/submit_paper", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateAgent(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await submitPaper(c.env, auth.value, body));
  });

  app.get("/v1/my_review_assignments", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateAgent(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    return toResponse(c, await getMyReviewAssignments(c.env, auth.value));
  });

  app.post("/v1/submit_review", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateAgent(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await submitReview(c.env, auth.value, body));
  });

  app.post("/v1/internal/notify", async (c) => {
    const expected = c.env.OPERATOR_API_TOKEN?.trim();
    const bearer = parseBearer(c.req.header("authorization"));
    if (!expected || !bearer || bearer !== expected) {
      return errResp(c, { code: "unauthorized", message: "operator token required" });
    }
    const body = await c.req.json().catch(() => ({}));
    return toResponse(c, await notify(c.env, body));
  });

  app.get("/v1/submission/:paper_id", async (c) => {
    const token = parseBearer(c.req.header("authorization"));
    if (!token) return errResp(c, { code: "unauthorized", message: "missing bearer" });
    const auth = await authenticateAny(c.env, token);
    if (!auth.ok) return errResp(c, auth.error);
    return toResponse(
      c,
      await getSubmissionStatus(c.env, auth.value, { paper_id: c.req.param("paper_id") }),
    );
  });
}

function toResponse<T>(
  c: C,
  r: { ok: true; value: T } | { ok: false; error: AppError },
) {
  if (r.ok) return c.json(r.value, 200);
  return errResp(c, r.error);
}

function errResp(c: C, e: AppError) {
  return c.json({ error: e }, HTTP_STATUS[e.code] as 400 | 401 | 402 | 403 | 404 | 409 | 500 | 502);
}
