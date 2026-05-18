"use client";

import type { UIMessage } from "ai";

export type ChatSession = {
  id: string;
  /** Auto-derived from the first user message; overridden by customTitle. */
  title: string;
  /** User-set title (rename). When present, displayed instead of `title`. */
  customTitle?: string;
  /** Pinned sessions float to the top of the sidebar list, above the rest. */
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
};

const STORAGE_KEY = "sqai.sessions.v1";

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSessions(): ChatSession[] {
  const ls = safeLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    if (!Array.isArray(parsed)) return [];
    return sortSessions(parsed);
  } catch {
    return [];
  }
}

/** Pinned first (by recency), then unpinned (by recency). */
export function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.updatedAt - a.updatedAt;
  });
}

/** Display title — prefers user-set rename, falls back to auto-derived. */
export function sessionTitle(s: ChatSession): string {
  const custom = s.customTitle?.trim();
  if (custom) return custom;
  return s.title || "Untitled";
}

export function saveSessions(sessions: ChatSession[]): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // quota or serialization error — silently drop. UI still works in-memory.
  }
}

export function newSession(): ChatSession {
  const now = Date.now();
  return {
    id: cryptoRandomId(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function deriveTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const text =
    firstUser.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim() ?? "";
  if (!text) return "New conversation";
  return text.length > 60 ? text.slice(0, 57) + "…" : text;
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
