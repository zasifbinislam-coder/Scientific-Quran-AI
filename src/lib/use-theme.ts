"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return "light";
}

/**
 * Reads the current theme from the data-theme attribute on <html>
 * (set synchronously by the inline script in layout.tsx, before React
 * hydrates). Returns a setter that writes back to localStorage + attribute.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // Sync local state when the attribute changes from elsewhere (e.g.
  // another tab toggling, or system pref change while no override exists).
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark" || attr === "light") setThemeState(attr);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode / quota — ignore */
    }
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
