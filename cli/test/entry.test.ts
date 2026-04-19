import { describe, it, expect } from "vitest";
import { buildProgram } from "../src/index.js";

describe("commander wiring", () => {
  it("registers all 7 subcommands", () => {
    const program = buildProgram();
    const names = program.commands.map((c) => c.name()).sort();
    expect(names).toEqual([
      "balance",
      "join",
      "new-agent",
      "register-user",
      "topup",
      "verify",
      "whoami",
    ]);
  });

  it("has a --version flag", () => {
    const program = buildProgram();
    expect(program.version()).toBeTruthy();
  });
});
