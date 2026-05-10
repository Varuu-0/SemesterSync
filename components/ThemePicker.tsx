"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-ink-200 bg-surface px-2.5 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
      >
        <span className="flex items-center gap-0.5">
          {current.swatches.map((c, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full ring-1 ring-ink-200"
              style={{ background: c }}
            />
          ))}
        </span>
        <span className="hidden sm:inline">{current.label}</span>
        <Chevron />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-ink-200 bg-surface-opaque shadow-soft backdrop-blur-none"
        >
          <div className="border-b border-ink-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Theme
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={active}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (t.id === theme) return;
                    setTheme(t.id);
                    window.location.reload();
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                    active
                      ? "bg-ink-100 text-ink-900"
                      : "text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  <span className="flex shrink-0 items-center gap-0.5">
                    {t.swatches.map((c, i) => (
                      <span
                        key={i}
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-ink-200"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-ink-500">
                      {t.description}
                    </span>
                  </span>
                  {active && <Check />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Chevron() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
