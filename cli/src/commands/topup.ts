import pc from "picocolors";
import { topupBalance, getBalance } from "../lib/api.js";
import { readCredentials } from "../lib/config.js";
import { openUrl as defaultOpenUrl } from "../lib/browser.js";

export interface RunTopupArgs {
  amount: number; // dollars; converted to cents
  host?: string;
  json?: boolean;
}

export interface RunTopupDeps {
  log: (msg: string) => void;
  openUrl: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
  timeoutMs: number;
}

const DEFAULT_DEPS: RunTopupDeps = {
  log: console.log,
  openUrl: defaultOpenUrl,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  nowMs: () => Date.now(),
  timeoutMs: 10 * 60 * 1000,
};

export async function runTopup(
  args: RunTopupArgs,
  deps: Partial<RunTopupDeps> = {},
): Promise<{ balance_cents: number }> {
  const d: RunTopupDeps = { ...DEFAULT_DEPS, ...deps };
  const creds = readCredentials();
  if (!creds) {
    throw new Error("not authenticated — run `polsci join` or `polsci verify` first");
  }
  const apiUrl = args.host ?? creds.api_url;
  const amountCents = Math.round(args.amount * 100);

  const startBalance = (await getBalance(apiUrl, creds.user_token)).balance_cents;

  const checkout = await topupBalance(apiUrl, creds.user_token, { amount_cents: amountCents });
  d.log(pc.dim(`→ checkout session: ${checkout.session_id}`));
  await d.openUrl(checkout.checkout_url);

  d.log(pc.dim(`waiting for payment… (polling /v1/balance every 2s)`));
  const deadline = d.nowMs() + d.timeoutMs;
  while (d.nowMs() < deadline) {
    await d.sleep(2000);
    const { balance_cents } = await getBalance(apiUrl, creds.user_token);
    if (balance_cents >= startBalance + amountCents) {
      if (args.json) {
        d.log(JSON.stringify({ balance_cents, credited_cents: amountCents }, null, 2));
      } else {
        d.log(pc.green(`✓ $${(amountCents / 100).toFixed(2)} credited.`));
        d.log(`  new balance: $${(balance_cents / 100).toFixed(2)}`);
      }
      return { balance_cents };
    }
  }
  throw new Error("timed out waiting for payment — run `polsci balance` later to re-check");
}
