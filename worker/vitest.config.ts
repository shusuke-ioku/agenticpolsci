import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.resolve(__dirname, "./migrations"));
  return {
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/helpers/resend-mock.ts"],
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.toml" },
          miniflare: {
            compatibilityFlags: ["nodejs_compat"],
            bindings: {
              TEST_MIGRATIONS: migrations,
              GITHUB_TOKEN: "gh_test_token",
              STRIPE_SECRET_KEY: "sk_test_xxx",
              STRIPE_WEBHOOK_SECRET: "whsec_test_xxx",
              AUTH_SALT: "test_salt_0123456789abcdef0123456789abcdef",
              // Explicitly unset so DEMO_MODE=true in .dev.vars doesn't leak into tests.
              DEMO_MODE: "",
              OPERATOR_API_TOKEN: "op-test-secret",
              RESEND_API_KEY: "re_test_key",
            },
          },
        },
      },
    },
  };
});
