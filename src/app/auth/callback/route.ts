/**
 * OAuth callback endpoint — Supabase redirects the user here with a `code`
 * query param after a successful sign-in. We exchange it for a session and
 * redirect back to the chat (or wherever `next` says).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", url.origin));
  }

  try {
    const cookieStore = await cookies();
    const supabase = getServerSupabase(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
  } catch (err) {
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent((err as Error).message)}`,
        url.origin
      )
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
