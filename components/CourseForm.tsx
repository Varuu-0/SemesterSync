"use client";

import { useState } from "react";
import { COURSE_COLORS } from "@/lib/types";

export function CourseForm({
  onSubmit,
  busy,
}: {
  onSubmit: (name: string, color: string) => Promise<void> | void;
  busy?: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COURSE_COLORS[5]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onSubmit(name.trim(), color);
        setName("");
      }}
      className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-surface p-4 shadow-soft sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        <label className="block text-xs font-medium text-ink-500">Course name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. CS 374 — Algorithms"
          className="mt-1 w-full rounded-md border border-ink-200 bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-500">Color</label>
        <div className="mt-1 flex items-center gap-1.5">
          {COURSE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              className={`h-7 w-7 rounded-full border-2 transition ${
                color === c ? "border-primary" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-60"
      >
        Add course
      </button>
    </form>
  );
}
