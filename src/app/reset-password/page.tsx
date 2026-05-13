"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-auth";
import { scorePassword } from "@/lib/password-strength";
import { PasswordStrength } from "@/components/password-strength";
import type { Session } from "@supabase/supabase-js";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success" }
  | { state: "error"; message: string };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [sessionReady, setSessionReady] = useState(false);

  // The Supabase email-link redirect drops the user here with a recovery
  // session active. Verify the session is alive before allowing submit;
  // if there's no recovery session, the link expired or was tampered with.
  useEffect(() => {
    const supa = getBrowserSupabase();
    supa.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        setSessionReady(Boolean(data.session));
      });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.state === "submitting") return;

    if (password !== confirm) {
      setStatus({ state: "error", message: "Passwords don't match." });
      return;
    }
    const strength = scorePassword(password);
    if (strength.score < 2) {
      setStatus({
        state: "error",
        message: `Password is ${strength.label.toLowerCase()}. ${
          strength.tips[0] ?? ""
        }`,
      });
      return;
    }

    setStatus({ state: "submitting" });
    const supa = getBrowserSupabase();
    const { error } = await supa.auth.updateUser({ password });
    if (error) {
      setStatus({ state: "error", message: error.message });
      return;
    }
    setStatus({ state: "success" });
    // After 2s, redirect to chat. They're already signed in via the
    // recovery session that updateUser just elevated.
    setTimeout(() => router.replace("/"), 2000);
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
          className="mx-auto max-w-md px-5 sm:px-6 py-8 sm:py-12"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
        >
          <h1 className="text-2xl font-semibold tracking-tight mb-1 text-center">
            Choose a new password
          </h1>
          <p className="text-sm text-muted text-center mb-8 leading-relaxed">
            {sessionReady
              ? "Pick something strong. You'll be signed in right after."
              : "Verifying your reset link…"}
          </p>

          {status.state === "success" ? (
            <div className="rounded-2xl border-2 border-accent/40 bg-accent-soft p-6 text-center">
              <CheckCircle2
                className="h-10 w-10 text-accent mx-auto mb-3"
                strokeWidth={1.5}
              />
              <h3 className="text-lg font-semibold tracking-tight text-accent-strong mb-2">
                Password updated
              </h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                You&apos;re signed in. Redirecting to the chat…
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center text-sm text-muted py-12">
              <Loader2
                className="h-6 w-6 mx-auto mb-3 animate-spin text-accent"
                strokeWidth={1.75}
              />
              <p>
                If the reset link is invalid or expired, you&apos;ll be sent
                back to{" "}
                <Link
                  href="/forgot-password"
                  className="text-accent underline underline-offset-2"
                >
                  request a new one
                </Link>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-muted mb-1.5">
                  New password
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-accent transition-colors">
                  <Lock
                    className="h-4 w-4 text-muted shrink-0"
                    strokeWidth={1.75}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
                    className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-muted hover:text-foreground transition-colors shrink-0"
                    aria-label={showPassword ? "Hide" : "Show"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-muted mb-1.5">
                  Confirm new password
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-accent transition-colors">
                  <Lock
                    className="h-4 w-4 text-muted shrink-0"
                    strokeWidth={1.75}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type it again"
                    required
                    minLength={8}
                    autoComplete="new-password"
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
                disabled={status.state === "submitting" || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-strong text-white text-sm font-medium px-4 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status.state === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : (
                  "Update password"
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
