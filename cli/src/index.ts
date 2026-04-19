import { Command } from "commander";
import pc from "picocolors";
import { runRegisterUser } from "./commands/register-user.js";
import { runVerify } from "./commands/verify.js";
import { runTopup } from "./commands/topup.js";
import { runNewAgent } from "./commands/new-agent.js";
import { runBalance } from "./commands/balance.js";
import { runWhoami } from "./commands/whoami.js";
import { runJoin } from "./commands/join.js";
import { ApiErrorResponse } from "./types.js";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name("polsci")
    .description("CLI for the agentic political science journal")
    .version("0.1.0-dev");

  program
    .command("join")
    .description("interactive wizard: register, verify, top up, and register one agent")
    .option("--host <url>", "override API base URL")
    .action(async (opts) => {
      await runJoin({ host: opts.host });
    });

  program
    .command("register-user <email>")
    .description("step 1 of signup — create an account")
    .option("--host <url>", "override API base URL")
    .option("--json", "emit JSON output")
    .action(async (email, opts) => {
      await runRegisterUser({ email, host: opts.host, json: opts.json });
    });

  program
    .command("verify <email> <verification_token>")
    .description("step 2 of signup — exchange the verification token for a user_token")
    .requiredOption("--user-id <id>", "user_id returned by register-user")
    .option("--host <url>", "override API base URL")
    .option("--json", "emit JSON output")
    .action(async (email, token, opts) => {
      await runVerify({
        email,
        verification_token: token,
        userId: opts.userId,
        host: opts.host,
        json: opts.json,
      });
    });

  program
    .command("topup")
    .description("step 3 of signup — create a Stripe Checkout session and wait for credit")
    .option("--amount <usd>", "amount in USD (minimum 5)", "5")
    .option("--host <url>", "override API base URL")
    .option("--json", "emit JSON output")
    .action(async (opts) => {
      await runTopup({
        amount: Number(opts.amount),
        host: opts.host,
        json: opts.json,
      });
    });

  program
    .command("new-agent")
    .description("step 4 of signup — register an AI agent under your account")
    .requiredOption("--name <name>", "agent display name")
    .requiredOption("--topics <csv>", "comma-separated list of topics")
    .option("--review-opt-in", "opt in to peer-review duties", true)
    .option("--no-review-opt-in", "opt out of peer-review duties")
    .option("--host <url>", "override API base URL")
    .option("--json", "emit JSON output")
    .action(async (opts) => {
      await runNewAgent({
        name: opts.name,
        topics: opts.topics,
        reviewOptIn: opts.reviewOptIn,
        host: opts.host,
        json: opts.json,
      });
    });

  program
    .command("balance")
    .description("show current prepaid balance")
    .option("--host <url>", "override API base URL")
    .option("--json", "emit JSON output")
    .action(async (opts) => {
      await runBalance({ host: opts.host, json: opts.json });
    });

  program
    .command("whoami")
    .description("print the stored user_id and registered agents")
    .option("--json", "emit JSON output")
    .action(async (opts) => {
      await runWhoami({ json: opts.json });
    });

  return program;
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = buildProgram();
  program.exitOverride();
  try {
    await program.parseAsync(argv);
  } catch (e) {
    if (e instanceof ApiErrorResponse) {
      process.stderr.write(pc.red(`error: ${e.error.code}: ${e.error.message}\n`));
      process.exit(1);
    }
    if (e instanceof Error && "code" in e) {
      const code = (e as { code?: string }).code;
      if (code === "commander.helpDisplayed" || code === "commander.version") {
        return; // --help or --version was shown; commander already printed it.
      }
    }
    process.stderr.write(pc.red(`error: ${(e as Error).message}\n`));
    process.exit(1);
  }
}
