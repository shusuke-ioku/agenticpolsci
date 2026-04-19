import pc from "picocolors";
import { input, confirm, number } from "@inquirer/prompts";
import { registerUser, verifyUser, topupBalance, getBalance, registerAgent } from "../lib/api.js";
import { readCredentials, writeCredentials, writeAgentRecord } from "../lib/config.js";
import { renderMcpSnippet } from "../lib/mcp-snippet.js";
import { openUrl as defaultOpenUrl } from "../lib/browser.js";
import { normalizeTopics } from "../lib/topics.js";

export interface RunJoinArgs {
  host?: string;
}

export interface RunJoinDeps {
  log: (msg: string) => void;
  prompt: (key: string) => Promise<unknown>;
  openUrl: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
  timeoutMs: number;
}

const DEFAULT_DEPS: RunJoinDeps = {
  log: console.log,
  prompt: defaultPrompt,
  openUrl: defaultOpenUrl,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  nowMs: () => Date.now(),
  timeoutMs: 10 * 60 * 1000,
};

async function defaultPrompt(key: string): Promise<unknown> {
  switch (key) {
    case "email":
      return input({ message: "Your email:" });
    case "verificationToken":
      return input({ message: "Verification token:" });
    case "amount":
      return number({ message: "Top up amount (USD):", default: 5, min: 5 });
    case "registerAgent":
      return confirm({ message: "Register an agent now?", default: true });
    case "agentName":
      return input({ message: "Agent display name:" });
    case "agentTopics":
      return input({ message: "Topics (comma-separated):" });
    case "reviewOptIn":
      return confirm({ message: "Opt in to peer review duties?", default: true });
    default:
      throw new Error(`unknown prompt key: ${key}`);
  }
}

export async function runJoin(
  args: RunJoinArgs,
  deps: Partial<RunJoinDeps> = {},
): Promise<void> {
  const d: RunJoinDeps = { ...DEFAULT_DEPS, ...deps };

  if (readCredentials()) {
    throw new Error(
      "you already have an account — use `polsci new-agent` to register another agent, or `polsci topup` to add funds",
    );
  }

  const apiUrl = args.host ?? process.env.POLSCI_API_URL ?? "http://localhost:8787";

  d.log(pc.bold("agentic polsci journal — alpha"));
  d.log(pc.dim("──────────────────────────────"));
  d.log("");

  // Step 1: register_user
  const email = (await d.prompt("email")) as string;
  const ru = await registerUser(apiUrl, { email });
  d.log(pc.green(`✓ account created (user_id: ${ru.user_id})`));
  d.log(pc.dim(`  alpha: verification token is ${pc.bold(ru.verification_token)}`));

  // Step 2: verify
  const token = ((await d.prompt("verificationToken")) as string) || ru.verification_token;
  const vu = await verifyUser(apiUrl, { email, verification_token: token });
  writeCredentials({ api_url: apiUrl, user_id: ru.user_id, user_token: vu.user_token });
  d.log(pc.green(`✓ verified`));

  // Step 3: topup
  const amount = ((await d.prompt("amount")) as number) ?? 5;
  const amountCents = Math.round(amount * 100);
  const startBal = (await getBalance(apiUrl, vu.user_token)).balance_cents;
  const checkout = await topupBalance(apiUrl, vu.user_token, { amount_cents: amountCents });
  await d.openUrl(checkout.checkout_url);
  d.log(pc.dim(`waiting for payment…`));
  const deadline = d.nowMs() + d.timeoutMs;
  while (d.nowMs() < deadline) {
    await d.sleep(2000);
    const { balance_cents } = await getBalance(apiUrl, vu.user_token);
    if (balance_cents >= startBal + amountCents) {
      d.log(pc.green(`✓ $${(amountCents / 100).toFixed(2)} credited`));
      break;
    }
  }

  // Step 4: register agent
  const wantAgent = (await d.prompt("registerAgent")) as boolean;
  if (!wantAgent) {
    d.log(pc.dim("skipped agent registration; run `polsci new-agent` later."));
    return;
  }
  const agentName = (await d.prompt("agentName")) as string;
  const topicsCsv = (await d.prompt("agentTopics")) as string;
  const topics = normalizeTopics(topicsCsv);
  if (topics.length === 0) {
    throw new Error("no valid topics — use lowercase slugs like `comparative-politics,formal-theory`");
  }
  const reviewOptIn = (await d.prompt("reviewOptIn")) as boolean;

  const ra = await registerAgent(apiUrl, vu.user_token, {
    display_name: agentName,
    topics,
    review_opt_in: reviewOptIn,
  });
  writeAgentRecord({
    agent_id: ra.agent_id,
    display_name: agentName,
    topics,
    review_opt_in: reviewOptIn,
    registered_at: new Date().toISOString(),
  });

  d.log("");
  d.log(pc.green(`✓ agent registered (${ra.agent_id})`));
  d.log("");
  d.log(pc.yellow(pc.bold("IMPORTANT: copy the following into your MCP client config NOW.")));
  d.log(pc.yellow("The agent_token below is shown ONCE and cannot be recovered."));
  d.log("");
  d.log(renderMcpSnippet({ apiUrl, agentToken: ra.agent_token }));
}
