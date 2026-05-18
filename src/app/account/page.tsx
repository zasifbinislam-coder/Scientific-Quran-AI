import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Mail,
  Sparkles,
  XCircle,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";
import { CancelButton } from "@/components/cancel-button";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "long",
  day: "2-digit",
});

export default async function AccountPage() {
  const cookieStore = await cookies();
  const userClient = getServerSupabase(cookieStore);
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    redirect("/login?next=/account");
  }
  const email = userData.user.email!;
  const userId = userData.user.id;

  // Fetch all of this user's subscription rows via service role (RLS bypass).
  // Match on user_id (rows submitted while signed in) OR email (older rows
  // and anonymous submissions made with the same address). Either path
  // belongs to this account.
  const admin = getSupabase();
  const { data: rows } = await admin
    .from("subscriptions")
    .select("*")
    .or(`user_id.eq.${userId},email.eq.${email.toLowerCase()}`)
    .order("created_at", { ascending: false });

  const subs = rows ?? [];
  const now = new Date();
  const active = subs.find(
    (s: { status: string; expires_at: string | null }) =>
      s.status === "verified" && s.expires_at && new Date(s.expires_at) > now
  );
  const pending = subs.find(
    (s: { status: string }) => s.status === "pending"
  );

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header
        className="border-b border-border bg-surface px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Back to chat</span>
        </Link>
        <div className="flex-1 flex items-center justify-center gap-2 -ml-12 sm:-ml-32">
          <BookOpen className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm font-semibold tracking-tight">My account</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div
          className="mx-auto max-w-2xl px-5 sm:px-6 py-8 sm:py-10"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
        >
          {/* Identity card */}
          <div className="rounded-2xl border border-border bg-surface p-5 mb-5">
            <p className="text-xs uppercase tracking-wider text-muted mb-1.5">
              Signed in as
            </p>
            <p className="flex items-center gap-2 text-base font-medium text-foreground">
              <Mail className="h-4 w-4 text-muted" strokeWidth={1.75} />
              {email}
            </p>
          </div>

          {/* Subscription state */}
          {active ? (
            <ActiveCard
              id={active.id}
              expiresAt={new Date(active.expires_at!)}
              plan={active.plan}
              cancelRequested={(active.notes ?? "").includes("[CANCEL REQUESTED")}
            />
          ) : pending ? (
            <PendingCard transactionId={pending.transaction_id} />
          ) : (
            <NoSubCard />
          )}

          {/* History */}
          {subs.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface mt-6 overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Subscription history
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {subs.map(
                  (s: {
                    id: number;
                    status: string;
                    transaction_id: string;
                    amount_bdt: number;
                    created_at: string;
                    verified_at: string | null;
                    expires_at: string | null;
                  }) => (
                    <li
                      key={s.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          ৳ {s.amount_bdt} ·{" "}
                          <span className="font-normal text-muted">
                            TrxID {s.transaction_id}
                          </span>
                        </p>
                        <p className="text-xs text-muted">
                          Submitted {dateFmt.format(new Date(s.created_at))}
                          {s.expires_at && (
                            <>
                              {" · "}Expires{" "}
                              {dateFmt.format(new Date(s.expires_at))}
                            </>
                          )}
                        </p>
                      </div>
                      <StatusPill status={s.status} />
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    verified: "bg-accent-soft text-accent-strong",
    rejected: "bg-surface-muted text-muted line-through",
  };
  return (
    <span
      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
        map[status] ?? "bg-surface-muted text-muted"
      }`}
    >
      {status}
    </span>
  );
}

function ActiveCard({
  id,
  expiresAt,
  plan,
  cancelRequested,
}: {
  id: number;
  expiresAt: Date;
  plan: string;
  cancelRequested: boolean;
}) {
  const daysLeft = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (24 * 3600 * 1000)
  );
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent-soft to-surface p-5">
      <div className="flex items-start gap-3 mb-3">
        <CheckCircle2 className="h-6 w-6 text-accent shrink-0" strokeWidth={1.75} />
        <div>
          <p className="text-base font-semibold text-foreground">
            Active subscription
          </p>
          <p className="text-xs text-muted">{plan}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed">
        Expires{" "}
        <span className="font-medium text-foreground">
          {dateFmt.format(expiresAt)}
        </span>{" "}
        ({daysLeft} {daysLeft === 1 ? "day" : "days"} from now)
      </p>
      <p className="text-xs text-muted mt-2">
        You bypass per-IP rate limits while your subscription is active. Web
        search grounding included.
      </p>
      {cancelRequested ? (
        <p className="text-xs text-muted mt-3 italic">
          ✓ Cancellation requested — admin will process the refund manually.
        </p>
      ) : (
        <CancelButton subscriptionId={id} />
      )}
    </div>
  );
}

function PendingCard({ transactionId }: { transactionId: string }) {
  return (
    <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-5">
      <div className="flex items-start gap-3 mb-2">
        <Clock
          className="h-6 w-6 text-amber-700 dark:text-amber-300 shrink-0"
          strokeWidth={1.75}
        />
        <div>
          <p className="text-base font-semibold text-foreground">
            Pending verification
          </p>
          <p className="text-xs text-muted">
            TrxID{" "}
            <span className="font-mono text-foreground">{transactionId}</span>
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed">
        We received your bKash payment request. Verification usually completes
        within 24 hours.
      </p>
    </div>
  );
}

function NoSubCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3 mb-3">
        <Sparkles className="h-6 w-6 text-accent shrink-0" strokeWidth={1.75} />
        <div>
          <p className="text-base font-semibold text-foreground">Free tier</p>
          <p className="text-xs text-muted">
            Subject to per-IP rate limits (30 messages / minute)
          </p>
        </div>
      </div>
      <Link
        href="/subscribe"
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-strong text-white text-sm font-medium px-4 py-2.5 transition-colors"
      >
        Upgrade · ৳300 / 3 months
      </Link>
    </div>
  );
}
