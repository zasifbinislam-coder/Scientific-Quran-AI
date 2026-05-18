import { cookies } from "next/headers";
import { getSupabase, hasSupabase } from "@/lib/supabase";
import { getServerSupabase } from "@/lib/supabase-auth";

export const runtime = "nodejs";

type Payload = {
  name: string;
  email: string;
  bkashNumber: string;
  transactionId: string;
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidBkashNumber(s: string): boolean {
  // Bangladesh phone: optional +880 / 880 / 0, then 1[3-9]xxxxxxxx
  const cleaned = s.replace(/[\s-]/g, "");
  return /^(?:\+?880|0)?1[3-9]\d{8}$/.test(cleaned);
}

export async function POST(req: Request) {
  let body: Partial<Payload>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const bkashNumber = (body.bkashNumber ?? "").trim();
  const transactionId = (body.transactionId ?? "").trim();

  if (!name || name.length < 2) {
    return Response.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }
  if (!isValidBkashNumber(bkashNumber)) {
    return Response.json(
      { error: "Please enter a valid Bangladeshi mobile / bKash number." },
      { status: 400 }
    );
  }
  if (!transactionId || transactionId.length < 6) {
    return Response.json(
      { error: "Please enter your bKash transaction ID (TrxID)." },
      { status: 400 }
    );
  }

  if (!hasSupabase()) {
    // Soft fallback so the form still works even before the SQL is run.
    console.log("[/api/subscribe] (no Supabase) request:", {
      name,
      email,
      bkashNumber,
      transactionId,
    });
    return Response.json({
      ok: true,
      message:
        "Received — we'll email you within 24 hours. (Storage offline; logged for manual handling.)",
    });
  }

  // If the visitor is signed in, attach their auth user_id to the row.
  // Anonymous submissions still work (user_id stays null, /account falls
  // back to email matching when the user later signs up with that email).
  let userId: string | null = null;
  try {
    const cookieStore = await cookies();
    const userClient = getServerSupabase(cookieStore);
    const { data: userData } = await userClient.auth.getUser();
    userId = userData.user?.id ?? null;
  } catch {
    // Auth check is best-effort; never block a paying customer over it.
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("subscriptions").insert({
      name,
      email,
      bkash_number: bkashNumber,
      transaction_id: transactionId,
      plan: "3-months",
      amount_bdt: 300,
      status: "pending",
      user_id: userId,
    });
    if (error) {
      console.error("[/api/subscribe] supabase insert error:", error.message);
      return Response.json(
        {
          error:
            "Could not save right now. Please email zasifbinislam@gmail.com with your details.",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[/api/subscribe] unexpected:", err);
    return Response.json(
      { error: "Server error. Please try again or email us." },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    message:
      "Received. We'll verify the bKash transaction and activate your subscription within 24 hours.",
  });
}
