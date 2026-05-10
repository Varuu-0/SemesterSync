"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeId,
  type ThemeId,
} from "@/lib/themes";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  // Hydrate from localStorage / DOM after mount. The inline FOUC script in
  // the root layout already set <html data-theme>, so we just mirror it.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const fromDom = document.documentElement.getAttribute("data-theme");
    if (fromDom && isThemeId(fromDom)) {
      setThemeState(fromDom);
      return;
    }
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && isThemeId(stored)) {
        setThemeState(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (next) => {
        setThemeState(next);
        if (typeof document !== "undefined") {
          if (next === DEFAULT_THEME) {
            document.documentElement.removeAttribute("data-theme");
          } else {
            document.documentElement.setAttribute("data-theme", next);
          }
        }
        try {
          if (next === DEFAULT_THEME) {
            window.localStorage.removeItem(THEME_STORAGE_KEY);
          } else {
            window.localStorage.setItem(THEME_STORAGE_KEY, next);
          }
        } catch {
          // ignore quota / private mode failures
        }
      },
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
