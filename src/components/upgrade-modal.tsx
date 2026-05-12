"use client";

import { useEffect, useState } from "react";
import { Sparkles, Clock, Mail, X } from "lucide-react";

type Props = {
  open: boolean;
  cooldownUntil: number | null;
  onClose: () => void;
};

export function UpgradeModal({ open, cooldownUntil, onClose }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const secondsLeft = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
    : 0;

  const mailto =
    "mailto:zasifbinislam@gmail.com?subject=" +
    encodeURIComponent("Scientific Quran AI — Subscription interest") +
    "&body=" +
    encodeURIComponent(
      "Hi, I'd like to subscribe to Scientific Quran AI (৳300 / 3 months).\n\nName:\nPhone / bKash number:\n"
    );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted hover:bg-surface-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="px-6 pt-7 pb-2 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Free limit reached
          </h2>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            ফ্রি লিমিট শেষ। কয়েক সেকেন্ড অপেক্ষা করুন, অথবা
            <br className="hidden sm:block" /> আনলিমিটেড অ্যাক্সেসের জন্য
            সাবস্ক্রাইব করুন।
          </p>
        </div>

        {secondsLeft > 0 && (
          <div className="mx-6 my-3 flex items-center justify-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm">
            <Clock className="h-4 w-4 text-accent" strokeWidth={1.75} />
            <span className="text-muted">Free access returns in</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              0:{secondsLeft.toString().padStart(2, "0")}
            </span>
          </div>
        )}

        <div className="mx-6 my-4 rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent-soft to-surface p-5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-accent font-medium">
                Subscription
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                ৳ 300
              </p>
              <p className="text-xs text-muted">/ 3 months · unlimited</p>
            </div>
            <div className="rounded-full bg-accent text-white text-[10px] font-medium uppercase tracking-wider px-2.5 py-1">
              Beta
            </div>
          </div>

          <ul className="mt-4 space-y-1.5 text-xs text-muted leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">✓</span>
              <span>Unlimited Quran &amp; tafsir queries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">✓</span>
              <span>Faster responses, no rate limits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">✓</span>
              <span>Web search grounding included</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">✓</span>
              <span>Direct support for the project ❤</span>
            </li>
          </ul>

          <a
            href={mailto}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-strong text-white text-sm font-medium px-4 py-2.5 transition-colors"
          >
            <Mail className="h-4 w-4" strokeWidth={2} />
            Subscribe — contact us
          </a>
        </div>

        <div className="px-6 pb-5 pt-1 text-center">
          <button
            onClick={onClose}
            className="text-xs text-muted hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {secondsLeft > 0
              ? `I'll wait the ${secondsLeft}s`
              : "Continue with free tier"}
          </button>
        </div>
      </div>
    </div>
  );
}
