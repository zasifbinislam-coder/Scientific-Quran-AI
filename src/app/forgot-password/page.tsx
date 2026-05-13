"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Mail } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-auth";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.state === "submitting") return;
    setStatus({ state: "submitting" });

    const supa = getBrowserSupabase();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;
    const { error } = await supa.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      setStatus({ state: "error", message: error.message });
      return;
    }
    // Always show success — don't leak whether the email exists in our system.
    setStatus({ state: "success" });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header
        className="border-b border-border bg-surface px-4 sm:px-6 py-3 flex items-center gap-3 shrink-0"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}
      >
        <Link
          href="/login"
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Back to sign in</span>
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
          className="mx-auto max-w-md px-5 sm:px-6 py-8 sm:py-12"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
        >
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-center">
            Reset your password
          </h1>
          <p className="text-sm text-muted text-center mb-8 leading-relaxed">
            Enter your email — we&apos;ll send you a link to choose a new
            password.
          </p>

          {status.state === "success" ? (
            <div className="rounded-2xl border-2 border-accent/40 bg-accent-soft p-6 text-center">
              <CheckCircle2
                className="h-10 w-10 text-accent mx-auto mb-3"
                strokeWidth={1.5}
              />
              <h3 className="text-lg font-semibold tracking-tight text-accent-strong mb-2">
                Check your email
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                If an account exists for{" "}
                <span className="text-foreground font-medium">{email}</span>,
                you&apos;ll get a reset link in the next minute or two.
              </p>
              <p className="text-xs text-muted mt-3">
                Didn&apos;t get it? Check spam, then{" "}
                <button
                  onClick={() => setStatus({ state: "idle" })}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  try a different email
                </button>
                .
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex items-center gap-2 text-sm text-accent-strong underline underline-offset-4 hover:text-accent transition-colors"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-muted mb-1.5">
                  Email
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-accent transition-colors">
                  <Mail
                    className="h-4 w-4 text-muted shrink-0"
                    strokeWidth={1.75}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    required
                    autoComplete="email"
                    autoFocus
                    className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted"
                  />
                </div>
              </label>

              {status.state === "error" && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={status.state === "submitting" || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-strong text-white text-sm font-medium px-4 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status.state === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          )}

          <p className="text-xs text-muted text-center mt-6 leading-relaxed">
            Remembered it?{" "}
            <Link
              href="/login"
              className="text-accent font-medium underline underline-offset-4 hover:text-accent-strong"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
