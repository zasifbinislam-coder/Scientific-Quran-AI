import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
  type LanguageModel,
} from "ai";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { formatRetrievedForPrompt, retrieveContext } from "@/lib/retrieve";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Multi-key rotation for Gemini ───
// Each Google account / GCP project gets its own free-tier RPM quota.
// Two ways to supply multiple keys (we read both for convenience):
//   1. GOOGLE_GENERATIVE_AI_API_KEY=key1,key2,key3   (comma-separated)
//   2. GOOGLE_GENERATIVE_AI_API_KEY_2=...            (numbered: _2, _3, ... up to _10)
// Each request picks a random key → effective ~ N × free-tier RPM.
function collectGoogleKeys(): string[] {
  const keys: string[] = [];
  const primary = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
  primary
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .forEach((k) => keys.push(k));
  for (let i = 2; i <= 10; i++) {
    const k = process.env[`GOOGLE_GENERATIVE_AI_API_KEY_${i}`]?.trim();
    if (k) keys.push(k);
  }
  // Dedupe in case the same key was set in both formats.
  return Array.from(new Set(keys));
}

function rotatedGoogleKey(): string {
  const keys = collectGoogleKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY (or _2, _3...)."
    );
  }
  return keys[Math.floor(Math.random() * keys.length)];
}

function buildGoogleClient() {
  return createGoogleGenerativeAI({ apiKey: rotatedGoogleKey() });
}

function pickModel(
  useWebSearch: boolean,
  google: ReturnType<typeof createGoogleGenerativeAI>
): LanguageModel {
  const provider = (process.env.LLM_PROVIDER ?? "google").toLowerCase();
  if (provider === "openai") {
    return openai(process.env.OPENAI_MODEL ?? "gpt-4o");
  }
  if (provider === "anthropic") {
    return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6");
  }
  // Google. Gemini 3 preview (gemini-flash-latest) is fastest but doesn't
  // have free grounding quota — fall back to gemini-2.5-flash for the
  // web-search path.
  const defaultModel = useWebSearch
    ? process.env.GOOGLE_GROUNDED_MODEL ?? "gemini-2.5-flash"
    : process.env.GOOGLE_MODEL ?? "gemini-flash-latest";
  return google(defaultModel);
}

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const parts = (m as UIMessage).parts ?? [];
    const text = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

export async function POST(req: Request) {
  let body: { messages?: UIMessage[]; useWebSearch?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  const query = lastUserText(messages);
  const retrieved = query ? await retrieveContext(query, 6) : [];
  const contextBlock = formatRetrievedForPrompt(retrieved);

  const modelMessages = await convertToModelMessages(messages);

  // User-opted web search is only available on the Google provider.
  const provider = (process.env.LLM_PROVIDER ?? "google").toLowerCase();
  const useWebSearch = Boolean(body.useWebSearch) && provider === "google";

  // Build a per-request Google client with a randomly-rotated API key.
  // This is what spreads load across multiple keys for free-tier RPM relief.
  const google = buildGoogleClient();

  const result = streamText({
    model: pickModel(useWebSearch, google),
    system: buildSystemPrompt(contextBlock, { useWebSearch }),
    messages: modelMessages,
    temperature: 0.4,
    ...(useWebSearch
      ? { tools: { google_search: google.tools.googleSearch({}) } }
      : {}),
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: () => ({
      sources: retrieved.map((c) => ({
        source: c.source,
        similarity: c.similarity,
        kind: (c.metadata as { kind?: string })?.kind,
      })),
      webSearch: useWebSearch,
    }),
  });
}
