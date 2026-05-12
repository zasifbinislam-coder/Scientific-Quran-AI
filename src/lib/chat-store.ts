"use client";

import type { UIMessage } from "ai";

export type ChatSession = {
  id: string;
  title: string;
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
    return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
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
