export type Env = {
  // Bindings
  DB: D1Database;

  // Public vars
  REPO_OWNER: string;
  REPO_NAME: string;
  REPO_BRANCH: string;
  PUBLIC_URL: string;

  // Secrets
  GITHUB_TOKEN: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  AUTH_SALT: string;
};
