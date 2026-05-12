import { getSupabase, hasSupabase } from "./supabase";
import { embedQuery } from "./embeddings";

export type RetrievedChunk = {
  id: number;
  content: string;
  source: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
};

function hasEmbeddingKey(): boolean {
  const provider = (process.env.EMBEDDING_PROVIDER ?? "ollama").toLowerCase();
  if (provider === "ollama") return true; // local — no key required
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "cloudflare") {
    return Boolean(
      process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
    );
  }
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export async function retrieveContext(
  query: string,
  matchCount = 6
): Promise<RetrievedChunk[]> {
  if (!hasSupabase()) return [];
  if (!hasEmbeddingKey()) return [];

  let embedding: number[];
  try {
    embedding = await embedQuery(query);
  } catch (err) {
    console.error("[retrieve] embedding failed:", err);
    return [];
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_count: matchCount,
    filter: {},
  });

  if (error) {
    console.error("[retrieve] supabase rpc error:", error.message);
    return [];
  }

  return (data ?? []) as RetrievedChunk[];
}

export function formatRetrievedForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) => {
      const src = c.source ?? c.metadata?.source ?? "unknown";
      const kind = c.metadata?.kind ?? "document";
      return `[#${i + 1}] (source: ${src} | kind: ${kind} | similarity: ${c.similarity.toFixed(
        3
      )})\n${c.content.trim()}`;
    })
    .join("\n\n---\n\n");
}
