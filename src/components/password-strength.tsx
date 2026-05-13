"use client";

import { scorePassword, type Strength } from "@/lib/password-strength";

type Props = {
  password: string;
};

const BAR_COLORS: Record<Strength["color"], string> = {
  red: "bg-red-500",
  amber: "bg-orange-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-emerald-500",
};

const TEXT_COLORS: Record<Strength["color"], string> = {
  red: "text-red-600 dark:text-red-400",
  amber: "text-orange-600 dark:text-orange-400",
  yellow: "text-yellow-700 dark:text-yellow-500",
  lime: "text-lime-700 dark:text-lime-500",
  green: "text-emerald-700 dark:text-emerald-400",
};

export function PasswordStrength({ password }: Props) {
  if (!password) return null;
  const s = scorePassword(password);

  return (
    <div className="mt-2 space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => {
          const filled = i < s.score;
          return (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                filled ? BAR_COLORS[s.color] : "bg-border"
              }`}
            />
          );
        })}
      </div>
      <p className="text-[11px] leading-tight">
        <span className={`font-medium ${TEXT_COLORS[s.color]}`}>{s.label}</span>
        {s.tips.length > 0 && (
          <span className="text-muted"> — {s.tips.slice(0, 2).join(" · ")}</span>
        )}
      </p>
    </div>
  );
}
