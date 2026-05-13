"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowUp,
  Loader2,
  BookOpen,
  Square,
  Globe,
  Clock,
  Download,
  Menu,
} from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { Sidebar } from "./sidebar";
import { UpgradeModal } from "./upgrade-modal";
import { ThemeToggle } from "./theme-toggle";
import { AuthButton } from "./auth-button";
import {
  ChatSession,
  deriveTitle,
  loadSessions,
  newSession,
  saveSessions,
} from "@/lib/chat-store";
import type { UIMessage } from "ai";

const SUGGESTED_PROMPTS = [
  "মহাবিশ্বের সৃষ্টি সম্পর্কে কুরআন কী বলে?",
  "ভবিষ্যৎ নিয়ে চিন্তিত — কুরআন কী পরামর্শ দেয়?",
  "How does the Quran describe the development of the embryo?",
  "What does Islam say about the expansion of the universe?",
];

export function Chat() {
  const [hydrated, setHydrated] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const useWebSearchRef = useRef(false);
  useEffect(() => {
    useWebSearchRef.current = useWebSearch;
  }, [useWebSearch]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sidebarOpen]);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId]
  );

  // Transport: inject the live useWebSearch flag into every request body.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { messages, ...body, useWebSearch: useWebSearchRef.current },
        }),
      }),
    []
  );

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    transport,
    id: activeId ?? "new",
  });

  // Rate-limit cooldown: lock input for 60s when Gemini's free-tier quota hits.
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Synchronous detection (computed during render) — so the raw red error
  // box NEVER flashes between when error appears and useEffect sets cooldown.
  const isRateLimitError = useMemo(() => {
    if (!error) return false;
    const msg = (error.message ?? "").toLowerCase();
    return (
      msg.includes("quota") ||
      msg.includes("rate-limit") ||
      msg.includes("rate limit") ||
      msg.includes("resource_exhausted") ||
      msg.includes("429")
    );
  }, [error]);

  useEffect(() => {
    if (!isRateLimitError) return;
    // Parse "retry in X.XXXs" from Gemini's error to set an accurate countdown.
    const m = /retry in ([\d.]+)s/i.exec(error?.message ?? "");
    const retrySec = m ? Math.ceil(parseFloat(m[1])) : 60;
    const until = Date.now() + Math.min(Math.max(retrySec, 30), 90) * 1000;
    setCooldownUntil(until);
    setShowUpgrade(true);
  }, [isRateLimitError, error]);

  // Tick every second while cooling down (drives the disabled state + label).
  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) {
        setCooldownUntil(null);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownSeconds = cooldownUntil
    ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
    : 0;
  const onCooldown = cooldownSeconds > 0;

  // Hydrate sessions from localStorage on mount.
  // Always open a fresh "New conversation" on page load — existing chats
  // remain accessible from the sidebar. The fresh session is NOT added to
  // the sidebar until the user actually sends a message in it (handled by
  // the persistence effect below), so empty page-loads don't pollute history.
  useEffect(() => {
    const loaded = loadSessions();
    setSessions(loaded);
    const fresh = newSession();
    setActiveId(fresh.id);
    setMessages([]);
    setHydrated(true);
  }, [setMessages]);

  // Whenever the active session changes, swap messages.
  useEffect(() => {
    if (!hydrated || !activeSession) return;
    setMessages(activeSession.messages);
  }, [activeId, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist messages back to the active session whenever they change.
  // Two cases:
  //   1. Active session already exists in sessions[] → update it.
  //   2. Active session is the fresh one we created on mount but never
  //      added to sessions[]. If messages are empty, skip (don't pollute
  //      history with empty chats). If messages exist, add the new session
  //      to the top of sessions[].
  useEffect(() => {
    if (!hydrated || !activeId) return;
    if ((messages?.length ?? 0) === 0) return; // skip empty
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === activeId);
      const now = Date.now();
      if (idx === -1) {
        const fresh: ChatSession = {
          id: activeId,
          title: deriveTitle(messages as UIMessage[]),
          createdAt: now,
          updatedAt: now,
          messages: messages as UIMessage[],
        };
        const next = [fresh, ...prev];
        saveSessions(next);
        return next;
      }
      const current = prev[idx];
      if (current.messages === messages) return prev;
      const updated: ChatSession = {
        ...current,
        messages: messages as UIMessage[],
        title:
          current.title === "New conversation" || current.title === ""
            ? deriveTitle(messages as UIMessage[])
            : current.title,
        updatedAt: now,
      };
      const next = [...prev];
      next[idx] = updated;
      next.sort((a, b) => b.updatedAt - a.updatedAt);
      saveSessions(next);
      return next;
    });
  }, [messages, hydrated, activeId]);

  // Autoscroll on new messages.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const handleNew = useCallback(() => {
    // Don't pre-add the empty session to sessions[] — the persistence
    // effect will insert it once the user actually sends a first message.
    const s = newSession();
    setActiveId(s.id);
    setMessages([]);
    setSidebarOpen(false);
  }, [setMessages]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        saveSessions(next);
        if (id === activeId) {
          if (next.length > 0) {
            setActiveId(next[0].id);
            setMessages(next[0].messages);
          } else {
            // No sessions left — start a fresh empty one (not persisted yet).
            const s = newSession();
            setActiveId(s.id);
            setMessages([]);
          }
        }
        return next;
      });
    },
    [activeId, setMessages]
  );

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (status === "submitted" || status === "streaming") return;
      if (cooldownUntil && Date.now() < cooldownUntil) {
        setShowUpgrade(true);
        return;
      }
      sendMessage({ text: trimmed });
      setInput("");
    },
    [sendMessage, status, cooldownUntil]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const isBusy = status === "submitted" || status === "streaming";
  const showEmpty = messages.length === 0;

  const exportToPdf = useCallback(() => {
    if (typeof window === "undefined") return;
    // Native print → user selects "Save as PDF" in the print dialog.
    // The @media print CSS in globals.css strips UI chrome and styles the
    // messages for paper / PDF readers.
    window.print();
  }, []);

  const conversationTitle = activeSession?.title || "New conversation";
  const printDateLabel = useMemo(() => {
    const d = new Date(activeSession?.updatedAt ?? Date.now());
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [activeSession?.updatedAt]);

  return (
    <div className="flex flex-1 h-dvh overflow-hidden relative">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        className="flex flex-1 flex-col bg-background min-w-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Chat header bar — visible on every screen size */}
        <div
          data-no-print
          className="flex items-center gap-2 border-b border-border px-3 sm:px-4 py-2.5 bg-surface"
        >
          {/* Mobile: hamburger to open sidebar */}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden -ml-1 h-9 w-9 flex items-center justify-center rounded-lg text-muted hover:bg-surface-muted active:bg-surface-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <BookOpen
            className="hidden md:hidden h-5 w-5 text-accent"
            strokeWidth={1.75}
          />
          <h1 className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
            <span className="md:hidden">{conversationTitle}</span>
            <span className="hidden md:inline text-muted">
              {conversationTitle}
            </span>
          </h1>
          <ThemeToggle />
          {!showEmpty && (
            <button
              type="button"
              onClick={exportToPdf}
              title="Save this conversation as PDF"
              aria-label="Save as PDF"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted hover:bg-accent-soft hover:text-accent-strong active:bg-accent-soft active:text-accent-strong px-3 py-2 sm:py-1.5 text-xs font-medium text-muted transition-colors"
            >
              <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
              <span className="hidden sm:inline">Save PDF</span>
            </button>
          )}
          <AuthButton />
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6"
        >
          <div className="mx-auto w-full max-w-3xl">
            {/* Print-only document header */}
            <div className="print-only mb-6 pb-4 border-b border-gray-300">
              <h1 className="text-[16pt] font-bold text-black mb-1">
                {conversationTitle}
              </h1>
              <p className="text-[10pt] text-gray-600">
                Scientific Quran AI · {printDateLabel}
              </p>
              <p className="arabic text-[11pt] mt-2" style={{ color: "#094842" }}>
                بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            </div>

            {showEmpty ? (
              <EmptyState onPick={submit} />
            ) : (
              messages.map((m) => (
                <MessageBubble key={m.id} message={m as UIMessage} />
              ))
            )}

            {isBusy && messages[messages.length - 1]?.role === "user" && (
              <div
                data-no-print
                className="flex items-center gap-2 text-muted text-sm pl-11"
              >
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                Reflecting on the sources…
              </div>
            )}

            {error && !isRateLimitError && !onCooldown && (
              <div
                data-no-print
                className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              >
                {error.message ||
                  "Something went wrong. Check the server logs and your API keys."}
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          data-no-print
          className="border-t border-border bg-surface px-3 sm:px-6 md:px-8 pt-3 sm:pt-4"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            {onCooldown && (
              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="mb-2 flex items-center justify-center gap-2 w-full rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
              >
                <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                <span>
                  Free limit reached — paused for{" "}
                  <span className="font-mono font-semibold tabular-nums">
                    {cooldownSeconds}s
                  </span>
                </span>
                <span className="text-amber-600 dark:text-amber-400 underline-offset-2 underline">
                  upgrade
                </span>
              </button>
            )}
            <div
              className={`flex items-end gap-2 rounded-2xl border bg-background px-3 py-2 focus-within:border-accent transition-colors ${
                onCooldown
                  ? "border-amber-300 dark:border-amber-800 opacity-70"
                  : useWebSearch
                  ? "border-accent"
                  : "border-border"
              }`}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                rows={1}
                disabled={onCooldown}
                placeholder={
                  onCooldown
                    ? `Wait ${cooldownSeconds}s…`
                    : useWebSearch
                    ? "Ask a general fact (web)…"
                    : "Ask about the Quran or life…"
                }
                /* font-size: 16px (text-base) prevents iOS auto-zoom on focus */
                className="flex-1 resize-none bg-transparent px-2 py-2 text-base sm:text-[15px] leading-6 outline-none placeholder:text-muted max-h-40 disabled:cursor-not-allowed"
                style={{ minHeight: "2.5rem", height: "auto" }}
              />
              <button
                type="button"
                onClick={() => setUseWebSearch((v) => !v)}
                disabled={isBusy || onCooldown}
                title={
                  useWebSearch
                    ? "Web search ON — Gemini may use Google for biographical / general facts. Click to disable."
                    : "Web search OFF — answers from your Quran + tafsir only. Click to enable for bio/general questions."
                }
                aria-pressed={useWebSearch}
                aria-label="Toggle web search"
                className={`shrink-0 h-9 sm:h-9 w-9 sm:w-auto px-0 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  useWebSearch
                    ? "bg-accent text-white hover:bg-accent-strong"
                    : "bg-surface-muted text-muted hover:text-foreground border border-border"
                }`}
              >
                <Globe className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">Web</span>
              </button>
              {isBusy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="shrink-0 h-9 w-9 rounded-full bg-foreground/80 hover:bg-foreground text-background flex items-center justify-center transition-colors"
                  aria-label="Stop generation"
                >
                  <Square className="h-4 w-4" strokeWidth={2} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || onCooldown}
                  className="shrink-0 h-9 w-9 rounded-full bg-accent hover:bg-accent-strong disabled:bg-border disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-muted text-center leading-relaxed">
              {useWebSearch ? (
                <>
                  <Globe className="inline h-3 w-3 mb-0.5" strokeWidth={2} /> Web
                  search is enabled — Gemini may use Google for biographical or
                  general facts. Quranic answers still come from your knowledge
                  base.
                </>
              ) : (
                <>
                  Answers are grounded in the Quran and Zakaria Kamal&apos;s
                  tafsir. Toggle{" "}
                  <Globe className="inline h-3 w-3 mb-0.5" strokeWidth={2} /> Web
                  for biographical / general facts.
                </>
              )}
            </p>
          </div>
        </form>
      </main>

      <UpgradeModal
        open={showUpgrade}
        cooldownUntil={cooldownUntil}
        onClose={() => setShowUpgrade(false)}
      />
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 sm:py-16 px-1">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-accent-soft text-accent-strong flex items-center justify-center mb-4 sm:mb-5">
        <BookOpen className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-1">
        Scientific Quran AI
      </h2>
      <p className="arabic mb-3 text-accent-strong text-xl sm:text-2xl">
        بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
      </p>
      <p className="text-muted max-w-md text-[13px] sm:text-sm leading-relaxed mb-6 sm:mb-8 px-2">
        Ask anything — life, science, theology, or doubt. Answers are anchored
        in the Holy Quran, authentic Hadith, and scientific tafsir.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPick(p)}
            className="text-left rounded-xl border border-border bg-surface hover:border-accent hover:bg-accent-soft active:bg-accent-soft transition-colors px-4 py-3 text-sm text-foreground"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
