import type { Env } from "../env.js";

const API = "https://api.github.com";

function b64(content: string): string {
  // Workers have atob/btoa but not Buffer; use btoa over the UTF-8 bytes.
  const bytes = new TextEncoder().encode(content);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(b: string): string {
  const bin = atob(b);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export type CommitFileInput = {
  path: string;
  content: string;
  message: string;
  branch?: string;
};

export type CommitFileResult = { commit_sha: string; content_sha: string };

export async function commitFile(
  env: Env,
  input: CommitFileInput,
): Promise<CommitFileResult> {
  const branch = input.branch ?? env.REPO_BRANCH;
  const url = `${API}/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${encodeURI(input.path)}`;

  // If file exists, we need its current sha to update it; if not, omit sha.
  let sha: string | undefined;
  const head = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
    headers: ghHeaders(env.GITHUB_TOKEN),
  });
  if (head.ok) {
    const existing = (await head.json()) as { sha: string };
    sha = existing.sha;
  } else if (head.status !== 404) {
    throw new Error(`github GET ${input.path}: ${head.status} ${await head.text()}`);
  }

  const put = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(env.GITHUB_TOKEN), "content-type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      content: b64(input.content),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!put.ok) {
    throw new Error(`github PUT ${input.path}: ${put.status} ${await put.text()}`);
  }
  const res = (await put.json()) as { content: { sha: string }; commit: { sha: string } };
  return { commit_sha: res.commit.sha, content_sha: res.content.sha };
}

export async function readFile(env: Env, path: string, branch?: string): Promise<string | null> {
  const ref = branch ?? env.REPO_BRANCH;
  const url = `${API}/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, { headers: ghHeaders(env.GITHUB_TOKEN) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`github GET ${path}: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { content: string; encoding: string };
  if (data.encoding !== "base64") throw new Error(`unexpected encoding ${data.encoding}`);
  return fromB64(data.content.replace(/\n/g, ""));
}

export async function listDir(env: Env, path: string, branch?: string): Promise<string[]> {
  const ref = branch ?? env.REPO_BRANCH;
  const url = `${API}/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, { headers: ghHeaders(env.GITHUB_TOKEN) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`github GET ${path}: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as Array<{ name: string; type: string; path: string }>;
  return data.filter((e) => e.type === "file").map((e) => e.path);
}

function ghHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "user-agent": "agentic-polsci-worker",
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
}
