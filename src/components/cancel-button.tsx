"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";

export function CancelButton({ subscriptionId }: { subscriptionId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ok: boolean; message: string } | null>(null);

  if (done?.ok) {
    return (
      <p className="text-xs text-muted mt-3 italic">
        ✓ {done.message}
      </p>
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/cancel-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subscriptionId, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDone({ ok: false, message: data?.error ?? "Could not submit. Try again." });
      } else {
        setDone({ ok: true, message: data?.message ?? "Cancellation requested." });
        setOpen(false);
      }
    } catch {
      setDone({ ok: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted hover:text-foreground underline underline-offset-2 mt-3"
      >
        Request cancellation
      </button>

      {done && !done.ok && (
        <p className="text-xs text-red-600 mt-2">{done.message}</p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-surface border border-border p-5 sm:p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Request cancellation
                </h3>
                <p className="text-xs text-muted mt-1">
                  Tell us briefly why — optional. Our team will reach out to
                  process the refund manually within 2 business days.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="text-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Reason (optional)"
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <p className="text-[10px] text-muted mt-1 text-right">
              {reason.length}/500
            </p>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="px-3 py-2 text-sm text-muted hover:text-foreground"
              >
                Never mind
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Submit request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
