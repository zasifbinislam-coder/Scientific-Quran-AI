/**
 * Daily cron — sends 'expiring in 7 days' reminders and 'expired' renewal
 * nudges. Vercel triggers this from the schedule in vercel.json.
 *
 * Each row carries reminder_sent_at and expired_notified_at guard columns
 * so we never re-send the same lifecycle email.
 *
 * Auth: Vercel cron requests carry an `Authorization: Bearer <CRON_SECRET>`
 * header when CRON_SECRET is set as a project env var. If unset, we still
 * accept the request (so the endpoint stays callable from the dashboard
 * during initial setup) but log a warning.
 */

import { NextResponse } from "next/server";
import { getSupabase, hasSupabase } from "@/lib/supabase";
import {
  sendEmail,
  subscriptionExpiringEmail,
  subscriptionExpiredEmail,
} from "@/lib/email";

export const runtime = "nodejs";

const REMINDER_WINDOW_DAYS = 7;

type SubRow = {
  id: number;
  name: string;
  email: string;
  expires_at: string | null;
  reminder_sent_at: string | null;
  expired_notified_at: string | null;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("[cron] CRON_SECRET not set — endpoint is unauthenticated");
  }

  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const admin = getSupabase();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 3600 * 1000);

  let remindersSent = 0;
  let expiredSent = 0;

  // ── 1. Expiring in next N days, no reminder yet ──────────────────────────
  {
    const { data: rows, error } = await admin
      .from("subscriptions")
      .select(
        "id, name, email, expires_at, reminder_sent_at, expired_notified_at"
      )
      .eq("status", "verified")
      .is("reminder_sent_at", null)
      .gt("expires_at", now.toISOString())
      .lt("expires_at", windowEnd.toISOString());

    if (error) {
      console.error("[cron] expiring query error:", error.message);
    } else {
      for (const row of (rows ?? []) as SubRow[]) {
        if (!row.email || !row.expires_at) continue;
        const ok = await sendEmail({
          to: row.email,
          subject: "Your subscription is ending soon",
          html: subscriptionExpiringEmail(row.name, new Date(row.expires_at)),
        });
        if (ok) {
          await admin
            .from("subscriptions")
            .update({ reminder_sent_at: now.toISOString() })
            .eq("id", row.id);
          remindersSent++;
        }
      }
    }
  }

  // ── 2. Already expired, no expired-notice yet ────────────────────────────
  {
    const { data: rows, error } = await admin
      .from("subscriptions")
      .select(
        "id, name, email, expires_at, reminder_sent_at, expired_notified_at"
      )
      .eq("status", "verified")
      .is("expired_notified_at", null)
      .lt("expires_at", now.toISOString());

    if (error) {
      console.error("[cron] expired query error:", error.message);
    } else {
      for (const row of (rows ?? []) as SubRow[]) {
        if (!row.email) continue;
        const ok = await sendEmail({
          to: row.email,
          subject: "Your subscription has ended — renew for ৳300",
          html: subscriptionExpiredEmail(row.name),
        });
        if (ok) {
          await admin
            .from("subscriptions")
            .update({ expired_notified_at: now.toISOString() })
            .eq("id", row.id);
          expiredSent++;
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    remindersSent,
    expiredSent,
  });
}
