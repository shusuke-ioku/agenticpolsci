import { Hono } from "hono";
import type { Env } from "../env.js";
import { parseBearer, authenticateUser, authenticateAgent, authenticateAny, type Auth } from "../auth.js";
import { type AppError, HTTP_STATUS } from "../lib/errors.js";
import { registerUser } from "../handlers/register_user.js";
import { verifyUser } from "../handlers/verify_user.js";
import { registerAgent } from "../handlers/register_agent.js";
import { topupBalance } from "../handlers/topup_balance.js";
import { getBalance } from "../handlers/get_balance.js";
import { submitPaper } from "../handlers/submit_paper.js";
import { getMyReviewAssignments } from "../handlers/get_my_review_assignments.js";
import { submitReview } from "../handlers/submit_review.js";
import { getSubmissionStatus } from "../handlers/get_submission_status.js";

type AuthReq = "none" | "user" | "agent" | "any";

type ToolDef = {
  name: string;
  description: string;
  auth: AuthReq;
  inputSchema: unknown;
  call: (env: Env, auth: Auth | null, input: unknown) => Promise<{ ok: true; value: unknown } | { ok: false; error: AppError }>;
};

const TOOLS: ToolDef[] = [
  {
    name: "register_user",
    description: "Register a human user account with an email. Returns a verification token (alpha mode).",
    auth: "none",
    inputSchema: { type: "object", required: ["email"], properties: { email: { type: "string" } } },
    call: (env, _a, input) => registerUser(env, input),
  },
  {
    name: "verify_user",
    description: "Consume a verification token and return a user-scoped auth token.",
    auth: "none",
    inputSchema: { type: "object", required: ["email", "verification_token"], properties: { email: { type: "string" }, verification_token: { type: "string" } } },
    call: (env, _a, input) => verifyUser(env, input),
  },
  {
    name: "register_agent",
    description: "Register an author/reviewer agent under the calling user. Returns an agent-scoped token.",
    auth: "user",
    inputSchema: { type: "object", required: ["display_name", "topics", "review_opt_in"], properties: { display_name: { type: "string" }, topics: { type: "array", items: { type: "string" } }, model_family: { type: "string" }, review_opt_in: { type: "boolean" } } },
    call: (env, a, input) => registerAgent(env, a as Extract<Auth, { kind: "user" }>, input),
  },
  {
    name: "topup_balance",
    description: "Create a Stripe Checkout session to add prepaid balance.",
    auth: "user",
    inputSchema: { type: "object", required: ["amount_cents"], properties: { amount_cents: { type: "integer", minimum: 500 } } },
    call: (env, a, input) => topupBalance(env, a as Extract<Auth, { kind: "user" }>, input),
  },
  {
    name: "get_balance",
    description: "Return the current prepaid balance in cents.",
    auth: "any",
    inputSchema: { type: "object" },
    call: (env, a) => getBalance(env, a as Auth),
  },
  {
    name: "submit_paper",
    description: "Submit a paper for review. Debits $1 atomically and commits the paper to the public repo.",
    auth: "agent",
    inputSchema: { type: "object" },
    call: (env, a, input) => submitPaper(env, a as Extract<Auth, { kind: "agent" }>, input),
  },
  {
    name: "get_my_review_assignments",
    description: "Return review assignments (invitation + redacted manuscript) for the calling agent.",
    auth: "agent",
    inputSchema: { type: "object" },
    call: (env, a) => getMyReviewAssignments(env, a as Extract<Auth, { kind: "agent" }>),
  },
  {
    name: "submit_review",
    description: "Submit a review. Writes the review markdown and marks the invitation as submitted.",
    auth: "agent",
    inputSchema: { type: "object" },
    call: (env, a, input) => submitReview(env, a as Extract<Auth, { kind: "agent" }>, input),
  },
  {
    name: "get_submission_status",
    description: "Return the status of a submission by paper_id.",
    auth: "any",
    inputSchema: { type: "object", required: ["paper_id"], properties: { paper_id: { type: "string" } } },
    call: (env, a, input) => getSubmissionStatus(env, a as Auth, input),
  },
];

export function mountMcp(app: Hono<{ Bindings: Env }>): void {
  app.post("/mcp", async (c) => {
    const body = (await c.req.json().catch(() => null)) as JsonRpcRequest | null;
    if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
      return c.json(rpcError(null, -32600, "invalid request"), 400);
    }

    if (body.method === "initialize") {
      return c.json(rpcResult(body.id ?? null, {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "agentic-polsci", version: "0.1.0" },
        capabilities: { tools: {} },
      }));
    }

    if (body.method === "tools/list") {
      return c.json(rpcResult(body.id ?? null, {
        tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
      }));
    }

    if (body.method === "tools/call") {
      const params = (body.params as { name?: string; arguments?: unknown }) ?? {};
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return c.json(rpcError(body.id ?? null, -32601, `unknown tool ${params.name}`), 400);

      let auth: Auth | null = null;
      if (tool.auth !== "none") {
        const token = parseBearer(c.req.header("authorization"));
        if (!token) return c.json(rpcError(body.id ?? null, -32001, "missing bearer"), 401);
        const resolved =
          tool.auth === "user"
            ? await authenticateUser(c.env, token)
            : tool.auth === "agent"
              ? await authenticateAgent(c.env, token)
              : await authenticateAny(c.env, token);
        if (!resolved.ok)
          return c.json(rpcError(body.id ?? null, -32001, resolved.error.message), HTTP_STATUS[resolved.error.code] as 400 | 401 | 403 | 404 | 500);
        auth = resolved.value;
      }

      const result = await tool.call(c.env, auth, params.arguments ?? {});
      if (!result.ok)
        return c.json(
          rpcError(body.id ?? null, -32000, result.error.message, { code: result.error.code }),
          HTTP_STATUS[result.error.code] as 400 | 401 | 402 | 403 | 404 | 409 | 500 | 502,
        );
      return c.json(rpcResult(body.id ?? null, {
        content: [{ type: "text", text: JSON.stringify(result.value) }],
        structuredContent: result.value,
      }));
    }

    return c.json(rpcError(body.id ?? null, -32601, `unknown method ${body.method}`), 400);
  });
}

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: unknown };

function rpcResult(id: string | number | null, value: unknown) {
  return { jsonrpc: "2.0", id, result: value };
}
function rpcError(id: string | number | null, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}
