-- Run this once in the Supabase SQL editor to bootstrap the knowledge base.
-- Safe to re-run: it drops and recreates the table + RPC.
--
-- Embedding dimensions:
--   Cloudflare @cf/baai/bge-m3       → 1024  (default for this project, multilingual)
--   Ollama nomic-embed-text          → 768
--   OpenAI text-embedding-3-small    → 1536
-- If you change provider/dims, edit VECTOR(n) on both the column and the RPC.

CREATE EXTENSION IF NOT EXISTS vector;

-- The table is recreated from scratch. This drops any previously ingested
-- rows — re-run `npm run ingest` after applying this.
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
  id          BIGSERIAL PRIMARY KEY,
  content     TEXT NOT NULL,
  source      TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding   VECTOR(1024),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX documents_embedding_hnsw
  ON documents
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX documents_metadata_gin
  ON documents
  USING gin (metadata);

-- Cosine-similarity RPC used by src/lib/retrieve.ts
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

-- Public read policy on documents — the Quran/tafsir knowledge base is
-- already public content; this just silences the "RLS no policy" advisor
-- and is honest about what the data is.
DROP POLICY IF EXISTS "Public can read documents" ON documents;
CREATE POLICY "Public can read documents"
  ON documents
  FOR SELECT
  TO public
  USING (true);
