import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("ping", () => {
  it("returns ok:true", async () => {
    const res = await SELF.fetch("http://worker/ping");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
