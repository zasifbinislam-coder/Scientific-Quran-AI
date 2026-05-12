"use client";

import { MessageSquare, Plus, Trash2, BookOpen } from "lucide-react";
import { ChatSession } from "@/lib/chat-store";

type Props = {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
};

export function Sidebar({ sessions, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="hidden md:flex md:w-72 lg:w-80 shrink-0 flex-col border-r border-border bg-surface">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-5 w-5 text-accent" strokeWidth={1.75} />
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Scientific Quran AI
          </h1>
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Quran · Hadith · Scientific Tafsir
        </p>
      </div>

      <button
        onClick={onNew}
        className="mx-4 mt-4 mb-2 flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft text-accent-strong hover:bg-accent hover:text-white transition-colors px-3 py-2 text-sm font-medium"
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
                    className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isActive
                        ? "bg-accent-soft text-accent-strong"
                        : "hover:bg-surface-muted text-foreground"
                    }`}
                    onClick={() => onSelect(s.id)}
                  >
                    <MessageSquare
                      className="h-4 w-4 shrink-0 opacity-70"
                      strokeWidth={1.75}
                    />
                    <span className="flex-1 truncate">{s.title || "Untitled"}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-opacity"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-border px-5 py-3 text-[11px] text-muted leading-relaxed">
        <p>
          Primary: <span className="text-foreground">Holy Quran</span>
        </p>
        <p>
          Secondary: <span className="text-foreground">Zakaria Kamal — Tafsir</span>
        </p>
        <p>
          Contextual only: <span className="text-foreground">Hadith & Bible</span>
        </p>
      </div>
    </aside>
  );
}
