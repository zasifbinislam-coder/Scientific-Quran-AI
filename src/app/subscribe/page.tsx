"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Loader2,
  Sparkles,
  Smartphone,
  Hash,
  Mail,
  User as UserIcon,
} from "lucide-react";

const BKASH_NUMBER = "01920262202"; // ← Sir's bKash personal/merchant number (update before launch)

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export default function SubscribePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bkashNumber, setBkashNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.state === "submitting") return;
    setStatus({ state: "submitting" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, bkashNumber, transactionId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({
          state: "error",
          message: data?.error ?? "Something went wrong. Try again.",
        });
        return;
      }
      setStatus({
        state: "success",
        message: data?.message ?? "Received. We'll be in touch within 24 hours.",
      });
    } catch {
      setStatus({
        state: "error",
        message: "Network error — please check connection and try again.",
      });
    }
  };

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
          <span className="text-sm font-semibold tracking-tight">
            Scientific Quran AI
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div
          className="mx-auto max-w-xl px-5 sm:px-6 py-8 sm:py-12"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
        >
          {/* Plan card */}
          <div className="rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-6 mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-accent font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Subscription
                </p>
                <p className="mt-1.5 text-3xl font-bold text-foreground">
                  ৳ 300
                </p>
                <p className="text-xs text-muted">
                  for 3 months · unlimited messages
                </p>
              </div>
              <span className="rounded-full bg-accent text-white text-[10px] font-medium uppercase tracking-wider px-2.5 py-1">
                Beta
              </span>
            </div>
            <ul className="space-y-1.5 text-sm text-foreground/90 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-accent mt-0.5 shrink-0"
                  strokeWidth={1.75}
                />
                <span>Unlimited Quran &amp; tafsir queries</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-accent mt-0.5 shrink-0"
                  strokeWidth={1.75}
                />
                <span>No rate limits, faster responses</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-accent mt-0.5 shrink-0"
                  strokeWidth={1.75}
                />
                <span>Web search grounding included</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2
                  className="h-4 w-4 text-accent mt-0.5 shrink-0"
                  strokeWidth={1.75}
                />
                <span>You directly support the project ❤</span>
              </li>
            </ul>
          </div>

          {/* Payment steps */}
          <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
            <h2 className="text-base font-semibold tracking-tight mb-3">
              How to subscribe
            </h2>
            <ol className="text-sm space-y-2.5 leading-relaxed">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent-strong text-xs flex items-center justify-center font-semibold">
                  1
                </span>
                <span>
                  Send <strong>৳ 300</strong> to our bKash number:{" "}
                  <code className="bg-surface-muted px-1.5 py-0.5 rounded text-[13px]">
                    {BKASH_NUMBER}
                  </code>{" "}
                  (Send Money / Payment).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent-strong text-xs flex items-center justify-center font-semibold">
                  2
                </span>
                <span>
                  Note the <strong>Transaction ID (TrxID)</strong> from the
                  confirmation SMS.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft text-accent-strong text-xs flex items-center justify-center font-semibold">
                  3
                </span>
                <span>
                  Fill in the form below — we verify the transaction and
                  activate your subscription within 24 hours.
                </span>
              </li>
            </ol>
          </div>

          {/* Form or success */}
          {status.state === "success" ? (
            <div className="rounded-2xl border-2 border-accent/50 bg-accent-soft p-6 text-center">
              <CheckCircle2
                className="h-10 w-10 text-accent mx-auto mb-3"
                strokeWidth={1.5}
              />
              <h3 className="text-lg font-semibold tracking-tight text-accent-strong mb-2">
                Submission received
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {status.message}
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex items-center gap-2 text-sm text-accent-strong underline underline-offset-4 hover:text-accent transition-colors"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back to chat
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field
                icon={<UserIcon className="h-4 w-4" strokeWidth={1.75} />}
                label="Your name"
                value={name}
                onChange={setName}
                placeholder="Md. Zasif Bin Islam"
                required
                autoComplete="name"
              />
              <Field
                icon={<Mail className="h-4 w-4" strokeWidth={1.75} />}
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                type="email"
                required
                autoComplete="email"
              />
              <Field
                icon={<Smartphone className="h-4 w-4" strokeWidth={1.75} />}
                label="Your bKash number (the one you sent from)"
                value={bkashNumber}
                onChange={setBkashNumber}
                placeholder="01XXXXXXXXX"
                type="tel"
                required
                autoComplete="tel"
                inputMode="tel"
              />
              <Field
                icon={<Hash className="h-4 w-4" strokeWidth={1.75} />}
                label="bKash Transaction ID (TrxID)"
                value={transactionId}
                onChange={setTransactionId}
                placeholder="e.g. 7C8K2P9M3X"
                required
                autoComplete="off"
              />

              {status.state === "error" && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={status.state === "submitting"}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-strong text-white text-sm font-medium px-4 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status.state === "submitting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Submitting…
                  </>
                ) : (
                  "Submit subscription request"
                )}
              </button>

              <p className="text-xs text-muted text-center leading-relaxed">
                Your details are stored only to verify the bKash transaction
                and activate your subscription. See{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Privacy
                </Link>{" "}
                ·{" "}
                <Link
                  href="/terms"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Terms
                </Link>
                .
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoComplete,
  inputMode,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "tel" | "email" | "text" | "numeric";
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-accent ml-0.5">*</span>}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-accent transition-colors">
        <span className="text-muted shrink-0">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted"
        />
      </div>
    </label>
  );
}
