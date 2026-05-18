"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";

export type RetrievedSource = {
  source: string | null;
  similarity?: number;
  kind?: string | null;
  content?: string;
};

const KIND_LABEL: Record<string, string> = {
  quran: "Quran",
  hadith: "Hadith",
  tafsir: "Tafsir",
  bible: "Bible",
};

const KIND_TONE: Record<string, string> = {
  quran:
    "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100",
  hadith:
    "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
  tafsir:
    "border-sky-200 bg-sky-50/70 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100",
  bible:
    "border-violet-200 bg-violet-50/70 text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-100",
};

function isArabicHeavy(text: string): boolean {
  if (!text) return false;
  const arabicChars = (text.match(/[؀-ۿ]/g) ?? []).length;
  return arabicChars > text.length * 0.3;
}

export function SourcesPanel({ sources }: { sources: RetrievedSource[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  if (!sources || sources.length === 0) return null;

  return (
    <details
      data-no-print
      className="mt-2 group rounded-xl border border-border/60 bg-surface/40 open:bg-surface"
    >
      <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2 text-[12px] text-muted hover:text-foreground transition-colors">
        <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span>
          {sources.length} source{sources.length === 1 ? "" : "s"} consulted
        </span>
        <ChevronDown
          className="h-3.5 w-3.5 ml-auto transition-transform group-open:rotate-180"
          strokeWidth={1.75}
        />
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-2">
        {sources.map((s, i) => {
          const kind = (s.kind ?? "").toLowerCase();
          const tone = KIND_TONE[kind] ?? "border-border bg-surface text-foreground";
          const label = KIND_LABEL[kind] ?? "Source";
          const open = openIdx === i;
          const content = s.content?.trim() ?? "";
          const arabicHeavy = isArabicHeavy(content);
          return (
            <div
              key={i}
              className={`rounded-lg border ${tone} text-[12px] overflow-hidden`}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
                aria-expanded={open}
              >
                <span className="font-semibold tracking-wide uppercase text-[10px] opacity-80">
                  {label}
                </span>
                <span className="font-medium truncate flex-1 min-w-0">
                  {s.source ?? "unknown"}
                </span>
                {typeof s.similarity === "number" && (
                  <span className="font-mono opacity-70 shrink-0">
                    {Math.round(s.similarity * 100)}%
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform shrink-0 ${
                    open ? "rotate-180" : ""
                  }`}
                  strokeWidth={1.75}
                />
              </button>
              {open && content && (
                <div
                  className={`px-2.5 pb-2.5 pt-1 text-[12.5px] leading-relaxed border-t border-current/10 whitespace-pre-wrap ${
                    arabicHeavy ? "arabic" : ""
                  }`}
                  dir={arabicHeavy ? "rtl" : "ltr"}
                  lang={arabicHeavy ? "ar" : undefined}
                >
                  {content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
