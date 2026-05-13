"use client";

import Link from "next/link";
import { MessageSquare, Plus, Trash2, BookOpen, X, Sparkles } from "lucide-react";
import { ChatSession } from "@/lib/chat-store";

type Props = {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  /** Mobile drawer state. Desktop ignores this (sidebar is always inline). */
  open: boolean;
  onClose: () => void;
};

export function Sidebar({
  sessions,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
}: Props) {
  return (
    <>
      {/* Mobile overlay — fades in when drawer is open */}
      <div
        data-no-print
        onClick={onClose}
        className={`md:hidden fixed inset-0 z-30 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
      />

      <aside
        data-no-print
        className={`
          fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw]
          transform transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:w-72 lg:w-80 md:max-w-none
          shrink-0 flex flex-col border-r border-border bg-surface
        `}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="px-5 py-5 border-b border-border flex items-start gap-2">
          <BookOpen
            className="h-5 w-5 text-accent mt-0.5 shrink-0"
            strokeWidth={1.75}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Scientific Quran AI
            </h1>
            <p className="text-xs text-muted leading-relaxed">
              Quran · Hadith · Scientific Tafsir
            </p>
          </div>
          {/* Mobile-only close button */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden -mr-1 rounded-full p-1.5 text-muted hover:bg-surface-muted active:bg-surface-muted transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <button
          onClick={onNew}
          className="mx-4 mt-4 mb-2 flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft text-accent-strong hover:bg-accent hover:text-white active:bg-accent active:text-white transition-colors px-3 py-2.5 text-sm font-medium"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          New conversation
        </button>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted text-center">
              No conversations yet.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {sessions.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <li key={s.id}>
                    <div
                      className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                        isActive
                          ? "bg-accent-soft text-accent-strong"
                          : "hover:bg-surface-muted active:bg-surface-muted text-foreground"
                      }`}
                      onClick={() => onSelect(s.id)}
                    >
                      <MessageSquare
                        className="h-4 w-4 shrink-0 opacity-70"
                        strokeWidth={1.75}
                      />
                      <span className="flex-1 truncate">
                        {s.title || "Untitled"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(s.id);
                        }}
                        // Always visible on touch (mobile); hover-only on desktop.
                        className="md:opacity-0 md:group-hover:opacity-100 p-1 -mr-1 text-muted hover:text-red-500 active:text-red-500 transition-opacity"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border">
          <Link
            href="/subscribe"
            onClick={onClose}
            className="flex items-center gap-2 mx-3 my-3 rounded-lg border border-accent/30 bg-accent-soft hover:bg-accent hover:text-white active:bg-accent active:text-white text-accent-strong px-3 py-2 text-xs font-medium transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span className="flex-1">Upgrade · ৳300 / 3 mo</span>
          </Link>

          <div
            className="px-5 py-3 border-t border-border text-[11px] text-muted leading-relaxed"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
          >
            <p>
              Primary: <span className="text-foreground">Holy Quran</span>
            </p>
            <p>
              Secondary:{" "}
              <span className="text-foreground">Zakaria Kamal — Tafsir</span>
            </p>
            <p className="mb-2">
              Contextual only:{" "}
              <span className="text-foreground">Hadith & Bible</span>
            </p>
            <p className="flex flex-wrap gap-x-2 gap-y-1">
              <Link
                href="/about"
                onClick={onClose}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                About
              </Link>
              <span>·</span>
              <Link
                href="/privacy"
                onClick={onClose}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                Privacy
              </Link>
              <span>·</span>
              <Link
                href="/terms"
                onClick={onClose}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                Terms
              </Link>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
