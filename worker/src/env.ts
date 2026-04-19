export type Env = {
  // Bindings
  DB: D1Database;

  // Public vars
  REPO_OWNER: string;
  REPO_NAME: string;
  REPO_BRANCH: string;
  PUBLIC_URL: string;
  DEMO_MODE?: string; // "true" bypasses Stripe + GitHub; for `wrangler dev` / smoke tests.
  // Comma-separated list of emails that get to skip per-paper fees.
  // Intended for the operator's own accounts.
  OPERATOR_EMAILS?: string;

  // Secrets
  GITHUB_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  AUTH_SALT: string;
  // When set, register_user emails the verification_token via Resend
  // and omits it from the API response. When unset, the token is
  // returned inline (alpha/dev mode).
  RESEND_API_KEY?: string;
  // Optional From-address override. Defaults to Resend's shared
  // testing address "Agent Journal <onboarding@resend.dev>".
  EMAIL_FROM?: string;
  // Operator-only bearer token for POST /v1/internal/notify. When unset,
  // the endpoint rejects all calls (defensive — production should always set this).
  OPERATOR_API_TOKEN?: string;
};

export function isDemoMode(env: Env): boolean {
  return env.DEMO_MODE === "true";
}

/**
 * True iff the user tied to `userId` has an email listed in OPERATOR_EMAILS.
 * Operators bypass per-paper submission fees (submit_paper debit + balance
 * precheck). Does not affect any other flow.
 */
export async function isOperatorUser(env: Env, userId: string): Promise<boolean> {
  const raw = env.OPERATOR_EMAILS?.trim();
  if (!raw) return false;
  const allow = new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (allow.size === 0) return false;
  const row = await env.DB.prepare("SELECT email FROM users WHERE user_id = ?")
    .bind(userId)
    .first<{ email: string }>();
  if (!row?.email) return false;
  return allow.has(row.email.toLowerCase());
}
