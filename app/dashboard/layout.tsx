"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { SignOutButton } from "@/components/AuthButton";
import { ThemePicker } from "@/components/ThemePicker";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/courses", label: "Courses" },
  { href: "/dashboard/gpa", label: "GPA" },
  { href: "/dashboard/chat", label: "Chat" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-ink-500">
        Loading…
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-surface-strong/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-ink-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-base font-semibold">SemesterSync</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-fg"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <ThemePicker />
            {(() => {
              const meta = user.user_metadata as
                | { avatar_url?: string; full_name?: string; name?: string }
                | undefined;
              const avatar = meta?.avatar_url;
              const name = meta?.full_name ?? meta?.name ?? user.email ?? "User";
              return avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={name}
                  className="h-7 w-7 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : null;
            })()}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
