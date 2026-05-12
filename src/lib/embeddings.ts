import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

// All env config is read lazily (per-call) so that dotenv.config() in the
// entry script — which always runs AFTER ESM imports are hoisted — is
// respected. Reading process.env at module load would freeze whichever
// defaults applied before dotenv ran.
function cfg() {
  return {
    provider: (process.env.EMBEDDING_PROVIDER ?? "ollama").toLowerCase(),
    targetDims: Number(process.env.EMBEDDING_DIMS ?? 1024),
    ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
    cfModel: process.env.CLOUDFLARE_EMBEDDING_MODEL ?? "@cf/baai/bge-m3",
  };
}

// ─── Ollama (local, GPU-accelerated, free, dev only) ───
async function ollamaEmbed(input: string | string[]): Promise<number[][]> {
  const { ollamaUrl, ollamaModel } = cfg();
  const res = await fetch(`${ollamaUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: ollamaModel, input }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama embed failed (${res.status}): ${txt}`);
  }
  const data = (await res.json()) as { embeddings: number[][] };
  if (!data.embeddings || !Array.isArray(data.embeddings)) {
    throw new Error(`Ollama returned no embeddings: ${JSON.stringify(data)}`);
  }
  return data.embeddings;
}

// ─── Cloudflare Workers AI (cloud, free tier, production) ───
async function cloudflareEmbed(input: string[]): Promise<number[][]> {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!acct || !token) {
    throw new Error(
      "Cloudflare embed: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in env."
    );
  }
  const { cfModel } = cfg();
  const url = `https://api.cloudflare.com/client/v4/accounts/${acct.trim()}/ai/run/${cfModel}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: input }),
  });
  const data = (await res.json()) as {
    success?: boolean;
    result?: { data?: number[][]; shape?: number[] };
    errors?: { code: number; message: string }[];
  };
  if (!data.success || !data.result?.data) {
    const msg =
      data.errors?.map((e) => `[${e.code}] ${e.message}`).join("; ") ??
      `HTTP ${res.status}`;
    throw new Error(`Cloudflare embed failed: ${msg}`);
  }
  return data.result.data;
}

// ─── Vercel AI SDK path (Google / OpenAI) ───
function getEmbeddingModel() {
  const { provider } = cfg();
  if (provider === "openai") {
    const id = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
    return openai.textEmbeddingModel(id);
  }
  const id = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
  return google.textEmbeddingModel(id);
}

function googleProviderOptions(task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") {
  const { provider, targetDims } = cfg();
  if (provider !== "google") return undefined;
  return {
    google: { outputDimensionality: targetDims, taskType: task },
  };
}

export async function embedQuery(text: string): Promise<number[]> {
  const { provider } = cfg();
  if (provider === "ollama") {
    const [v] = await ollamaEmbed(text);
    return v;
  }
  if (provider === "cloudflare") {
    const [v] = await cloudflareEmbed([text]);
    return v;
  }
  const opts = googleProviderOptions("RETRIEVAL_QUERY");
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: text,
    ...(opts ? { providerOptions: opts } : {}),
  });
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const { provider } = cfg();
  if (provider === "ollama") {
    return ollamaEmbed(texts);
  }
  if (provider === "cloudflare") {
    // bge-m3 caps at 60k tokens per request. Our 1000-char chunks average
    // ~940 tokens, so 100/request → 94k tokens (over limit).
    // CF_BATCH=30 → ~28k tokens, safely under the cap with headroom for
    // longer-than-average chunks (Arabic with diacritics tokenizes heavier).
    const CF_BATCH = Number(process.env.CF_BATCH ?? 30);
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += CF_BATCH) {
      const slice = texts.slice(i, i + CF_BATCH);
      out.push(...(await cloudflareEmbed(slice)));
    }
    return out;
  }
  const opts = googleProviderOptions("RETRIEVAL_DOCUMENT");
  const { embeddings } = await embedMany({
    model: getEmbeddingModel(),
    values: texts,
    ...(opts ? { providerOptions: opts } : {}),
  });
  return embeddings;
}

export function getEmbeddingDimensions(): number {
  const { provider, targetDims } = cfg();
  if (provider === "openai") return 1536;
  return targetDims;
}
