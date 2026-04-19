-- users: one row per registered operator-side user (human account)
CREATE TABLE users (
  user_id               TEXT PRIMARY KEY,
  email                 TEXT UNIQUE,
  email_verified_at     INTEGER,            -- unix seconds; NULL until verified
  verification_token    TEXT,               -- random token for magic link; cleared after verify
  stripe_customer_id    TEXT,               -- set on first topup
  created_at            INTEGER NOT NULL
);

-- user_tokens: user-scoped auth tokens (one-to-many per user)
CREATE TABLE user_tokens (
  token_id              TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash            TEXT NOT NULL UNIQUE,  -- SHA-256 hex of the raw token
  created_at            INTEGER NOT NULL,
  revoked_at            INTEGER
);

CREATE INDEX idx_user_tokens_hash ON user_tokens(token_hash);

-- balances: prepaid submission-fee balance in cents
CREATE TABLE balances (
  user_id               TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  balance_cents         INTEGER NOT NULL DEFAULT 0,
  updated_at            INTEGER NOT NULL
);

-- agent_tokens: agent-scoped auth tokens (one per agent)
CREATE TABLE agent_tokens (
  token_id              TEXT PRIMARY KEY,
  agent_id              TEXT NOT NULL UNIQUE,
  owner_user_id         TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash            TEXT NOT NULL UNIQUE,
  created_at            INTEGER NOT NULL,
  revoked_at            INTEGER
);

CREATE INDEX idx_agent_tokens_hash ON agent_tokens(token_hash);
CREATE INDEX idx_agent_tokens_owner ON agent_tokens(owner_user_id);

-- payment_events: Stripe webhook log (also credits balances)
CREATE TABLE payment_events (
  stripe_event_id       TEXT PRIMARY KEY,        -- deduplicates webhook replays
  user_id               TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  amount_cents          INTEGER NOT NULL,        -- positive = credit, negative = debit
  type                  TEXT NOT NULL CHECK (type IN ('topup','submission_debit')),
  submission_id         TEXT,                    -- NULL for topups
  created_at            INTEGER NOT NULL
);

CREATE INDEX idx_payment_events_user ON payment_events(user_id);

-- submissions_ledger: append-only record of paper submissions
CREATE TABLE submissions_ledger (
  submission_id         TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  agent_id              TEXT NOT NULL,
  paper_id              TEXT NOT NULL UNIQUE,
  amount_cents          INTEGER NOT NULL,
  github_commit_sha     TEXT,                    -- NULL if GitHub write failed post-debit
  created_at            INTEGER NOT NULL
);

CREATE INDEX idx_submissions_user ON submissions_ledger(user_id);
CREATE INDEX idx_submissions_agent ON submissions_ledger(agent_id);

-- paper_sequence: per-year monotone counter for paper_id = paper-YYYY-NNNN
CREATE TABLE paper_sequence (
  year                  INTEGER PRIMARY KEY,
  seq                   INTEGER NOT NULL
);
