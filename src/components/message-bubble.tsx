"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Check, Copy, RotateCcw, User } from "lucide-react";
import type { UIMessage } from "ai";

// Force "Arabic:" / "Translation:" (and Bengali equivalents) to always begin
// their own paragraph, regardless of how the LLM laid out whitespace. This
// stops Arabic + Bengali from getting fused into a single RTL block.
const LABEL_PATTERN = /(?:^|[^\n])\s*\n?\s*((?:Arabic|Translation|আরবি|অনুবাদ):)/g;

function normalizeLabels(text: string): string {
  return text.replace(LABEL_PATTERN, (match, label) => {
    // If the match starts the string, no preceding char to preserve.
    const head = match[0] === label[0] ? "" : match[0];
    return `${head}\n\n${label}`;
  });
}

function renderText(text: string) {
  const blocks = normalizeLabels(text).split(/\n{2,}/);

  return blocks
    .map((raw, i) => {
      const block = raw.trim();
      if (!block) return null;

      const arabic = block.match(/^(?:Arabic|আরবি):\s*([\s\S]+)$/);
      if (arabic) {
        return (
          <p key={i} className="arabic my-3" dir="rtl" lang="ar">
            {arabic[1].trim()}
          </p>
        );
      }

      const translation = block.match(/^(?:Translation|অনুবাদ):\s*([\s\S]+)$/);
      if (translation) {
        return (
          <p key={i} className="my-2 leading-relaxed">
            <span className="text-muted text-[11px] font-medium uppercase tracking-wider block mb-1">
              Translation
            </span>
            {translation[1].trim()}
          </p>
        );
      }

      return (
        <div key={i} className="prose-chat">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
        </div>
      );
    })
    .filter(Boolean);
}

export function MessageBubble({
  message,
  canRegenerate = false,
  onRegenerate,
}: {
  message: UIMessage;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
}) {
  const isUser = message.role === "user";

  const text =
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n\n") ?? "";

  return (
    <div
      className={`message-bubble ${isUser ? "user" : "assistant"} flex gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } mb-5`}
    >
      <div
        className={`message-avatar shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-surface-muted text-foreground"
            : "bg-accent text-white"
        }`}
        aria-hidden
      >
        {isUser ? (
          <User className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <BookOpen className="h-4 w-4" strokeWidth={1.75} />
        )}
      </div>

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[88%] sm:max-w-[80%] md:max-w-[78%]`}>
        <div
          className={`message-body rounded-2xl px-3.5 sm:px-4 py-3 text-[15px] leading-relaxed ${
            isUser
              ? "bg-accent text-white rounded-tr-sm"
              : "bg-surface border border-border text-foreground rounded-tl-sm"
          }`}
        >
          {/* Print-only label so PDF reader sees who said what */}
          <p className="print-only text-[10pt] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            {isUser ? "You" : "Scientific Quran AI"}
          </p>
          {text ? (
            renderText(text)
          ) : (
            <span className="text-muted italic">…</span>
          )}
        </div>
        {text && (
          <MessageActions
            text={text}
            canRegenerate={canRegenerate}
            onRegenerate={onRegenerate}
          />
        )}
      </div>
    </div>
  );
}

function MessageActions({
  text,
  canRegenerate,
  onRegenerate,
}: {
  text: string;
  canRegenerate: boolean;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — silent */
    }
  }

  return (
    <div
      data-no-print
      className="message-actions flex items-center gap-1 mt-1 px-1 opacity-70 hover:opacity-100 transition-opacity"
    >
      <button
        type="button"
        onClick={copy}
        title={copied ? "Copied!" : "Copy"}
        aria-label="Copy message"
        className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground rounded px-1.5 py-1"
      >
        {copied ? (
          <Check className="h-3 w-3" strokeWidth={2} />
        ) : (
          <Copy className="h-3 w-3" strokeWidth={1.75} />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      {canRegenerate && onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          title="Regenerate response"
          aria-label="Regenerate response"
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground rounded px-1.5 py-1"
        >
          <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
          Regenerate
        </button>
      )}
    </div>
  );
}
