import { describe, it, expect } from "vitest";
import { generateToken, sha256Hex } from "../../src/lib/crypto.js";

describe("crypto helpers", () => {
  it("generates a 64-char hex token", () => {
    const t = generateToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates distinct tokens across calls", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it("sha256Hex('hello') matches the known digest", async () => {
    expect(await sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
