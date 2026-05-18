/**
 * Lets a signed-in subscriber flag their active or pending subscription
 * for cancellation. We don't auto-refund — admin gets the request via the
 * notes column on the row and acts manually (bKash refunds happen
 * off-platform anyway). Status is left as-is so the user retains access
 * until admin processes the refund.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = { id: number; reason?: string };

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userClient = getServerSupabase(cookieStore);
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.id || typeof body.id !== "number") {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  const reason = (body.reason ?? "").toString().trim().slice(0, 500);

  const admin = getSupabase();

  // Confirm the row belongs to this user — by user_id OR email so legacy
  // rows still resolve.
  const email = userData.user.email?.toLowerCase() ?? "";
  const { data: row, error: fetchErr } = await admin
    .from("subscriptions")
    .select("id, name, email, status, notes, user_id")
    .eq("id", body.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
  }
  const ownedByUserId = row.user_id && row.user_id === userData.user.id;
  const ownedByEmail = row.email && row.email.toLowerCase() === email;
  if (!ownedByUserId && !ownedByEmail) {
    return NextResponse.json({ error: "Not your subscription." }, { status: 403 });
  }

  const stamp = new Date().toISOString();
  const tag = `[CANCEL REQUESTED ${stamp}]`;
  if ((row.notes ?? "").includes("[CANCEL REQUESTED")) {
    return NextResponse.json({
      ok: true,
      message: "Cancellation already requested — admin will follow up.",
    });
  }
  const nextNotes = [row.notes?.trim(), `${tag}${reason ? ` ${reason}` : ""}`]
    .filter(Boolean)
    .join("\n");

  const { error: updateErr } = await admin
    .from("subscriptions")
    .update({ notes: nextNotes })
    .eq("id", row.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Cancellation requested. Admin will process the refund manually.",
  });
}
