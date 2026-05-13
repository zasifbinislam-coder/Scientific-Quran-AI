"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, ShieldCheck, User as UserIcon, Sparkles } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-auth";
import type { Session, User } from "@supabase/supabase-js";

const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "zasifbinislam@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase());

type Profile = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export function AuthButton() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hydrate session on mount + subscribe to auth changes.
  useEffect(() => {
    const supa = getBrowserSupabase();
    let mounted = true;

    const toProfile = (u: User | null | undefined): Profile | null =>
      u
        ? {
            email: u.email ?? "",
            name:
              (u.user_metadata?.full_name as string | undefined) ??
              (u.user_metadata?.name as string | undefined) ??
              null,
            avatarUrl:
              (u.user_metadata?.avatar_url as string | undefined) ?? null,
          }
        : null;

    supa.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      if (!mounted) return;
      setProfile(toProfile(data.user));
      setLoading(false);
    });

    const { data: subscription } = supa.auth.onAuthStateChange(
      (_e: string, session: Session | null) => {
        setProfile(toProfile(session?.user));
      }
    );

    return () => {
      mounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  // Close menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const signInWithGoogle = async () => {
    const supa = getBrowserSupabase();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            window.location.pathname + window.location.search
          )}`
        : undefined;
    await supa.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  };

  const signOut = async () => {
    const supa = getBrowserSupabase();
    await supa.auth.signOut();
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="h-9 w-9 rounded-full bg-surface-muted animate-pulse" />
    );
  }

  if (!profile) {
    return (
      <button
        type="button"
        onClick={signInWithGoogle}
        className="shrink-0 flex items-center gap-1.5 rounded-full bg-surface-muted hover:bg-accent-soft hover:text-accent-strong active:bg-accent-soft active:text-accent-strong px-3 py-2 sm:py-1.5 text-xs font-medium text-muted transition-colors"
        title="Sign in with Google to manage your subscription"
      >
        <LogIn className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
        <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  const isAdmin = ADMIN_EMAILS.includes(profile.email.toLowerCase());
  const initial = (profile.name?.[0] ?? profile.email[0] ?? "?").toUpperCase();

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="h-8 w-8 rounded-full bg-accent text-white flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-accent/30 transition-shadow"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={profile.email}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold">{initial}</span>
        )}
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-surface shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">
              {profile.name || profile.email.split("@")[0]}
            </p>
            <p className="text-xs text-muted truncate">{profile.email}</p>
          </div>
          <Link
            href="/subscribe"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-surface-muted transition-colors"
          >
            <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
            Subscribe / status
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-surface-muted transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-foreground hover:bg-surface-muted transition-colors border-t border-border"
          >
            <LogOut className="h-4 w-4 text-muted" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function UserBadgeFallback() {
  return (
    <div className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-surface-muted text-muted">
      <UserIcon className="h-4 w-4" strokeWidth={1.75} />
    </div>
  );
}
