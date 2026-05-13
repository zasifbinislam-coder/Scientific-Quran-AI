-- One-shot migration to silence Supabase Advisor warnings.
-- Safe to re-run.
-- Run in: Supabase dashboard → SQL Editor → paste → Run

-- ───────────────────────────────────────────────────────────────────────
-- 1. CRITICAL: active_subscriptions view → use SECURITY INVOKER
--    so the view runs with the CALLER'S permissions, not the creator's.
--    Without this, an unauth'd user reaching the view bypasses RLS on
--    the underlying table.
-- ───────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS active_subscriptions;
CREATE VIEW active_subscriptions
WITH (security_invoker = true) AS
SELECT email, MAX(expires_at) AS expires_at
FROM subscriptions
WHERE status = 'verified' AND expires_at > NOW()
GROUP BY email;


-- ───────────────────────────────────────────────────────────────────────
-- 2. Function Search Path Mutable: match_documents needs an explicit
--    search_path so it can't be tricked into resolving "documents" to
--    a malicious schema-owned table.
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1024),
  match_count     INT DEFAULT 6,
  filter          JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id          BIGINT,
  content     TEXT,
  source      TEXT,
  metadata    JSONB,
  similarity  FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.source,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- ───────────────────────────────────────────────────────────────────────
-- 3. RLS policy on documents: explicit public-read.
--    The Quran/tafsir/Bible knowledge base is genuinely public content
--    (it's already free to read on tanzil.net, sunnah.com, etc.).
--    Letting anyone SELECT silences the advisor and is honest about
--    what the data is. INSERTs/UPDATEs/DELETEs still require service role.
-- ───────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Public can read documents" ON documents;
CREATE POLICY "Public can read documents"
  ON documents
  FOR SELECT
  TO public
  USING (true);


-- ───────────────────────────────────────────────────────────────────────
-- 4. RLS policy on subscriptions: authenticated users can read their own
--    row (matched by email). Service role still has full access for
--    /admin and /api/subscribe. Anon users get nothing.
-- ───────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (email = (SELECT auth.jwt() ->> 'email'));
