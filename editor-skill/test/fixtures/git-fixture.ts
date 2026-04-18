import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import simpleGit from "simple-git";

/**
 * Creates a pair of bare + working directories and initializes a working
 * git repo. Used as the "public repo" or "policy repo" in tests.
 * The bare repo acts as the remote origin for push testing.
 */
export async function makeGitPair(root: string, name: string): Promise<{
  bare: string;
  work: string;
}> {
  const bare = join(root, `${name}.git`);
  const work = join(root, name);
  mkdirSync(bare, { recursive: true });
  mkdirSync(work, { recursive: true });
  await simpleGit(bare).init(true);
  const git = simpleGit(work);
  await git.init();
  await git.addConfig("user.email", "editor-test@example.com");
  await git.addConfig("user.name", "Editor Test");
  // Seed with an initial commit so branch exists.
  writeFileSync(join(work, "README.md"), `# ${name}\n`);
  await git.add("README.md");
  await git.commit("initial");
  await git.branch(["-M", "main"]);
  await git.addRemote("origin", bare);
  await git.push(["-u", "origin", "main"]);
  return { bare, work };
}

export function cleanupTempDir(path: string) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}
