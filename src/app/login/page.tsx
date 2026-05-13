"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
} from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-auth";
import { scorePassword } from "@/lib/password-strength";
import { PasswordStrength } from "@/components/password-strength";
import type { User } from "@supabase/supabase-js";

type Mode = "signin" | "signup";

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

export default function LoginPage() {
  // useSearchParams must be inside a Suspense boundary during static export.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  // If already signed in, bounce away immediately.
  useEffect(() => {
    const supa = getBrowserSupabase();
    supa.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        if (data.user) router.replace(next);
      });
  }, [router, next]);

  const signInWithGoogle = async () => {
    if (status.state === "submitting") return;
    setStatus({ state: "submitting" });
    const supa = getBrowserSupabase();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        : undefined;
    const { error } = await supa.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setStatus({ state: "error", message: error.message });
    }
    // No need to setStatus on success — the browser navigates to Google.
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status.state === "submitting") return;
    setStatus({ state: "submitting" });

    const supa = getBrowserSupabase();
    if (mode === "signin") {
      const { error } = await supa.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus({ state: "error", message: error.message });
        return;
      }
      // Success → router push back to wherever they came from.
      router.replace(next);
    } else {
      // Client-side compensation for HIBP-Pro: block weak passwords.
      const strength = scorePassword(password);
      if (strength.score < 2) {
        setStatus({
          state: "error",
          message: `Password is ${strength.label.toLowerCase()}. ${
            strength.tips[0] ?? "Try a stronger password."
          }`,
        });
        return;
      }

      // Sign up. Supabase will send a confirmation email by default.
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
          : undefined;
      const { data, error } = await supa.auth.signUp({
        email,
        password,
        options: { emailRedirectTo },
      });
      if (error) {
        setStatus({ state: "error", message: error.message });
        return;
      }
      // If email confirmation is OFF in Supabase, user is signed in right away.
      if (data.session) {
        router.replace(next);
        return;
      }
      // Otherwise show "check your email" message.
      setStatus({
        state: "success",
        message: `Confirmation email sent to ${email}. Click the link inside to activate your account.`,
      });
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setStatus({ state: "idle" });
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
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="text-sm text-muted text-center mb-8 leading-relaxed">
            {mode === "signin"
              ? "Welcome back. Sign in to manage your subscription and sync chats."
              : "Start using Scientific Quran AI — free, no card required."}
          </p>

          {/* Google button */}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={status.state === "submitting"}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-surface hover:bg-surface-muted active:bg-surface-muted text-foreground text-sm font-medium px-4 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <GoogleLogo />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="flex-1 h-px bg-border" />
            <span className="text-[11px] uppercase tracking-wider text-muted">
              or with email
            </span>
            <span className="flex-1 h-px bg-border" />
          </div>

          {/* Success state (mostly for signup confirmation) */}
          {status.state === "success" ? (
            <div className="rounded-xl border-2 border-accent/40 bg-accent-soft p-5 text-center">
              <CheckCircle2
                className="h-9 w-9 text-accent mx-auto mb-2"
                strokeWidth={1.5}
              />
              <p className="text-sm text-foreground/90 leading-relaxed">
                {status.message}
              </p>
              <p className="text-xs text-muted mt-3">
                Didn&apos;t get it? Check spam. Or{" "}
                <button
                  onClick={() => setStatus({ state: "idle" })}
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  try a different email
                </button>
                .
              </p>
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
                    className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted"
                  />
                </div>
              </label>

              <label className="block">
                <span className="flex items-center justify-between text-xs font-medium text-muted mb-1.5">
                  <span>Password</span>
                  {mode === "signin" && (
                    <span
                      className="text-muted/70 italic"
                      title="Forgot-password flow coming soon"
                    >
                      forgot?
                    </span>
                  )}
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
                    placeholder={
                      mode === "signin" ? "Your password" : "At least 8 characters"
                    }
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-muted hover:text-foreground transition-colors shrink-0"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
                {mode === "signup" && <PasswordStrength password={password} />}
              </label>

              {status.state === "error" && (
                <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {status.message}
                </div>
              )}

              <button
                type="submit"
                disabled={status.state === "submitting"}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-strong text-white text-sm font-medium px-4 py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status.state === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                ) : mode === "signin" ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </button>
            </form>
          )}

          <p className="text-sm text-muted text-center mt-6 leading-relaxed">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={switchMode}
                  className="text-accent font-medium underline underline-offset-4 hover:text-accent-strong"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={switchMode}
                  className="text-accent font-medium underline underline-offset-4 hover:text-accent-strong"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
            By continuing you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 11v3.2h4.5c-.2 1.1-1.6 3.2-4.5 3.2-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.5 0 2.6.6 3.2 1.2l2.2-2.1C16 5.2 14.2 4.4 12 4.4 7.8 4.4 4.4 7.8 4.4 12s3.4 7.6 7.6 7.6c4.4 0 7.3-3.1 7.3-7.4 0-.5-.1-.9-.1-1.2H12z"
      />
    </svg>
  );
}
