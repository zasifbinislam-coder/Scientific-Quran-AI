"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

/**
 * One-shot voice-to-text via the Web Speech API. Click → listen until
 * silence → push the final transcript via `onTranscript`. Hidden on
 * browsers that don't support it (Firefox today, older Safari). No
 * server roundtrip, no API key, fully free.
 */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal: boolean;
    [k: number]: { transcript: string };
  }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function VoiceInputButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() != null);
  }, []);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* nothing to abort */
      }
    };
  }, []);

  if (!supported) return null;

  function start() {
    if (listening) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    // Bengali primary; many Chrome builds will fall back to English
    // gracefully when the speaker uses English / code-switches.
    rec.lang = "bn-BD";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (ev) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (finalText) {
        onTranscript(finalText);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stop() {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={disabled && !listening}
        title={listening ? "Stop listening" : "Voice input (Bangla / English)"}
        aria-pressed={listening}
        aria-label="Voice input"
        className={`shrink-0 h-9 w-9 sm:w-auto sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          listening
            ? "bg-red-600 text-white hover:bg-red-700 animate-pulse"
            : "bg-surface-muted text-muted hover:text-foreground border border-border"
        }`}
      >
        {listening ? (
          <MicOff className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
        ) : (
          <Mic className="h-4 w-4 sm:h-3.5 sm:w-3.5" strokeWidth={2} />
        )}
      </button>
      {listening && interim && (
        <div className="absolute -top-7 left-3 text-xs text-muted italic max-w-md truncate pointer-events-none">
          {interim}…
        </div>
      )}
    </>
  );
}
