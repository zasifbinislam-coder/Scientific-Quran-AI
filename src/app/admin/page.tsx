import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase, isAdminEmail } from "@/lib/supabase-auth";
import { getSupabase } from "@/lib/supabase";
import { AdminTable, type Subscription } from "@/components/admin-table";
import { AuthButton } from "@/components/auth-button";
import { ArrowLeft, ShieldCheck, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const userClient = getServerSupabase(cookieStore);
  const { data, error } = await userClient.auth.getUser();

  if (error || !data.user) {
    // Not signed in — bounce to home with a hint.
    redirect("/?auth_required=admin");
  }
  if (!isAdminEmail(data.user.email)) {
    return (
      <Forbidden email={data.user.email ?? "(unknown)"} />
    );
  }

  // Load subscriptions via the service-role client (RLS bypass).
  const admin = getSupabase();
  const { data: rows, error: rowsErr } = await admin
    .from("subscriptions")
    .select(
      "id, name, email, bkash_number, transaction_id, plan, amount_bdt, status, notes, created_at, verified_at, expires_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (rowsErr) {
    return (
      <ErrorShell message={rowsErr.message} />
    );
  }

  const subs = (rows ?? []) as Subscription[];
  const pending = subs.filter((s) => s.status === "pending");
  const verified = subs.filter((s) => s.status === "verified");
  const rejected = subs.filter((s) => s.status === "rejected");

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
        <div className="flex-1 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="text-sm font-semibold tracking-tight">Admin</span>
        </div>
        <AuthButton />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div
          className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
        >
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Stat label="Pending" value={pending.length} accent="amber" />
            <Stat label="Verified" value={verified.length} accent="accent" />
            <Stat label="Rejected" value={rejected.length} accent="muted" />
          </div>

          <AdminTable rows={subs} />
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "accent" | "muted";
}) {
  const colors =
    accent === "amber"
      ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-amber-800 dark:text-amber-200"
      : accent === "accent"
      ? "border-accent/30 bg-accent-soft text-accent-strong"
      : "border-border bg-surface-muted text-muted";
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors}`}>
      <p className="text-[11px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Forbidden({ email }: { email: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <BookOpen className="h-8 w-8 text-accent mb-3" strokeWidth={1.5} />
      <h1 className="text-xl font-semibold mb-2">Admin access only</h1>
      <p className="text-sm text-muted max-w-md leading-relaxed mb-6">
        You&apos;re signed in as <span className="text-foreground">{email}</span>{" "}
        — this email is not on the admin list.
      </p>
      <Link
        href="/"
        className="text-sm text-accent underline underline-offset-4"
      >
        Back to chat
      </Link>
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold mb-2 text-red-600">
        Couldn&apos;t load subscriptions
      </h1>
      <p className="text-sm text-muted max-w-md mb-6">{message}</p>
      <Link href="/" className="text-sm text-accent underline underline-offset-4">
        Back to chat
      </Link>
    </div>
  );
}
