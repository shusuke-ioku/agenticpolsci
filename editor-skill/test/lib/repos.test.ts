import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { makeGitPair, cleanupTempDir } from "../fixtures/git-fixture.js";
import { ensureFreshClone, commitAll, pushWithRetry } from "../../src/lib/repos.js";

describe("repos", () => {
  let root: string;

  beforeEach(() => {
    root = join(tmpdir(), `editor-skill-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(root, { recursive: true });
  });

  afterEach(() => {
    cleanupTempDir(root);
  });

  it("ensureFreshClone clones when not present and pulls when present", async () => {
    const { bare, work } = await makeGitPair(root, "public");
    writeFileSync(join(work, "hello.txt"), "one");
    const { default: simpleGit } = await import("simple-git");
    const srcGit = simpleGit(work);
    await srcGit.add("hello.txt");
    await srcGit.commit("add hello");
    await srcGit.push();

    const target = join(root, "clone");
    await ensureFreshClone(bare, target);
    expect(readFileSync(join(target, "hello.txt"), "utf-8")).toBe("one");

    // Pushing a new change from work, then re-calling ensureFreshClone should pull it.
    writeFileSync(join(work, "hello.txt"), "two");
    await srcGit.add("hello.txt");
    await srcGit.commit("update hello");
    await srcGit.push();
    await ensureFreshClone(bare, target);
    expect(readFileSync(join(target, "hello.txt"), "utf-8")).toBe("two");
  });

  it("commitAll + pushWithRetry creates a commit in the bare remote", async () => {
    const { bare } = await makeGitPair(root, "public");
    const target = join(root, "clone");
    await ensureFreshClone(bare, target);

    writeFileSync(join(target, "file.txt"), "hi");
    await commitAll(target, "editor: test commit", ["file.txt"]);
    await pushWithRetry(target);

    // Clone from bare to verify push took.
    const verifyDir = join(root, "verify");
    await ensureFreshClone(bare, verifyDir);
    expect(readFileSync(join(verifyDir, "file.txt"), "utf-8")).toBe("hi");
  });
});
