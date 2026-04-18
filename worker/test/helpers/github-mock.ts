import { vi } from "vitest";

/**
 * Installs a fetch mock that emulates a tiny GitHub contents API against an
 * in-memory file map. Covers GET /contents/:path and PUT /contents/:path.
 */
export function installGithubMock(initial: Record<string, string> = {}): {
  files: Map<string, { content: string; sha: string }>;
  restore: () => void;
} {
  const files = new Map<string, { content: string; sha: string }>();
  for (const [p, c] of Object.entries(initial))
    files.set(p, { content: c, sha: fakeSha(`init:${p}`) });

  const realFetch = globalThis.fetch;
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (...args) => {
    const input = args[0];
    const init = args[1] ?? {};
    const url = typeof input === "string" ? input : (input as Request).url;
    if (!url.startsWith("https://api.github.com/")) {
      return realFetch(input as Parameters<typeof fetch>[0], init);
    }
    const u = new URL(url);
    const m = u.pathname.match(/^\/repos\/[^/]+\/[^/]+\/contents\/(.*)$/);
    if (!m) return new Response("unhandled", { status: 500 });
    const path = decodeURI(m[1]);
    const method = (init.method ?? "GET").toUpperCase();
    if (method === "GET") {
      // File?
      const f = files.get(path);
      if (f) {
        return new Response(
          JSON.stringify({ content: btoa(f.content), encoding: "base64", sha: f.sha }),
          { status: 200 },
        );
      }
      // Directory? Return entries.
      const children = [...files.keys()].filter((k) => k.startsWith(path + "/"));
      if (children.length === 0) return new Response("not found", { status: 404 });
      const immediate = new Map<string, { type: "file" | "dir"; path: string }>();
      for (const child of children) {
        const rest = child.slice(path.length + 1);
        const seg = rest.split("/")[0];
        const childPath = `${path}/${seg}`;
        if (rest.includes("/")) {
          immediate.set(seg, { type: "dir", path: childPath });
        } else {
          immediate.set(seg, { type: "file", path: childPath });
        }
      }
      const entries = [...immediate.entries()].map(([name, v]) => ({ name, type: v.type, path: v.path }));
      return new Response(JSON.stringify(entries), { status: 200 });
    }
    if (method === "PUT") {
      const body = JSON.parse(init.body as string) as { content: string; message: string };
      const decoded = atob(body.content);
      const sha = fakeSha(`${path}:${decoded.length}:${Math.random()}`);
      files.set(path, { content: decoded, sha });
      return new Response(
        JSON.stringify({ content: { sha }, commit: { sha: fakeSha(`commit:${path}:${sha}`) } }),
        { status: 200 },
      );
    }
    return new Response("unhandled", { status: 500 });
  });
  return { files, restore: () => spy.mockRestore() };
}

function fakeSha(s: string): string {
  // Pseudo-hash, not cryptographic; only needs to differ per-input for assertions.
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ("0000000" + Math.abs(h).toString(16)).slice(-8).padStart(40, "a");
}
