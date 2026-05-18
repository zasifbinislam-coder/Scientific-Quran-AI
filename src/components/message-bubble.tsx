"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Check,
  Copy,
  Pencil,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
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
  canEdit = false,
  onEdit,
  onDelete,
}: {
  message: UIMessage;
  canRegenerate?: boolean;
  onRegenerate?: () => void;
  canEdit?: boolean;
  onEdit?: (newText: string) => void;
  onDelete?: () => void;
}) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const text =
    message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n\n") ?? "";

  function startEdit() {
    setDraft(text);
    setEditing(true);
  }

  function commitEdit() {
    const next = draft.trim();
    if (next && next !== text.trim()) {
      onEdit?.(next);
    }
    setEditing(false);
  }

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

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[88%] sm:max-w-[80%] md:max-w-[78%] min-w-0 w-full`}>
        <div
          className={`message-body w-full rounded-2xl px-3.5 sm:px-4 py-3 text-[15px] leading-relaxed ${
            isUser
              ? "bg-accent text-white rounded-tr-sm"
              : "bg-surface border border-border text-foreground rounded-tl-sm"
          }`}
        >
          {/* Print-only label so PDF reader sees who said what */}
          <p className="print-only text-[10pt] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            {isUser ? "You" : "Scientific Quran AI"}
          </p>
          {editing ? (
            <>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setEditing(false);
                  }
                }}
                rows={Math.min(8, Math.max(2, draft.split("\n").length + 1))}
                className={`w-full resize-none bg-transparent outline-none leading-relaxed ${
                  isUser ? "text-white placeholder:text-white/60" : ""
                }`}
              />
              <div className="flex items-center justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={`text-[11px] rounded px-2 py-1 ${
                    isUser ? "text-white/80 hover:text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitEdit}
                  className={`text-[11px] rounded px-2.5 py-1 font-medium ${
                    isUser
                      ? "bg-white text-accent hover:bg-white/90"
                      : "bg-accent text-white hover:bg-accent-strong"
                  }`}
                >
                  Send
                </button>
              </div>
            </>
          ) : text ? (
            renderText(text)
          ) : (
            <span className="text-muted italic">…</span>
          )}
        </div>
        {text && !editing && (
          <MessageActions
            text={text}
            canRegenerate={canRegenerate}
            onRegenerate={onRegenerate}
            canEdit={canEdit}
            onEdit={startEdit}
            onDelete={onDelete}
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
  canEdit,
  onEdit,
  onDelete,
}: {
  text: string;
  canRegenerate: boolean;
  onRegenerate?: () => void;
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
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
      {canEdit && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title="Edit and resend"
          aria-label="Edit message"
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground rounded px-1.5 py-1"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.75} />
          Edit
        </button>
      )}
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
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete from this chat"
          aria-label="Delete message"
          className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-500 rounded px-1.5 py-1"
        >
          <Trash2 className="h-3 w-3" strokeWidth={1.75} />
          Delete
        </button>
      )}
    </div>
  );
}
