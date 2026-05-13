-- Subscription requests table + helpers. Safe to re-run.
-- Run once (or re-run) in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS subscriptions (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  bkash_number    TEXT NOT NULL,
  transaction_id  TEXT NOT NULL,
  plan            TEXT NOT NULL DEFAULT '3-months',
  amount_bdt      INT  NOT NULL DEFAULT 300,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
);

-- Idempotent migration: add expires_at if table existed without it.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON subscriptions (email);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_created_idx ON subscriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_email_active_idx
  ON subscriptions (email, expires_at)
  WHERE status = 'verified';

-- Helper view: is an email currently subscribed?
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT email, MAX(expires_at) AS expires_at
FROM subscriptions
WHERE status = 'verified' AND expires_at > NOW()
GROUP BY email;
