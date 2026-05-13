import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function PageShell({ title, subtitle, children }: Props) {
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
        <article
          className="mx-auto max-w-2xl px-5 sm:px-6 py-8 sm:py-12 leading-relaxed"
          style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
        >
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted text-sm mb-8 leading-relaxed">{subtitle}</p>
          )}
          <div className="space-y-5 text-[15px] text-foreground/90">
            {children}
          </div>
        </article>
      </main>
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg sm:text-xl font-semibold tracking-tight mt-8 mb-2 text-foreground">
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-1.5 marker:text-accent">
      {children}
    </ul>
  );
}
