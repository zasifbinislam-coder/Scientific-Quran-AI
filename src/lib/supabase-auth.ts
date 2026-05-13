/**
 * Supabase Auth clients — one for the browser (singleton with localStorage
 * session), one factory for server-side request handlers (cookies-based).
 *
 * Public anon key is REQUIRED for these (not service role) — Supabase Auth
 * runs under RLS and needs the anon role for session management.
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase Auth needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, anon };
}

// ─── Browser client (singleton) ───
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getBrowserSupabase() {
  if (browserClient) return browserClient;
  const { url, anon } = getEnv();
  browserClient = createBrowserClient(url, anon);
  return browserClient;
}

// ─── Server client (per-request) ───
// `cookieStore` is `await cookies()` from `next/headers` in a Server
// Component or Route Handler. Typed loosely to avoid coupling to Next.js
// internal cookie shapes across minor versions.
type CookieStore = {
  getAll(): { name: string; value: string }[];
  set?(name: string, value: string, options?: CookieOptions): void;
};

export function getServerSupabase(cookieStore: CookieStore) {
  const { url, anon } = getEnv();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set?.(name, value, options)
          );
        } catch {
          // Server Components can't mutate cookies — that's fine, the
          // middleware/server-action path will refresh the session.
        }
      },
    },
  });
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "zasifbinislam@gmail.com";
  const admins = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
