import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
  type LanguageModel,
} from "ai";
import { cookies } from "next/headers";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { formatRetrievedForPrompt, retrieveContext } from "@/lib/retrieve";
import { getServerSupabase } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── IP-based abuse limiter ───
// In-memory per-IP token bucket. Best-effort on Vercel (cold starts reset
// the Map, but warm containers carry state for the duration of their life,
// which is enough to stop a single abusive client from draining all Gemini
// keys in a single burst). For stronger guarantees switch to @upstash/ratelimit.
const IP_LIMIT = Number(process.env.IP_LIMIT ?? 30);
const IP_WINDOW_MS = Number(process.env.IP_WINDOW_MS ?? 60_000);
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function checkIpLimit(ip: string): { ok: true } | { ok: false; retrySec: number } {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= IP_LIMIT) {
    return { ok: false, retrySec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true };
}

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

// Per-key cooldown: when a key returns 429, we mark it as in cooldown for
// ~65s so subsequent requests skip it and prefer fresh keys. In-memory only
// (good for a single warm Vercel container; cold starts reset it, which is
// fine — RPM windows are short anyway).
const keyCooldowns = new Map<string, number>();

function rotatedGoogleKey(): { apiKey: string; allKeys: string[] } {
  const keys = collectGoogleKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY (or _2, _3...)."
    );
  }
  const now = Date.now();
  const available = keys.filter((k) => (keyCooldowns.get(k) ?? 0) <= now);
  const pool = available.length > 0 ? available : keys; // all dead? still try one
  const apiKey = pool[Math.floor(Math.random() * pool.length)];
  return { apiKey, allKeys: keys };
}

function markKeyRateLimited(apiKey: string, durationMs = 65_000) {
  keyCooldowns.set(apiKey, Date.now() + durationMs);
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

// Check whether the signed-in user has an active (verified, non-expired)
// subscription. Returns true if so — caller should then bypass the IP
// rate-limiter. Anonymous users always get the free-tier limit applied.
async function isSubscribed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("subscriptions")
      .select("id, expires_at")
      .eq("email", email.toLowerCase())
      .eq("status", "verified")
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // Resolve signed-in user (if any) via Supabase session cookie.
  let userEmail: string | null = null;
  try {
    const cookieStore = await cookies();
    const userClient = getServerSupabase(cookieStore);
    const { data } = await userClient.auth.getUser();
    userEmail = data.user?.email ?? null;
  } catch {
    // Auth env not configured / no session — proceed as anonymous.
  }
  const subscribed = await isSubscribed(userEmail);

  // Abuse prevention — apply IP rate limit ONLY to non-subscribers.
  if (!subscribed) {
    const ip = getClientIp(req);
    const limitCheck = checkIpLimit(ip);
    if (!limitCheck.ok) {
      return Response.json(
        {
          error: `Too many requests from your IP. Please retry in ~${limitCheck.retrySec}s.`,
        },
        { status: 429, headers: { "Retry-After": String(limitCheck.retrySec) } }
      );
    }
  }

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

  // Build a per-request Google client with a rotated API key (skipping
  // any keys we already know are in cooldown from a recent 429).
  const { apiKey } = rotatedGoogleKey();
  const google = createGoogleGenerativeAI({ apiKey });

  const result = streamText({
    model: pickModel(useWebSearch, google),
    system: buildSystemPrompt(contextBlock, { useWebSearch }),
    messages: modelMessages,
    temperature: 0.4,
    ...(useWebSearch
      ? { tools: { google_search: google.tools.googleSearch({}) } }
      : {}),
    onError: ({ error }) => {
      // When this key hits a quota, mark it dead for 65s so future requests
      // pick a different one. The user still sees this one failed —
      // the UI's UpgradeModal handles that gracefully — but the NEXT
      // request from any user routes around the dead key.
      const msg =
        (error as { message?: string })?.message?.toLowerCase?.() ?? "";
      if (
        msg.includes("quota") ||
        msg.includes("rate-limit") ||
        msg.includes("rate limit") ||
        msg.includes("resource_exhausted") ||
        msg.includes("429")
      ) {
        markKeyRateLimited(apiKey);
      }
    },
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
