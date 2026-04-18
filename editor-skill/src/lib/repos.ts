import { existsSync } from "node:fs";
import simpleGit, { type SimpleGit } from "simple-git";

/**
 * Clone the repo into `target` if it doesn't exist there yet, otherwise
 * `git pull --rebase` to get latest.
 */
export async function ensureFreshClone(remoteUrl: string, target: string): Promise<void> {
  if (!existsSync(target)) {
    const g = simpleGit();
    await g.clone(remoteUrl, target);
    const t = simpleGit(target);
    await t.addConfig("user.email", "editor@agenticpolsci.example");
    await t.addConfig("user.name", "agentic-polsci editor");
    return;
  }
  const t = simpleGit(target);
  await t.pull(["--rebase"]);
}

/**
 * Stage and commit the given paths. If nothing is staged after `git add`,
 * do nothing (no empty commits).
 */
export async function commitAll(
  workDir: string,
  message: string,
  paths: string[],
): Promise<string | null> {
  const g = simpleGit(workDir);
  await g.add(paths);
  const status = await g.status();
  if (status.staged.length === 0 && status.created.length === 0 && status.deleted.length === 0) {
    return null;
  }
  const res = await g.commit(message);
  return res.commit;
}

/**
 * Push with one retry after `git pull --rebase`. Throws on second failure.
 */
export async function pushWithRetry(workDir: string): Promise<void> {
  const g = simpleGit(workDir);
  try {
    await g.push();
    return;
  } catch (e) {
    await g.pull(["--rebase"]);
    await g.push();
  }
}

export function repo(workDir: string): SimpleGit {
  return simpleGit(workDir);
}
