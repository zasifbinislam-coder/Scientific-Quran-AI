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

-- Idempotent migration: tie each row to an auth user so /account doesn't
-- have to rely on case-sensitive email matching. Older rows keep email-only.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Cron-driven lifecycle email guards. Each timestamp is null until the
-- corresponding email has been sent, so the cron doesn't re-send daily.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS reminder_sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_notified_at TIMESTAMPTZ;

-- Backfill: for existing rows that have no user_id, try to match by email.
UPDATE subscriptions s
SET user_id = u.id
FROM auth.users u
WHERE s.user_id IS NULL
  AND lower(u.email) = lower(s.email);

CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON subscriptions (email);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
CREATE INDEX IF NOT EXISTS subscriptions_created_idx ON subscriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_email_active_idx
  ON subscriptions (email, expires_at)
  WHERE status = 'verified';

-- Helper view: is an email currently subscribed?
-- security_invoker = true makes the view run with the CALLER's permissions,
-- so RLS on subscriptions is respected (silences Supabase advisor).
DROP VIEW IF EXISTS active_subscriptions;
CREATE VIEW active_subscriptions
WITH (security_invoker = true) AS
SELECT email, MAX(expires_at) AS expires_at
FROM subscriptions
WHERE status = 'verified' AND expires_at > NOW()
GROUP BY email;

-- Authenticated users can read their own subscription row.
-- Match on user_id first (robust), fall back to email so older rows stay visible.
-- Service role still has full access (bypasses RLS) for /admin endpoints.
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR email = (SELECT auth.jwt() ->> 'email')
  );
