/**
 * Admin endpoint to flip a subscription row's status.
 * Auth: must be logged in with an email in ADMIN_EMAILS.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase, isAdminEmail } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  id: number;
  action: "verify" | "reject" | "reset";
  notes?: string;
};

export async function POST(req: Request) {
  // 1. Verify the caller is logged-in admin (via Supabase Auth session).
  const cookieStore = await cookies();
  const userClient = getServerSupabase(cookieStore);
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json(
      { error: "Not signed in." },
      { status: 401 }
    );
  }
  if (!isAdminEmail(userData.user.email)) {
    return NextResponse.json(
      { error: "Not an admin." },
      { status: 403 }
    );
  }

  // 2. Parse payload.
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.id || !body?.action) {
    return NextResponse.json(
      { error: "id and action are required." },
      { status: 400 }
    );
  }

  // 3. Update the row using the service-role client (RLS bypass).
  const admin = getSupabase();
  const now = new Date();
  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const patch =
    body.action === "verify"
      ? {
          status: "verified" as const,
          verified_at: now.toISOString(),
          expires_at: threeMonthsLater.toISOString(),
          notes: body.notes ?? null,
        }
      : body.action === "reject"
      ? {
          status: "rejected" as const,
          verified_at: null,
          expires_at: null,
          notes: body.notes ?? null,
        }
      : {
          status: "pending" as const,
          verified_at: null,
          expires_at: null,
          notes: body.notes ?? null,
        };

  const { data, error } = await admin
    .from("subscriptions")
    .update(patch)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: data });
}
