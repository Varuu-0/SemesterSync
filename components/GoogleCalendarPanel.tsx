"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import type { GoogleCalendarEvent } from "@/lib/types";

type Status = {
  connected: boolean;
  google_calendar_id: string | null;
  google_connected_at: string | null;
  show_gcal_events: boolean;
  last_sync_at: string | null;
  server_configured: boolean;
};

export function GoogleCalendarPanel({
  onEventsChange,
}: {
  /** Called with the latest pulled events whenever they change (or [] when off / disconnected). */
  onEventsChange: (events: GoogleCalendarEvent[]) => void;
}) {
  const { connectGoogleCalendar } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<string | null>(null);
  const onEventsChangeRef = useRef(onEventsChange);
  onEventsChangeRef.current = onEventsChange;

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/google/status", { cache: "no-store" });
      if (!res.ok) {
        setStatus(null);
      } else {
        setStatus((await res.json()) as Status);
      }
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvents = useCallback(async (s: Status | null) => {
    if (!s?.connected || !s.show_gcal_events) {
      onEventsChangeRef.current([]);
      return;
    }
    const now = new Date();
    // Roughly the visible 4-month window of FullCalendar plus a bit of margin.
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const res = await fetch(
        `/api/google/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        onEventsChangeRef.current([]);
        if (res.status === 401) {
          setError("Google access expired. Click Reconnect to refresh.");
        }
        return;
      }
      const data = (await res.json()) as { events: GoogleCalendarEvent[] };
      onEventsChangeRef.current(data.events ?? []);
    } catch {
      onEventsChangeRef.current([]);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    loadEvents(status);
  }, [status, loadEvents]);

  async function handleConnect() {
    setBusy("connect");
    setError(null);
    try {
      await connectGoogleCalendar("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
      setBusy(null);
    }
    // No setBusy(null) on success — the page is redirecting to Google.
  }

  async function handleSync() {
    setBusy("sync");
    setError(null);
    setSyncSummary(null);
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        created?: number;
        updated?: number;
        deleted?: number;
        errors?: string[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `Sync failed (${res.status})`);
        if (res.status === 401) await loadStatus();
      } else {
        const parts: string[] = [];
        if (data.created) parts.push(`${data.created} created`);
        if (data.updated) parts.push(`${data.updated} updated`);
        if (data.deleted) parts.push(`${data.deleted} deleted`);
        setSyncSummary(parts.length ? parts.join(" · ") : "Already in sync");
        await loadStatus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Synced events will stay in Google but new changes won't push.")) return;
    setBusy("disconnect");
    setError(null);
    try {
      const res = await fetch("/api/google/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Disconnect failed");
      } else {
        setSyncSummary(null);
        await loadStatus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleToggle(next: boolean) {
    // Optimistic update
    setStatus((s) => (s ? { ...s, show_gcal_events: next } : s));
    try {
      const res = await fetch("/api/google/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ show_gcal_events: next }),
      });
      if (!res.ok) throw new Error("Failed to save toggle");
    } catch (e) {
      // Roll back
      setStatus((s) => (s ? { ...s, show_gcal_events: !next } : s));
      setError(e instanceof Error ? e.message : "Failed to save toggle");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Google Calendar
        </div>
        <div className="mt-2 text-sm text-ink-500">Checking connection…</div>
      </div>
    );
  }

  if (!status?.server_configured) {
    return (
      <div className="rounded-2xl border border-amber-300/60 bg-amber-50/50 p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <GcalIcon />
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Google Calendar — server not configured
          </div>
        </div>
        <div className="mt-2 text-sm text-amber-800">
          Add <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_ID</code> and{" "}
          <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_SECRET</code> to{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and restart the dev server.
        </div>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GcalIcon />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Google Calendar
              </div>
              <div className="text-sm text-ink-700">
                Push every deadline to a private SemesterSync calendar and overlay your existing events here.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConnect}
            disabled={busy === "connect"}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-60"
          >
            {busy === "connect" ? "Redirecting…" : "Connect"}
          </button>
        </div>
        {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <GcalIcon />
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Google Calendar
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            </div>
            <div className="mt-0.5 text-xs text-ink-500">
              {status.last_sync_at
                ? `Last synced ${formatRelative(new Date(status.last_sync_at))}`
                : "Not synced yet — push your deadlines to start."}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={busy === "sync"}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-60"
          >
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={busy === "connect"}
            className="rounded-md border border-ink-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100"
          >
            Reconnect
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={busy === "disconnect"}
            className="rounded-md border border-red-200 bg-surface px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {busy === "disconnect" ? "…" : "Disconnect"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 pt-3">
        <div className="flex items-center gap-2">
          <Toggle
            checked={status.show_gcal_events}
            onChange={handleToggle}
            label="Show Google Calendar events"
          />
        </div>
        <div className="text-xs text-ink-500">
          {status.show_gcal_events
            ? "Showing events from your primary Google calendar as outlined overlays."
            : "Calendar shows only your SemesterSync deadlines."}
        </div>
      </div>

      {syncSummary && (
        <div className="mt-2 text-xs font-medium text-emerald-700">{syncSummary}</div>
      )}
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <span
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          checked ? "bg-primary" : "bg-ink-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow transition ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </span>
      <span className="text-sm text-ink-700">{label}</span>
    </label>
  );
}

function GcalIcon() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
        <path d="M9 14h2v2H9z" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
