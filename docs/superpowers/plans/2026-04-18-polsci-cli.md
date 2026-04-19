# polsci CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI (`@agenticpolsci/cli`, installable via `npx`) that wraps the existing Worker REST endpoints so a first-time user can register, top up a Stripe balance, and register an AI agent in one interactive command.

**Architecture:** New top-level `cli/` directory, standalone Node 20+ TypeScript project. Pure HTTP client — no imports from `worker/` or `site/`. Thin typed `fetch` wrappers in `src/lib/api.ts`, command logic in `src/commands/*.ts`, a `commander` entry in `src/index.ts`. Credentials persist to `~/.config/agenticpolsci/credentials.json` (mode 0600). `agent_token` is never written to disk — displayed once in an MCP config snippet.

**Tech Stack:** TypeScript 5.6, Node 20+, `commander`, `@inquirer/prompts`, `ora`, `open`, `env-paths`, `picocolors`. Vitest for tests. Native `fetch` (no HTTP client library).

**Spec:** `docs/superpowers/specs/2026-04-18-polsci-cli-design.md`

**Existing backend** (do not modify as part of this plan):
- `POST /v1/register_user` — body `{ email }` → `{ user_id, verification_token, alpha_notice }`
- `POST /v1/verify_user` — body `{ email, verification_token }` → `{ user_token }`
- `POST /v1/register_agent` — `Authorization: Bearer <user_token>`, body `{ display_name, topics, model_family?, review_opt_in }` → `{ agent_id, agent_token }`
- `POST /v1/topup_balance` — `Authorization: Bearer <user_token>`, body `{ amount_cents }` → `{ checkout_url, session_id }`
- `GET /v1/balance` — `Authorization: Bearer <user_token>` → `{ balance_cents }`
- Error shape (all endpoints): `{ error: { code: string, message: string } }`

---

## File Structure

```
cli/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── README.md
├── bin/
│   └── polsci.js               # #!/usr/bin/env node shim
├── src/
│   ├── index.ts                # commander entry, wires subcommands
│   ├── types.ts                # shared types (Credentials, AgentRecord, ApiError)
│   ├── lib/
│   │   ├── api.ts              # fetch wrappers: registerUser, verifyUser, …
│   │   ├── config.ts           # read/write config dir, XDG/env-paths handling
│   │   ├── mcp-snippet.ts      # render MCP client config JSON block
│   │   └── browser.ts          # open(url) wrapper with fallback-to-print
│   └── commands/
│       ├── join.ts             # wizard
│       ├── register-user.ts
│       ├── verify.ts
│       ├── topup.ts
│       ├── new-agent.ts
│       ├── balance.ts
│       └── whoami.ts
└── test/
    ├── lib/
    │   ├── api.test.ts         # fetch mocked
    │   ├── config.test.ts      # uses tmp dir for config path
    │   └── mcp-snippet.test.ts
    └── commands/
        ├── register-user.test.ts
        ├── verify.test.ts
        ├── topup.test.ts
        ├── new-agent.test.ts
        ├── balance.test.ts
        ├── whoami.test.ts
        └── join.test.ts
```

Integration test (`test/integration.test.ts` spawning `wrangler dev`) is **deferred to a future task** — see Task 14. The main plan uses mocked `fetch` for fast inner-loop testing.

---

## Task 1: Scaffold the cli/ package

**Files:**
- Create: `cli/package.json`
- Create: `cli/tsconfig.json`
- Create: `cli/vitest.config.ts`
- Create: `cli/.gitignore`
- Create: `cli/README.md`
- Create: `cli/bin/polsci.js`
- Create: `cli/src/index.ts`
- Create: `cli/test/smoke.test.ts`

- [ ] **Step 1: Create `cli/package.json`**

```json
{
  "name": "@agenticpolsci/cli",
  "version": "0.1.0-dev",
  "private": true,
  "type": "module",
  "description": "CLI for registering with the agentic political science journal",
  "bin": {
    "polsci": "bin/polsci.js"
  },
  "files": ["bin", "dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@inquirer/prompts": "^5.3.0",
    "commander": "^12.1.0",
    "env-paths": "^3.0.0",
    "open": "^10.1.0",
    "ora": "^8.0.1",
    "picocolors": "^1.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `cli/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "types": ["node"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "declaration": false,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create `cli/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Create `cli/.gitignore`**

```
node_modules/
dist/
*.log
.DS_Store
```

- [ ] **Step 5: Create `cli/README.md`**

```markdown
# @agenticpolsci/cli

CLI wrapper around the agentic polsci worker REST API. Lets a human register,
top up a prepaid balance, and register an AI agent from the terminal.

## Quick start

```
npx @agenticpolsci/cli join
```

See `polsci --help` for all commands.

## Config

Credentials live in `~/.config/agenticpolsci/credentials.json` (mode 0600).
Agent metadata is in `~/.config/agenticpolsci/agents/`. The `agent_token`
is NEVER written to disk — you paste it into your MCP config yourself.
```

- [ ] **Step 6: Create `cli/bin/polsci.js` (shebang shim)**

```javascript
#!/usr/bin/env node
import("../dist/index.js");
```

Then make it executable:

```bash
chmod +x cli/bin/polsci.js
```

- [ ] **Step 7: Create minimal `cli/src/index.ts`**

```typescript
export function main(): void {
  console.log("polsci cli (placeholder)");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

- [ ] **Step 8: Create `cli/test/smoke.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { main } from "../src/index.js";

describe("smoke", () => {
  it("main is defined", () => {
    expect(typeof main).toBe("function");
  });
});
```

- [ ] **Step 9: Install and verify**

```bash
cd cli && npm install
```

Expected: installs cleanly, no peer-dep warnings that block.

- [ ] **Step 10: Run typecheck and tests**

```bash
cd cli && npm run typecheck && npm test
```

Expected: `tsc` passes with no errors; `1 passed (1)` from vitest.

- [ ] **Step 11: Commit**

```bash
git add cli/
git commit -m "feat(cli): scaffold @agenticpolsci/cli package"
```

---

## Task 2: Shared types

**Files:**
- Create: `cli/src/types.ts`
- Test: covered via consumer tests (no dedicated test)

- [ ] **Step 1: Create `cli/src/types.ts`**

```typescript
export interface Credentials {
  api_url: string;
  user_id: string;
  user_token: string;
}

export interface AgentRecord {
  agent_id: string;
  display_name: string;
  topics: string[];
  review_opt_in: boolean;
  model_family?: string;
  registered_at: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export class ApiErrorResponse extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(`${error.code}: ${error.message}`);
    this.name = "ApiErrorResponse";
  }
}

export interface RegisterUserResponse {
  user_id: string;
  verification_token: string;
  alpha_notice: string;
}

export interface VerifyUserResponse {
  user_token: string;
}

export interface RegisterAgentInput {
  display_name: string;
  topics: string[];
  review_opt_in: boolean;
  model_family?: string;
}

export interface RegisterAgentResponse {
  agent_id: string;
  agent_token: string;
}

export interface TopupBalanceResponse {
  checkout_url: string;
  session_id: string;
}

export interface BalanceResponse {
  balance_cents: number;
}
```

- [ ] **Step 2: Verify typecheck still passes**

```bash
cd cli && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/src/types.ts
git commit -m "feat(cli): shared request/response types"
```

---

## Task 3: API client (fetch wrappers)

**Files:**
- Create: `cli/src/lib/api.ts`
- Test: `cli/test/lib/api.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/test/lib/api.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  registerUser,
  verifyUser,
  registerAgent,
  topupBalance,
  getBalance,
} from "../../src/lib/api.js";
import { ApiErrorResponse } from "../../src/types.js";

const API = "http://localhost:8787";

describe("api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registerUser POSTs email and returns response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ user_id: "user_1", verification_token: "t", alpha_notice: "ok" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const r = await registerUser(API, { email: "a@b.com" });
    expect(r.user_id).toBe("user_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8787/v1/register_user",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "content-type": "application/json" }),
        body: JSON.stringify({ email: "a@b.com" }),
      }),
    );
  });

  it("verifyUser POSTs email and token", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user_token: "ut_1" }), { status: 200 }),
    );
    const r = await verifyUser(API, { email: "a@b.com", verification_token: "t" });
    expect(r.user_token).toBe("ut_1");
  });

  it("registerAgent includes bearer header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ agent_id: "agent-x", agent_token: "ak_1" }), { status: 200 }),
    );
    await registerAgent(API, "ut_1", {
      display_name: "bot",
      topics: ["x"],
      review_opt_in: true,
    });
    const call = fetchMock.mock.calls[0];
    expect((call[1] as RequestInit).headers).toEqual(
      expect.objectContaining({ authorization: "Bearer ut_1" }),
    );
  });

  it("topupBalance POSTs amount_cents", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ checkout_url: "https://x", session_id: "s" }), {
        status: 200,
      }),
    );
    const r = await topupBalance(API, "ut_1", { amount_cents: 500 });
    expect(r.checkout_url).toBe("https://x");
  });

  it("getBalance returns balance_cents", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 500 }), { status: 200 }),
    );
    const r = await getBalance(API, "ut_1");
    expect(r.balance_cents).toBe(500);
  });

  it("throws ApiErrorResponse on non-2xx with structured error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "conflict", message: "dup" } }), {
        status: 409,
      }),
    );
    await expect(registerUser(API, { email: "a@b.com" })).rejects.toMatchObject({
      name: "ApiErrorResponse",
      status: 409,
      error: { code: "conflict", message: "dup" },
    });
  });

  it("throws ApiErrorResponse on non-2xx with unstructured body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("garbage", { status: 500 }));
    await expect(registerUser(API, { email: "a@b.com" })).rejects.toBeInstanceOf(ApiErrorResponse);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cli && npx vitest run test/lib/api.test.ts
```

Expected: FAIL — `Cannot find module '../../src/lib/api.js'`.

- [ ] **Step 3: Implement `cli/src/lib/api.ts`**

```typescript
import {
  ApiErrorResponse,
  type RegisterUserResponse,
  type VerifyUserResponse,
  type RegisterAgentInput,
  type RegisterAgentResponse,
  type TopupBalanceResponse,
  type BalanceResponse,
} from "../types.js";

async function request<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      throw new ApiErrorResponse(res.status, {
        code: "http_error",
        message: `HTTP ${res.status}`,
      });
    }
    const err =
      parsed && typeof parsed === "object" && "error" in parsed
        ? (parsed as { error: unknown }).error
        : null;
    if (err && typeof err === "object" && "code" in err && "message" in err) {
      throw new ApiErrorResponse(res.status, err as { code: string; message: string });
    }
    throw new ApiErrorResponse(res.status, {
      code: "http_error",
      message: `HTTP ${res.status}`,
    });
  }
  return (await res.json()) as T;
}

function jsonPost(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function bearer(token: string, init: RequestInit): RequestInit {
  return {
    ...init,
    headers: { ...(init.headers as Record<string, string> ?? {}), authorization: `Bearer ${token}` },
  };
}

export function registerUser(
  apiUrl: string,
  body: { email: string },
): Promise<RegisterUserResponse> {
  return request(`${apiUrl}/v1/register_user`, jsonPost(body));
}

export function verifyUser(
  apiUrl: string,
  body: { email: string; verification_token: string },
): Promise<VerifyUserResponse> {
  return request(`${apiUrl}/v1/verify_user`, jsonPost(body));
}

export function registerAgent(
  apiUrl: string,
  userToken: string,
  body: RegisterAgentInput,
): Promise<RegisterAgentResponse> {
  return request(`${apiUrl}/v1/register_agent`, bearer(userToken, jsonPost(body)));
}

export function topupBalance(
  apiUrl: string,
  userToken: string,
  body: { amount_cents: number },
): Promise<TopupBalanceResponse> {
  return request(`${apiUrl}/v1/topup_balance`, bearer(userToken, jsonPost(body)));
}

export function getBalance(apiUrl: string, userToken: string): Promise<BalanceResponse> {
  return request(`${apiUrl}/v1/balance`, bearer(userToken, { method: "GET" }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd cli && npx vitest run test/lib/api.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/api.ts cli/src/types.ts cli/test/lib/api.test.ts
git commit -m "feat(cli): typed fetch wrappers for worker endpoints"
```

---

## Task 4: Config file read/write

**Files:**
- Create: `cli/src/lib/config.ts`
- Test: `cli/test/lib/config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/test/lib/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  readCredentials,
  writeCredentials,
  writeAgentRecord,
  listAgentRecords,
  credentialsPath,
  agentsDir,
} from "../../src/lib/config.js";

describe("config", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-cli-cfg-"));
    process.env.POLSCI_CONFIG_HOME = dir;
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns null when credentials.json does not exist", () => {
    expect(readCredentials()).toBeNull();
  });

  it("writes and reads credentials round-trip", () => {
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "user_1",
      user_token: "ut_1",
    });
    const r = readCredentials();
    expect(r?.user_id).toBe("user_1");
    expect(r?.api_url).toBe("http://localhost:8787");
  });

  it("writes credentials.json with mode 0600", () => {
    writeCredentials({ api_url: "x", user_id: "u", user_token: "t" });
    const mode = statSync(credentialsPath()).mode & 0o777;
    // File mode is platform-dependent on Windows; only assert on POSIX.
    if (process.platform !== "win32") {
      expect(mode).toBe(0o600);
    }
  });

  it("throws on malformed credentials.json", () => {
    writeCredentials({ api_url: "x", user_id: "u", user_token: "t" });
    writeFileSync(credentialsPath(), "::not json::");
    expect(() => readCredentials()).toThrow();
  });

  it("writeAgentRecord + listAgentRecords round-trip", () => {
    writeAgentRecord({
      agent_id: "agent-aaa",
      display_name: "Alpha",
      topics: ["comparative-politics"],
      review_opt_in: true,
      registered_at: "2026-04-18T00:00:00Z",
    });
    writeAgentRecord({
      agent_id: "agent-bbb",
      display_name: "Beta",
      topics: ["ir"],
      review_opt_in: false,
      registered_at: "2026-04-18T00:01:00Z",
    });
    const list = listAgentRecords().map((a) => a.agent_id).sort();
    expect(list).toEqual(["agent-aaa", "agent-bbb"]);
  });

  it("listAgentRecords returns [] when dir does not exist", () => {
    expect(existsSync(agentsDir())).toBe(false);
    expect(listAgentRecords()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cli && npx vitest run test/lib/config.test.ts
```

Expected: FAIL — `Cannot find module '../../src/lib/config.js'`.

- [ ] **Step 3: Implement `cli/src/lib/config.ts`**

```typescript
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import envPaths from "env-paths";
import type { Credentials, AgentRecord } from "../types.js";

function configDir(): string {
  if (process.env.POLSCI_CONFIG_HOME) return process.env.POLSCI_CONFIG_HOME;
  if (process.env.XDG_CONFIG_HOME) return join(process.env.XDG_CONFIG_HOME, "agenticpolsci");
  const paths = envPaths("agenticpolsci", { suffix: "" });
  return paths.config;
}

export function credentialsPath(): string {
  return join(configDir(), "credentials.json");
}

export function agentsDir(): string {
  return join(configDir(), "agents");
}

function ensureConfigDir(): void {
  mkdirSync(configDir(), { recursive: true });
}

function ensureAgentsDir(): void {
  mkdirSync(agentsDir(), { recursive: true });
}

export function readCredentials(): Credentials | null {
  const p = credentialsPath();
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf-8");
  const parsed = JSON.parse(raw) as Credentials;
  return parsed;
}

export function writeCredentials(c: Credentials): void {
  ensureConfigDir();
  const p = credentialsPath();
  writeFileSync(p, JSON.stringify(c, null, 2) + "\n", { encoding: "utf-8" });
  if (process.platform !== "win32") {
    chmodSync(p, 0o600);
  }
}

export function writeAgentRecord(a: AgentRecord): void {
  ensureAgentsDir();
  const p = join(agentsDir(), `${a.agent_id}.json`);
  writeFileSync(p, JSON.stringify(a, null, 2) + "\n", { encoding: "utf-8" });
}

export function listAgentRecords(): AgentRecord[] {
  const d = agentsDir();
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(d, f), "utf-8")) as AgentRecord);
}

export function homeDirForDisplay(): string {
  return credentialsPath().replace(homedir(), "~");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd cli && npx vitest run test/lib/config.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/config.ts cli/test/lib/config.test.ts
git commit -m "feat(cli): config directory read/write helpers"
```

---

## Task 5: MCP snippet renderer

**Files:**
- Create: `cli/src/lib/mcp-snippet.ts`
- Test: `cli/test/lib/mcp-snippet.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/test/lib/mcp-snippet.test.ts
import { describe, it, expect } from "vitest";
import { renderMcpSnippet, buildMcpConfig } from "../../src/lib/mcp-snippet.js";

describe("mcp-snippet", () => {
  it("buildMcpConfig returns the expected structure", () => {
    const cfg = buildMcpConfig({
      apiUrl: "https://worker.example.com",
      agentToken: "ak_test_123",
    });
    expect(cfg).toEqual({
      mcpServers: {
        "agentic-polsci": {
          url: "https://worker.example.com/mcp",
          headers: { Authorization: "Bearer ak_test_123" },
        },
      },
    });
  });

  it("renderMcpSnippet emits valid JSON containing the token", () => {
    const s = renderMcpSnippet({
      apiUrl: "https://worker.example.com",
      agentToken: "ak_test_123",
    });
    expect(() => JSON.parse(s)).not.toThrow();
    expect(s).toContain("ak_test_123");
    expect(s).toContain("https://worker.example.com/mcp");
  });

  it("strips trailing slash from apiUrl", () => {
    const s = renderMcpSnippet({
      apiUrl: "https://worker.example.com/",
      agentToken: "t",
    });
    expect(s).toContain("https://worker.example.com/mcp");
    expect(s).not.toContain("//mcp");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cli && npx vitest run test/lib/mcp-snippet.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cli/src/lib/mcp-snippet.ts`**

```typescript
export interface McpConfig {
  mcpServers: {
    "agentic-polsci": {
      url: string;
      headers: { Authorization: string };
    };
  };
}

export function buildMcpConfig(opts: { apiUrl: string; agentToken: string }): McpConfig {
  const base = opts.apiUrl.replace(/\/+$/, "");
  return {
    mcpServers: {
      "agentic-polsci": {
        url: `${base}/mcp`,
        headers: { Authorization: `Bearer ${opts.agentToken}` },
      },
    },
  };
}

export function renderMcpSnippet(opts: { apiUrl: string; agentToken: string }): string {
  return JSON.stringify(buildMcpConfig(opts), null, 2);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd cli && npx vitest run test/lib/mcp-snippet.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/mcp-snippet.ts cli/test/lib/mcp-snippet.test.ts
git commit -m "feat(cli): MCP config snippet renderer"
```

---

## Task 6: Browser-open helper

**Files:**
- Create: `cli/src/lib/browser.ts`
- Test: (covered indirectly by command tests)

- [ ] **Step 1: Implement `cli/src/lib/browser.ts`**

```typescript
import open from "open";
import pc from "picocolors";

export async function openUrl(url: string, log: (msg: string) => void = console.log): Promise<void> {
  log(pc.dim(`→ opening ${url}`));
  try {
    await open(url);
  } catch {
    log(pc.yellow(`could not open browser automatically. paste this URL manually:`));
    log(url);
  }
}
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd cli && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cli/src/lib/browser.ts
git commit -m "feat(cli): browser-open helper"
```

---

## Task 7: `register-user`, `verify`, `balance`, `whoami` commands

These are the four commands that are pure wrappers — no interactive prompts, no
composition. Lumped into one task because each is ~15 lines of code.

**Files:**
- Create: `cli/src/commands/register-user.ts`
- Create: `cli/src/commands/verify.ts`
- Create: `cli/src/commands/balance.ts`
- Create: `cli/src/commands/whoami.ts`
- Test: `cli/test/commands/register-user.test.ts`
- Test: `cli/test/commands/verify.test.ts`
- Test: `cli/test/commands/balance.test.ts`
- Test: `cli/test/commands/whoami.test.ts`

- [ ] **Step 1: Write `register-user` test**

```typescript
// cli/test/commands/register-user.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { runRegisterUser } from "../../src/commands/register-user.js";

describe("register-user", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("prints the verification token from the response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ user_id: "user_1", verification_token: "abc123", alpha_notice: "alpha" }),
        { status: 200 },
      ),
    );
    const lines: string[] = [];
    const r = await runRegisterUser(
      { email: "a@b.com", host: "http://localhost:8787" },
      { log: (s) => lines.push(s) },
    );
    expect(r.user_id).toBe("user_1");
    expect(lines.some((l) => l.includes("abc123"))).toBe(true);
    expect(lines.some((l) => l.includes("user_1"))).toBe(true);
  });

  it("JSON mode emits JSON without chatter", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ user_id: "u", verification_token: "t", alpha_notice: "a" }),
        { status: 200 },
      ),
    );
    const lines: string[] = [];
    await runRegisterUser(
      { email: "a@b.com", host: "http://localhost:8787", json: true },
      { log: (s) => lines.push(s) },
    );
    expect(lines.length).toBe(1);
    expect(() => JSON.parse(lines[0]!)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd cli && npx vitest run test/commands/register-user.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cli/src/commands/register-user.ts`**

```typescript
import pc from "picocolors";
import { registerUser } from "../lib/api.js";
import type { RegisterUserResponse } from "../types.js";

export interface RunRegisterUserArgs {
  email: string;
  host?: string;
  json?: boolean;
}

export interface RunDeps {
  log: (msg: string) => void;
}

export async function runRegisterUser(
  args: RunRegisterUserArgs,
  deps: RunDeps = { log: console.log },
): Promise<RegisterUserResponse> {
  const apiUrl = args.host ?? process.env.POLSCI_API_URL ?? "http://localhost:8787";
  const r = await registerUser(apiUrl, { email: args.email });
  if (args.json) {
    deps.log(JSON.stringify(r, null, 2));
  } else {
    deps.log(pc.green(`✓ account created`));
    deps.log(`  user_id:            ${pc.bold(r.user_id)}`);
    deps.log(`  verification_token: ${pc.bold(r.verification_token)}`);
    deps.log(pc.dim(`  (${r.alpha_notice})`));
    deps.log(``);
    deps.log(`next: polsci verify ${args.email} ${r.verification_token}`);
  }
  return r;
}
```

- [ ] **Step 4: Run `register-user` test**

```bash
cd cli && npx vitest run test/commands/register-user.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Write `verify` test**

```typescript
// cli/test/commands/verify.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runVerify } from "../../src/commands/verify.js";
import { readCredentials } from "../../src/lib/config.js";

describe("verify", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-verify-"));
    process.env.POLSCI_CONFIG_HOME = dir;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("stores user_token and api_url to credentials.json", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user_token: "ut_abc" }), { status: 200 }),
    );
    const lines: string[] = [];
    await runVerify(
      {
        email: "a@b.com",
        verification_token: "t",
        host: "http://localhost:8787",
        userId: "user_1",
      },
      { log: (s) => lines.push(s) },
    );
    const creds = readCredentials();
    expect(creds).toEqual({
      api_url: "http://localhost:8787",
      user_id: "user_1",
      user_token: "ut_abc",
    });
    expect(lines.some((l) => l.includes("verified"))).toBe(true);
  });
});
```

- [ ] **Step 6: Implement `cli/src/commands/verify.ts`**

```typescript
import pc from "picocolors";
import { verifyUser } from "../lib/api.js";
import { writeCredentials, homeDirForDisplay } from "../lib/config.js";

export interface RunVerifyArgs {
  email: string;
  verification_token: string;
  userId: string;
  host?: string;
  json?: boolean;
}

export interface RunDeps {
  log: (msg: string) => void;
}

export async function runVerify(
  args: RunVerifyArgs,
  deps: RunDeps = { log: console.log },
): Promise<{ user_token: string }> {
  const apiUrl = args.host ?? process.env.POLSCI_API_URL ?? "http://localhost:8787";
  const r = await verifyUser(apiUrl, {
    email: args.email,
    verification_token: args.verification_token,
  });
  writeCredentials({ api_url: apiUrl, user_id: args.userId, user_token: r.user_token });
  if (args.json) {
    deps.log(JSON.stringify({ user_token: r.user_token, stored_at: homeDirForDisplay() }, null, 2));
  } else {
    deps.log(pc.green(`✓ verified`));
    deps.log(`  user_token stored at ${homeDirForDisplay()}`);
  }
  return r;
}
```

- [ ] **Step 7: Run `verify` test**

```bash
cd cli && npx vitest run test/commands/verify.test.ts
```

Expected: 1 test passes.

- [ ] **Step 8: Write `balance` test**

```typescript
// cli/test/commands/balance.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBalance } from "../../src/commands/balance.js";
import { writeCredentials } from "../../src/lib/config.js";

describe("balance", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-bal-"));
    process.env.POLSCI_CONFIG_HOME = dir;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "u",
      user_token: "ut_1",
    });
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("prints formatted balance in dollars", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 1234 }), { status: 200 }),
    );
    const lines: string[] = [];
    await runBalance({}, { log: (s) => lines.push(s) });
    expect(lines.join("\n")).toContain("$12.34");
  });

  it("errors if not authenticated", async () => {
    // Blow away credentials.
    rmSync(dir, { recursive: true, force: true });
    const dir2 = mkdtempSync(join(tmpdir(), "polsci-bal2-"));
    process.env.POLSCI_CONFIG_HOME = dir2;
    await expect(runBalance({}, { log: () => {} })).rejects.toThrow(/not authenticated/i);
    rmSync(dir2, { recursive: true, force: true });
  });
});
```

- [ ] **Step 9: Implement `cli/src/commands/balance.ts`**

```typescript
import pc from "picocolors";
import { getBalance } from "../lib/api.js";
import { readCredentials } from "../lib/config.js";

export interface RunBalanceArgs {
  host?: string;
  json?: boolean;
}

export interface RunDeps {
  log: (msg: string) => void;
}

export async function runBalance(
  args: RunBalanceArgs,
  deps: RunDeps = { log: console.log },
): Promise<{ balance_cents: number }> {
  const creds = readCredentials();
  if (!creds) {
    throw new Error("not authenticated — run `polsci join` or `polsci verify` first");
  }
  const apiUrl = args.host ?? creds.api_url;
  const r = await getBalance(apiUrl, creds.user_token);
  if (args.json) {
    deps.log(JSON.stringify(r, null, 2));
  } else {
    deps.log(`balance: ${pc.bold("$" + (r.balance_cents / 100).toFixed(2))}`);
  }
  return r;
}
```

- [ ] **Step 10: Run `balance` test**

```bash
cd cli && npx vitest run test/commands/balance.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 11: Write `whoami` test**

```typescript
// cli/test/commands/whoami.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWhoami } from "../../src/commands/whoami.js";
import { writeCredentials, writeAgentRecord } from "../../src/lib/config.js";

describe("whoami", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-who-"));
    process.env.POLSCI_CONFIG_HOME = dir;
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports not-authenticated when no credentials", async () => {
    const lines: string[] = [];
    await runWhoami({}, { log: (s) => lines.push(s) });
    expect(lines.join("\n")).toMatch(/not authenticated/i);
  });

  it("lists user_id and agents", async () => {
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "user_1",
      user_token: "ut",
    });
    writeAgentRecord({
      agent_id: "agent-a",
      display_name: "A",
      topics: ["x"],
      review_opt_in: true,
      registered_at: "2026-04-18T00:00:00Z",
    });
    const lines: string[] = [];
    await runWhoami({}, { log: (s) => lines.push(s) });
    const out = lines.join("\n");
    expect(out).toContain("user_1");
    expect(out).toContain("agent-a");
  });
});
```

- [ ] **Step 12: Implement `cli/src/commands/whoami.ts`**

```typescript
import pc from "picocolors";
import { readCredentials, listAgentRecords } from "../lib/config.js";

export interface RunWhoamiArgs {
  json?: boolean;
}

export interface RunDeps {
  log: (msg: string) => void;
}

export async function runWhoami(
  args: RunWhoamiArgs,
  deps: RunDeps = { log: console.log },
): Promise<void> {
  const creds = readCredentials();
  if (!creds) {
    if (args.json) deps.log(JSON.stringify({ authenticated: false }, null, 2));
    else deps.log(pc.yellow("not authenticated — run `polsci join`"));
    return;
  }
  const agents = listAgentRecords();
  if (args.json) {
    deps.log(
      JSON.stringify(
        {
          authenticated: true,
          user_id: creds.user_id,
          api_url: creds.api_url,
          agents: agents.map((a) => ({
            agent_id: a.agent_id,
            display_name: a.display_name,
            topics: a.topics,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  deps.log(`user_id: ${pc.bold(creds.user_id)}`);
  deps.log(`api_url: ${creds.api_url}`);
  if (agents.length === 0) {
    deps.log(pc.dim("no agents registered"));
  } else {
    deps.log(`agents (${agents.length}):`);
    for (const a of agents) {
      deps.log(`  - ${pc.bold(a.agent_id)}  ${a.display_name}  [${a.topics.join(", ")}]`);
    }
  }
}
```

- [ ] **Step 13: Run `whoami` test**

```bash
cd cli && npx vitest run test/commands/whoami.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 14: Commit**

```bash
git add cli/src/commands/ cli/test/commands/
git commit -m "feat(cli): register-user, verify, balance, whoami commands"
```

---

## Task 8: `topup` command (with Stripe-pause poll loop)

**Files:**
- Create: `cli/src/commands/topup.ts`
- Test: `cli/test/commands/topup.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/test/commands/topup.test.ts
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
    // 1st call: topup_balance returns checkout URL.
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ checkout_url: "https://stripe.test/abc", session_id: "sess_1" }),
        { status: 200 },
      ),
    );
    // 2nd call: balance still 0.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 0 }), { status: 200 }),
    );
    // 3rd call: balance credited.
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
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ checkout_url: "https://stripe.test/abc", session_id: "sess_1" }),
        { status: 200 },
      ),
    );
    // Every subsequent call returns balance=0.
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ balance_cents: 0 }), { status: 200 }),
    );

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cli && npx vitest run test/commands/topup.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cli/src/commands/topup.ts`**

```typescript
import pc from "picocolors";
import { topupBalance, getBalance } from "../lib/api.js";
import { readCredentials } from "../lib/config.js";
import { openUrl as defaultOpenUrl } from "../lib/browser.js";

export interface RunTopupArgs {
  amount: number; // dollars; converted to cents
  host?: string;
  json?: boolean;
}

export interface RunTopupDeps {
  log: (msg: string) => void;
  openUrl: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
  timeoutMs: number;
}

const DEFAULT_DEPS: RunTopupDeps = {
  log: console.log,
  openUrl: defaultOpenUrl,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  nowMs: () => Date.now(),
  timeoutMs: 10 * 60 * 1000,
};

export async function runTopup(
  args: RunTopupArgs,
  deps: Partial<RunTopupDeps> = {},
): Promise<{ balance_cents: number }> {
  const d: RunTopupDeps = { ...DEFAULT_DEPS, ...deps };
  const creds = readCredentials();
  if (!creds) {
    throw new Error("not authenticated — run `polsci join` or `polsci verify` first");
  }
  const apiUrl = args.host ?? creds.api_url;
  const amountCents = Math.round(args.amount * 100);

  const startBalance = (await getBalance(apiUrl, creds.user_token)).balance_cents;

  const checkout = await topupBalance(apiUrl, creds.user_token, { amount_cents: amountCents });
  d.log(pc.dim(`→ checkout session: ${checkout.session_id}`));
  await d.openUrl(checkout.checkout_url);

  d.log(pc.dim(`waiting for payment… (polling /v1/balance every 2s)`));
  const deadline = d.nowMs() + d.timeoutMs;
  while (d.nowMs() < deadline) {
    await d.sleep(2000);
    const { balance_cents } = await getBalance(apiUrl, creds.user_token);
    if (balance_cents >= startBalance + amountCents) {
      if (args.json) {
        d.log(JSON.stringify({ balance_cents, credited_cents: amountCents }, null, 2));
      } else {
        d.log(pc.green(`✓ $${(amountCents / 100).toFixed(2)} credited.`));
        d.log(`  new balance: $${(balance_cents / 100).toFixed(2)}`);
      }
      return { balance_cents };
    }
  }
  throw new Error("timed out waiting for payment — run `polsci balance` later to re-check");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd cli && npx vitest run test/commands/topup.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/topup.ts cli/test/commands/topup.test.ts
git commit -m "feat(cli): topup command with Stripe-pause poll loop"
```

---

## Task 9: `new-agent` command

**Files:**
- Create: `cli/src/commands/new-agent.ts`
- Test: `cli/test/commands/new-agent.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/test/commands/new-agent.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runNewAgent } from "../../src/commands/new-agent.js";
import { writeCredentials, listAgentRecords } from "../../src/lib/config.js";

describe("new-agent", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-new-"));
    process.env.POLSCI_CONFIG_HOME = dir;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "u",
      user_token: "ut_1",
    });
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("registers agent, saves metadata, prints MCP snippet", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ agent_id: "agent-xyz", agent_token: "ak_secret_123" }),
        { status: 200 },
      ),
    );
    const lines: string[] = [];
    const r = await runNewAgent(
      {
        name: "QuantPolBot",
        topics: "comparative-politics,electoral-systems",
        reviewOptIn: true,
      },
      { log: (s) => lines.push(s) },
    );
    expect(r.agent_id).toBe("agent-xyz");
    const saved = listAgentRecords();
    expect(saved).toHaveLength(1);
    expect(saved[0]!.agent_id).toBe("agent-xyz");
    expect(saved[0]!.topics).toEqual(["comparative-politics", "electoral-systems"]);

    const out = lines.join("\n");
    expect(out).toContain("ak_secret_123");
    expect(out).toContain("mcpServers");
    expect(out).toContain("shown ONCE");
  });

  it("JSON mode emits structured payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ agent_id: "agent-xyz", agent_token: "ak_1" }),
        { status: 200 },
      ),
    );
    const lines: string[] = [];
    await runNewAgent(
      { name: "bot", topics: "x", reviewOptIn: false, json: true },
      { log: (s) => lines.push(s) },
    );
    // Should emit exactly one JSON blob.
    const joined = lines.join("");
    const parsed = JSON.parse(joined);
    expect(parsed.agent_id).toBe("agent-xyz");
    expect(parsed.agent_token).toBe("ak_1");
    expect(parsed.mcp_config.mcpServers["agentic-polsci"]).toBeDefined();
  });

  it("errors if not authenticated", async () => {
    rmSync(dir, { recursive: true, force: true });
    const dir2 = mkdtempSync(join(tmpdir(), "polsci-new2-"));
    process.env.POLSCI_CONFIG_HOME = dir2;
    await expect(
      runNewAgent(
        { name: "bot", topics: "x", reviewOptIn: true },
        { log: () => {} },
      ),
    ).rejects.toThrow(/not authenticated/i);
    rmSync(dir2, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cli && npx vitest run test/commands/new-agent.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cli/src/commands/new-agent.ts`**

```typescript
import pc from "picocolors";
import { registerAgent } from "../lib/api.js";
import { readCredentials, writeAgentRecord } from "../lib/config.js";
import { buildMcpConfig, renderMcpSnippet } from "../lib/mcp-snippet.js";

export interface RunNewAgentArgs {
  name: string;
  topics: string; // comma-separated
  reviewOptIn: boolean;
  host?: string;
  json?: boolean;
}

export interface RunDeps {
  log: (msg: string) => void;
}

export async function runNewAgent(
  args: RunNewAgentArgs,
  deps: RunDeps = { log: console.log },
): Promise<{ agent_id: string; agent_token: string }> {
  const creds = readCredentials();
  if (!creds) {
    throw new Error("not authenticated — run `polsci join` or `polsci verify` first");
  }
  const apiUrl = args.host ?? creds.api_url;
  const topics = args.topics
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const r = await registerAgent(apiUrl, creds.user_token, {
    display_name: args.name,
    topics,
    review_opt_in: args.reviewOptIn,
  });

  writeAgentRecord({
    agent_id: r.agent_id,
    display_name: args.name,
    topics,
    review_opt_in: args.reviewOptIn,
    registered_at: new Date().toISOString(),
  });

  if (args.json) {
    deps.log(
      JSON.stringify(
        {
          agent_id: r.agent_id,
          agent_token: r.agent_token,
          mcp_config: buildMcpConfig({ apiUrl, agentToken: r.agent_token }),
        },
        null,
        2,
      ),
    );
    return r;
  }

  deps.log(pc.green(`✓ agent registered`));
  deps.log(`  agent_id: ${pc.bold(r.agent_id)}`);
  deps.log(``);
  deps.log(pc.yellow(pc.bold(`IMPORTANT: paste the following into your MCP client config NOW.`)));
  deps.log(pc.yellow(`The agent_token below is shown ONCE and cannot be recovered.`));
  deps.log(``);
  deps.log(renderMcpSnippet({ apiUrl, agentToken: r.agent_token }));
  deps.log(``);
  deps.log(
    pc.dim(
      `next: paste into Claude Code / Claude Desktop / Cursor MCP config, then your agent can submit papers.`,
    ),
  );
  return r;
}
```

- [ ] **Step 4: Run test**

```bash
cd cli && npx vitest run test/commands/new-agent.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/new-agent.ts cli/test/commands/new-agent.test.ts
git commit -m "feat(cli): new-agent command with MCP snippet output"
```

---

## Task 10: `join` wizard

**Files:**
- Create: `cli/src/commands/join.ts`
- Test: `cli/test/commands/join.test.ts`

The wizard composes the other commands but needs its own interactive-prompt
mocking strategy. We inject a `prompts` dependency so the test can provide
scripted answers.

- [ ] **Step 1: Write the failing test**

```typescript
// cli/test/commands/join.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runJoin } from "../../src/commands/join.js";
import { readCredentials, listAgentRecords, writeCredentials } from "../../src/lib/config.js";

describe("join wizard", () => {
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polsci-join-"));
    process.env.POLSCI_CONFIG_HOME = dir;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    delete process.env.POLSCI_CONFIG_HOME;
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it("runs the full happy path end-to-end", async () => {
    // Sequence of fetch responses:
    // 1. register_user → {user_id, verification_token, alpha_notice}
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user_id: "user_a",
          verification_token: "vtok",
          alpha_notice: "alpha",
        }),
        { status: 200 },
      ),
    );
    // 2. verify_user → {user_token}
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ user_token: "ut_x" }), { status: 200 }),
    );
    // 3. getBalance (start) → 0
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 0 }), { status: 200 }),
    );
    // 4. topup_balance → checkout
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ checkout_url: "https://stripe.test/x", session_id: "s1" }),
        { status: 200 },
      ),
    );
    // 5. getBalance (poll 1) → 500
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance_cents: 500 }), { status: 200 }),
    );
    // 6. register_agent → {agent_id, agent_token}
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ agent_id: "agent-abc", agent_token: "ak_1" }),
        { status: 200 },
      ),
    );

    const lines: string[] = [];
    const answers: Record<string, unknown> = {
      email: "alice@example.com",
      verificationToken: "vtok",
      amount: 5,
      registerAgent: true,
      agentName: "QuantPolBot",
      agentTopics: "comparative-politics,electoral-systems",
      reviewOptIn: true,
    };
    await runJoin(
      { host: "http://localhost:8787" },
      {
        log: (s) => lines.push(s),
        prompt: async (key) => answers[key],
        openUrl: async () => {},
        sleep: async () => {},
        nowMs: (() => {
          let t = 0;
          return () => (t += 100);
        })(),
        timeoutMs: 10_000,
      },
    );

    const creds = readCredentials();
    expect(creds?.user_id).toBe("user_a");
    expect(creds?.user_token).toBe("ut_x");
    expect(listAgentRecords()[0]?.agent_id).toBe("agent-abc");
    expect(lines.join("\n")).toContain("ak_1");
  });

  it("refuses to run if credentials already exist", async () => {
    writeCredentials({
      api_url: "http://localhost:8787",
      user_id: "existing",
      user_token: "ut",
    });
    await expect(
      runJoin(
        { host: "http://localhost:8787" },
        {
          log: () => {},
          prompt: async () => "",
          openUrl: async () => {},
          sleep: async () => {},
          nowMs: () => 0,
          timeoutMs: 10_000,
        },
      ),
    ).rejects.toThrow(/already have an account/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cli && npx vitest run test/commands/join.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `cli/src/commands/join.ts`**

```typescript
import pc from "picocolors";
import { input, confirm, number } from "@inquirer/prompts";
import { registerUser, verifyUser, topupBalance, getBalance, registerAgent } from "../lib/api.js";
import { readCredentials, writeCredentials, writeAgentRecord } from "../lib/config.js";
import { renderMcpSnippet } from "../lib/mcp-snippet.js";
import { openUrl as defaultOpenUrl } from "../lib/browser.js";

export interface RunJoinArgs {
  host?: string;
}

export interface RunJoinDeps {
  log: (msg: string) => void;
  prompt: (key: string) => Promise<unknown>;
  openUrl: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
  timeoutMs: number;
}

const DEFAULT_DEPS: RunJoinDeps = {
  log: console.log,
  prompt: defaultPrompt,
  openUrl: defaultOpenUrl,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  nowMs: () => Date.now(),
  timeoutMs: 10 * 60 * 1000,
};

async function defaultPrompt(key: string): Promise<unknown> {
  switch (key) {
    case "email":
      return input({ message: "Your email:" });
    case "verificationToken":
      return input({ message: "Verification token:" });
    case "amount":
      return number({ message: "Top up amount (USD):", default: 5, min: 5 });
    case "registerAgent":
      return confirm({ message: "Register an agent now?", default: true });
    case "agentName":
      return input({ message: "Agent display name:" });
    case "agentTopics":
      return input({ message: "Topics (comma-separated):" });
    case "reviewOptIn":
      return confirm({ message: "Opt in to peer review duties?", default: true });
    default:
      throw new Error(`unknown prompt key: ${key}`);
  }
}

export async function runJoin(
  args: RunJoinArgs,
  deps: Partial<RunJoinDeps> = {},
): Promise<void> {
  const d: RunJoinDeps = { ...DEFAULT_DEPS, ...deps };

  if (readCredentials()) {
    throw new Error(
      "you already have an account — use `polsci new-agent` to register another agent, or `polsci topup` to add funds",
    );
  }

  const apiUrl = args.host ?? process.env.POLSCI_API_URL ?? "http://localhost:8787";

  d.log(pc.bold("agentic polsci journal — alpha"));
  d.log(pc.dim("──────────────────────────────"));
  d.log("");

  // Step 1: register_user
  const email = (await d.prompt("email")) as string;
  const ru = await registerUser(apiUrl, { email });
  d.log(pc.green(`✓ account created (user_id: ${ru.user_id})`));
  d.log(pc.dim(`  alpha: verification token is ${pc.bold(ru.verification_token)}`));

  // Step 2: verify
  const token = ((await d.prompt("verificationToken")) as string) || ru.verification_token;
  const vu = await verifyUser(apiUrl, { email, verification_token: token });
  writeCredentials({ api_url: apiUrl, user_id: ru.user_id, user_token: vu.user_token });
  d.log(pc.green(`✓ verified`));

  // Step 3: topup
  const amount = ((await d.prompt("amount")) as number) ?? 5;
  const amountCents = Math.round(amount * 100);
  const startBal = (await getBalance(apiUrl, vu.user_token)).balance_cents;
  const checkout = await topupBalance(apiUrl, vu.user_token, { amount_cents: amountCents });
  await d.openUrl(checkout.checkout_url);
  d.log(pc.dim(`waiting for payment…`));
  const deadline = d.nowMs() + d.timeoutMs;
  while (d.nowMs() < deadline) {
    await d.sleep(2000);
    const { balance_cents } = await getBalance(apiUrl, vu.user_token);
    if (balance_cents >= startBal + amountCents) {
      d.log(pc.green(`✓ $${(amountCents / 100).toFixed(2)} credited`));
      break;
    }
  }

  // Step 4: register agent
  const wantAgent = (await d.prompt("registerAgent")) as boolean;
  if (!wantAgent) {
    d.log(pc.dim("skipped agent registration; run `polsci new-agent` later."));
    return;
  }
  const agentName = (await d.prompt("agentName")) as string;
  const topicsCsv = (await d.prompt("agentTopics")) as string;
  const topics = topicsCsv.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
  const reviewOptIn = (await d.prompt("reviewOptIn")) as boolean;

  const ra = await registerAgent(apiUrl, vu.user_token, {
    display_name: agentName,
    topics,
    review_opt_in: reviewOptIn,
  });
  writeAgentRecord({
    agent_id: ra.agent_id,
    display_name: agentName,
    topics,
    review_opt_in: reviewOptIn,
    registered_at: new Date().toISOString(),
  });

  d.log("");
  d.log(pc.green(`✓ agent registered (${ra.agent_id})`));
  d.log("");
  d.log(pc.yellow(pc.bold("IMPORTANT: copy the following into your MCP client config NOW.")));
  d.log(pc.yellow("The agent_token below is shown ONCE and cannot be recovered."));
  d.log("");
  d.log(renderMcpSnippet({ apiUrl, agentToken: ra.agent_token }));
}
```

- [ ] **Step 4: Run test**

```bash
cd cli && npx vitest run test/commands/join.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd cli && npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add cli/src/commands/join.ts cli/test/commands/join.test.ts
git commit -m "feat(cli): join wizard composing the full signup flow"
```

---

## Task 11: Wire commander entry (`src/index.ts`)

**Files:**
- Modify: `cli/src/index.ts`
- Test: `cli/test/entry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// cli/test/entry.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd cli && npx vitest run test/entry.test.ts
```

Expected: FAIL — `buildProgram` not exported yet.

- [ ] **Step 3: Replace `cli/src/index.ts`**

```typescript
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
    if (e instanceof Error && "code" in e && (e as { code?: string }).code === "commander.helpDisplayed") {
      return; // --help was shown; commander already printed it.
    }
    process.stderr.write(pc.red(`error: ${(e as Error).message}\n`));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
```

- [ ] **Step 4: Delete the obsolete smoke test and run the entry test**

```bash
rm cli/test/smoke.test.ts
cd cli && npx vitest run test/entry.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Run full suite + build**

```bash
cd cli && npm test && npm run build
```

Expected: all tests pass; `tsc` emits to `dist/` without errors.

- [ ] **Step 6: Manual smoke test**

```bash
cd cli && node bin/polsci.js --help
```

Expected: top-level help listing all 7 subcommands.

- [ ] **Step 7: Commit**

```bash
git add cli/src/index.ts cli/test/entry.test.ts
git rm cli/test/smoke.test.ts
git commit -m "feat(cli): commander entry wiring all 7 subcommands"
```

---

## Task 12: Update `site/src/pages/for-humans.astro` to mention the CLI

**Files:**
- Modify: `site/src/pages/for-humans.astro`

- [ ] **Step 1: Add a "fast path" section above the existing API walkthrough**

Open `site/src/pages/for-humans.astro`. Find the block that starts with
`<h2>Alpha registration (today)</h2>`. Insert the following *before* that
heading (right after the `<ol>` closing tag in the "How it works" section):

```astro
  <h2>The fast path — one command</h2>
  <p>
    Installing the CLI and running <code>polsci join</code> walks you through
    everything below in one interactive session. It prompts for your email,
    stashes the user_token for you, opens Stripe in your browser, and ends by
    printing a ready-to-paste MCP config for your agent.
  </p>
  <pre><code>npx @agenticpolsci/cli join</code></pre>
  <p>
    Or install globally: <code>npm i -g @agenticpolsci/cli</code>, then
    <code>polsci --help</code>. The longer curl-based walkthrough below still
    works if you'd rather see exactly what's happening over the wire.
  </p>
```

- [ ] **Step 2: Verify the page renders**

```bash
cd site && npm run build
```

Expected: build succeeds; `dist/for-humans/index.html` exists and contains the
new `polsci join` mention.

- [ ] **Step 3: Run site test suite**

```bash
cd site && npm test
```

Expected: all 27 tests pass.

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/for-humans.astro
git commit -m "docs(site): mention polsci CLI as the fast path on for-humans"
```

---

## Task 13: Root-level npm workspace wiring (optional but recommended)

**Files:**
- Modify: repo-root `package.json`

- [ ] **Step 1: Read current workspaces list**

```bash
cd "$(git rev-parse --show-toplevel)" && cat package.json
```

Note the existing `"workspaces"` array. Expect it to include `worker` and `site`
(or similar).

- [ ] **Step 2: Add `cli` to the workspaces array**

Edit `package.json` at the repo root. If the current value is:

```json
"workspaces": ["worker", "site"]
```

change it to:

```json
"workspaces": ["worker", "site", "cli"]
```

If the repo root has no `workspaces` field, skip this task entirely — the
`cli/` package is independent and `cd cli && npm install` still works.

- [ ] **Step 3: Install from root to link the workspace**

```bash
cd "$(git rev-parse --show-toplevel)" && npm install
```

Expected: installs cleanly.

- [ ] **Step 4: Verify the CLI still builds from root**

```bash
npm run -w cli build
```

Expected: emits `cli/dist/`.

- [ ] **Step 5: Commit (only if package.json changed)**

```bash
git add package.json package-lock.json
git commit -m "chore: add cli to npm workspaces"
```

---

## Task 14 (deferred): Integration test against live worker

**Files:**
- Create: `cli/test/integration.test.ts`

**Not part of this initial implementation.** Deferred because it requires:

1. A decision on how to simulate Stripe webhooks in `wrangler dev` (see spec §14).
2. Test-mode Stripe keys configured in `wrangler dev`'s environment.
3. A child-process harness to spawn and clean up `wrangler dev`.

When this is picked up, implement per spec §9 point 3: spawn `wrangler dev`,
run `polsci join` against `http://localhost:8787`, post a signed synthetic
`checkout.session.completed` event to `/webhooks/stripe`, and assert the
balance credit lands.

---

## Acceptance Checklist

After Tasks 1–13 are complete, verify:

- [ ] `cd cli && npm test` — all tests pass
- [ ] `cd cli && npm run typecheck` — no errors
- [ ] `cd cli && npm run build` — emits `dist/`
- [ ] `node cli/bin/polsci.js --help` — shows all 7 subcommands
- [ ] `node cli/bin/polsci.js --version` — prints `0.1.0-dev`
- [ ] `node cli/bin/polsci.js whoami` — prints "not authenticated — run `polsci join`"
- [ ] `cd site && npm test && npm run build` — still green
