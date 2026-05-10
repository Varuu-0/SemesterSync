"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { SignInButton } from "@/components/AuthButton";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-surface to-ink-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-ink-900">
          <Logo />
          <span className="text-base font-semibold">SemesterSync</span>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:pt-24">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink-900 md:text-5xl">
            Every syllabus.
            <br />
            One calendar.
          </h1>
          <p className="mt-5 max-w-md text-base text-ink-600">
            Drop in your course PDFs and SemesterSync pulls every assignment,
            quiz, and exam onto one color-coded calendar you can export
            anywhere.
          </p>
          <div className="mt-8">
            <SignInButton />
          </div>
          <ul className="mt-10 grid gap-3 text-sm text-ink-600">
            <Feature>Auto-extract deadlines from syllabus PDFs</Feature>
            <Feature>Color-coded calendar across all your courses</Feature>
            <Feature>Download as .ics for Google or Apple Calendar</Feature>
            <Feature>Per-course chat for study coordination</Feature>
          </ul>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-surface p-6 shadow-soft">
          <Mockup />
        </div>
      </section>
    </main>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

function Logo() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Mockup() {
  const colors = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6"];
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-800">May 2026</span>
        <div className="flex gap-1">
          {colors.map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-[10px] uppercase text-ink-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="px-1 pb-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const events = pseudoEvents(d, colors);
          return (
            <div
              key={d}
              className="aspect-square rounded-md border border-ink-100 p-1.5 text-[11px] text-ink-500"
            >
              <div className="font-medium text-ink-700">{d}</div>
              <div className="mt-1 space-y-0.5">
                {events.map((c, i) => (
                  <div key={i} className="h-1 rounded-full" style={{ background: c }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function pseudoEvents(day: number, colors: string[]): string[] {
  const out: string[] = [];
  if (day % 4 === 0) out.push(colors[0]);
  if (day % 7 === 0) out.push(colors[1]);
  if (day % 9 === 0) out.push(colors[2]);
  if (day % 11 === 0) out.push(colors[3]);
  return out;
}
