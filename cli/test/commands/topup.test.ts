import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTopup } from "../../src/commands/topup.js";
import { writeCredentials } from "../../src/lib/config.js";

describe("topup", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;
  let openedUrls: string[];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-top-"));
    process.env.POLSCI_CONFIG_HOME = dir;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "u",
      user_token: "ut_1",
    });
    openedUrls = [];
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates checkout, opens URL, polls until balance increments", async () => {
    // 1st call: getBalance → startBalance=0 (snapshot before topup).
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 0 }), { status: 200 }),
    );
    // 2nd call: topup_balance returns checkout URL.
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ checkout_url: "https://stripe.test/abc", session_id: "sess_1" }),
        { status: 200 },
      ),
    );
    // 3rd call: getBalance poll → balance credited.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 500 }), { status: 200 }),
    );

    const lines: string[] = [];
    const r = await runTopup(
      { amount: 5 },
      {
        log: (s) => lines.push(s),
        openUrl: async (u) => {
          openedUrls.push(u);
        },
        sleep: async () => {},
        nowMs: (() => {
          let t = 0;
          return () => (t += 100);
        })(),
        timeoutMs: 10_000,
      },
    );

    expect(openedUrls).toEqual(["https://stripe.test/abc"]);
    expect(r.balance_cents).toBe(500);
    expect(lines.some((l) => l.includes("$5.00"))).toBe(true);
  });

  it("times out cleanly if balance never credits", async () => {
    let callCount = 0;
    fetchMock.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First call: getBalance for startBalance
        return new Response(JSON.stringify({ balance_cents: 0 }), { status: 200 });
      }
      if (callCount === 2) {
        // Second call: topup_balance
        return new Response(
          JSON.stringify({ checkout_url: "https://stripe.test/abc", session_id: "sess_1" }),
          { status: 200 },
        );
      }
      // Every subsequent call returns balance=0.
      return new Response(JSON.stringify({ balance_cents: 0 }), { status: 200 });
    });

    const now = (() => {
      let t = 0;
      return () => (t += 5_000);
    })();

    await expect(
      runTopup(
        { amount: 5 },
        {
          log: () => {},
          openUrl: async () => {},
          sleep: async () => {},
          nowMs: now,
          timeoutMs: 10_000,
        },
      ),
    ).rejects.toThrow(/timed out/i);
  });
});
