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
// Setting GOOGLE_GENERATIVE_AI_API_KEY to a comma-separated list lets us
// rotate per request — N keys → effective ~ N × 20 RPM.
function rotatedGoogleKey(): string {
  const raw = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add one or more comma-separated keys."
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
