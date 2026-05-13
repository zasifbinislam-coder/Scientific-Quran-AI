-- Subscription requests table. Run once in Supabase SQL editor.
-- Used by POST /api/subscribe to record bKash-payment-then-verify requests.

CREATE TABLE IF NOT EXISTS subscriptions (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  bkash_number  TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT '3-months',
  amount_bdt    INT  NOT NULL DEFAULT 300,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON subscriptions (email);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_created_idx ON subscriptions (created_at DESC);
