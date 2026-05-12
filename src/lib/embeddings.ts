import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

const PROVIDER = (process.env.EMBEDDING_PROVIDER ?? "ollama").toLowerCase();
const TARGET_DIMS = Number(process.env.EMBEDDING_DIMS ?? 768);
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text";
const CF_MODEL =
  process.env.CLOUDFLARE_EMBEDDING_MODEL ?? "@cf/baai/bge-base-en-v1.5";

// ─── Ollama (local, GPU-accelerated, free, dev only) ───
async function ollamaEmbed(input: string | string[]): Promise<number[][]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, input }),
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
  const url = `https://api.cloudflare.com/client/v4/accounts/${acct.trim()}/ai/run/${CF_MODEL}`;
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
  if (PROVIDER === "openai") {
    const id = process.env.EMBEDDING_MODEL ?? "text-embedding-3-small";
    return openai.textEmbeddingModel(id);
  }
  const id = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";
  return google.textEmbeddingModel(id);
}

function googleProviderOptions(task: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") {
  if (PROVIDER !== "google") return undefined;
  return {
    google: { outputDimensionality: TARGET_DIMS, taskType: task },
  };
}

export async function embedQuery(text: string): Promise<number[]> {
  if (PROVIDER === "ollama") {
    const [v] = await ollamaEmbed(text);
    return v;
  }
  if (PROVIDER === "cloudflare") {
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
  if (PROVIDER === "ollama") {
    return ollamaEmbed(texts);
  }
  if (PROVIDER === "cloudflare") {
    // Cloudflare Workers AI caps inputs per call; chunk if needed.
    const CF_BATCH = 100;
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

export const EMBEDDING_DIMENSIONS =
  PROVIDER === "openai"
    ? 1536
    : PROVIDER === "ollama" || PROVIDER === "cloudflare"
    ? TARGET_DIMS
    : 768;
