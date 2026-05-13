"use client";

import { useState } from "react";
import { Check, X, RotateCcw, Loader2, Mail, Phone, Hash } from "lucide-react";

export type Subscription = {
  id: number;
  name: string;
  email: string;
  bkash_number: string;
  transaction_id: string;
  plan: string;
  amount_bdt: number;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  created_at: string;
  verified_at: string | null;
  expires_at: string | null;
};

const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function AdminTable({ rows: initial }: { rows: Subscription[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "rejected">(
    "pending"
  );

  const filtered =
    filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const updateRow = async (
    id: number,
    action: "verify" | "reject" | "reset"
  ) => {
    setBusy(id);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "Failed.");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? (data.row as Subscription) : r))
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["pending", "verified", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
              filter === f
                ? "text-accent border-b-2 border-accent -mb-px"
                : "text-muted hover:text-foreground"
            }`}
          >
            {f} (
            {f === "all"
              ? rows.length
              : rows.filter((r) => r.status === f).length}
            )
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted text-center py-12">
          No {filter === "all" ? "" : filter + " "}subscriptions.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <StatusBadge status={r.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted">#{r.id}</p>
                  </div>
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="truncate text-foreground">{r.email}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="text-foreground">{r.bkash_number}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span className="font-mono text-foreground">
                        {r.transaction_id}
                      </span>
                    </span>
                    <span className="text-foreground">
                      ৳ {r.amount_bdt} · {r.plan}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted">
                    Submitted {dateFmt.format(new Date(r.created_at))}
                    {r.verified_at && (
                      <>
                        {" · "}Verified {dateFmt.format(new Date(r.verified_at))}
                      </>
                    )}
                    {r.expires_at && (
                      <>
                        {" · "}Expires {dateFmt.format(new Date(r.expires_at))}
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "verified" && (
                  <ActionButton
                    busy={busy === r.id}
                    onClick={() => updateRow(r.id, "verify")}
                    icon={<Check className="h-3.5 w-3.5" strokeWidth={2} />}
                    label="Verify (3 months)"
                    color="accent"
                  />
                )}
                {r.status !== "rejected" && (
                  <ActionButton
                    busy={busy === r.id}
                    onClick={() => updateRow(r.id, "reject")}
                    icon={<X className="h-3.5 w-3.5" strokeWidth={2} />}
                    label="Reject"
                    color="red"
                  />
                )}
                {r.status !== "pending" && (
                  <ActionButton
                    busy={busy === r.id}
                    onClick={() => updateRow(r.id, "reset")}
                    icon={<RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />}
                    label="Reset to pending"
                    color="muted"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Subscription["status"] }) {
  const map = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    verified: "bg-accent-soft text-accent-strong",
    rejected: "bg-surface-muted text-muted line-through",
  } as const;
  return (
    <span
      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${map[status]}`}
    >
      {status}
    </span>
  );
}

function ActionButton({
  busy,
  onClick,
  icon,
  label,
  color,
}: {
  busy: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: "accent" | "red" | "muted";
}) {
  const colors =
    color === "accent"
      ? "bg-accent hover:bg-accent-strong text-white"
      : color === "red"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-surface-muted hover:bg-surface text-muted border border-border";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${colors}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}
