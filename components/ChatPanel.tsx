"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import type { ChatMessage } from "@/lib/types";
import { useAuth } from "./AuthProvider";

type Stats = {
  courseCount: number;
  syllabusCount: number;
  deadlineCount: number;
};

export function ChatPanel({ stats }: { stats: Stats }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const supabase = supabaseBrowser();

    setLoading(true);
    setMessages([]);
    setError(null);

    async function load() {
      const { data, error: loadErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user!.id)
        .is("course_id", null)
        .order("created_at", { ascending: true });
      if (!mounted) return;
      if (loadErr) {
        console.error("chat load error:", loadErr);
        setError(loadErr.message);
        setMessages([]);
      } else {
        setMessages((data ?? []) as ChatMessage[]);
      }
      setLoading(false);
    }
    load();

    // Realtime is best-effort — sender already adds rows locally on insert,
    // so this mainly helps when multiple tabs are open.
    const channel = supabase
      .channel(`chat:global:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          if (row.course_id !== null) return; // only the global thread here
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, thinking]);

  async function send() {
    if (!user) return;
    const value = text.trim();
    if (!value) return;

    setBusy(true);
    setError(null);
    setText("");

    const supabase = supabaseBrowser();
    const meta = user.user_metadata as
      | { full_name?: string; name?: string; avatar_url?: string }
      | undefined;

    let userMessageId: string | null = null;

    try {
      const userInsert = await supabase
        .from("chat_messages")
        .insert({
          user_id: user.id,
          course_id: null,
          role: "user",
          user_name: meta?.full_name ?? meta?.name ?? user.email ?? "You",
          user_photo: meta?.avatar_url ?? null,
          text: value,
        })
        .select()
        .single();
      if (userInsert.error) throw userInsert.error;

      const userRow = userInsert.data as ChatMessage;
      userMessageId = userRow.id;
      setMessages((prev) =>
        prev.some((m) => m.id === userRow.id) ? prev : [...prev, userRow]
      );
    } catch (e) {
      console.error("chat send (user) error:", e);
      setError((e as Error).message || "Failed to send.");
      setText(value);
      setBusy(false);
      return;
    }

    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: value }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        const reason =
          res.status === 501
            ? "AI is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server."
            : json.error || `Request failed (${res.status}).`;
        throw new Error(reason);
      }

      const data = (await res.json()) as { reply: string };

      const assistantInsert = await supabase
        .from("chat_messages")
        .insert({
          user_id: user.id,
          course_id: null,
          role: "assistant",
          user_name: "SemesterSync AI",
          user_photo: null,
          text: data.reply,
        })
        .select()
        .single();
      if (assistantInsert.error) throw assistantInsert.error;

      const row = assistantInsert.data as ChatMessage;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row]
      );
    } catch (e) {
      console.error("chat reply error:", e);
      setError((e as Error).message || "Failed to get a reply.");
      if (userMessageId) {
        const id = userMessageId;
        setMessages((prev) => prev.filter((m) => m.id !== id));
        await supabase.from("chat_messages").delete().eq("id", id);
      }
      setText(value);
    } finally {
      setThinking(false);
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function deleteMessage(id: string) {
    const supabase = supabaseBrowser();
    setMessages((prev) => prev.filter((m) => m.id !== id));
    const { error: delErr } = await supabase
      .from("chat_messages")
      .delete()
      .eq("id", id);
    if (delErr) setError(delErr.message);
  }

  async function clearThread() {
    if (!user) return;
    if (!confirm("Clear this entire chat thread?")) return;
    const supabase = supabaseBrowser();
    setMessages([]);
    const { error: delErr } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id)
      .is("course_id", null);
    if (delErr) setError(delErr.message);
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-ink-200 bg-surface shadow-soft">
      <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-fg">
          AI
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-ink-900">
            SemesterSync Assistant
          </div>
          <div className="text-xs text-ink-500">
            {describeContext(stats)}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearThread}
            className="rounded-md border border-ink-200 bg-surface px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-ink-100"
          >
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="grid h-full place-items-center text-center text-sm text-ink-500">
            Loading…
          </div>
        ) : messages.length === 0 ? (
          <EmptyState stats={stats} onPick={(s) => setText(s)} />
        ) : (
          messages.map((m) => (
            <Bubble
              key={m.id}
              message={m}
              onDelete={() => deleteMessage(m.id)}
            />
          ))
        )}
        {thinking && <ThinkingBubble />}
      </div>

      {error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-ink-200 px-3 py-3"
      >
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about your semester…"
          autoComplete="off"
          disabled={busy}
          className="flex-1 rounded-md border border-ink-200 bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-ink-100"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function describeContext(stats: Stats): string {
  if (stats.courseCount === 0) return "Add a course to get personalized answers";
  const parts: string[] = [];
  parts.push(`${stats.courseCount} course${stats.courseCount === 1 ? "" : "s"}`);
  if (stats.syllabusCount > 0) {
    parts.push(`${stats.syllabusCount} syllab${stats.syllabusCount === 1 ? "us" : "i"}`);
  }
  parts.push(
    `${stats.deadlineCount} deadline${stats.deadlineCount === 1 ? "" : "s"}`
  );
  return `Grounded in ${parts.join(" · ")}`;
}

function EmptyState({
  stats,
  onPick,
}: {
  stats: Stats;
  onPick: (s: string) => void;
}) {
  const suggestions =
    stats.courseCount === 0
      ? [
          "How do I get started with SemesterSync?",
        ]
      : [
          "What's due this week?",
          "Plan my next 2 weeks of work.",
          "What's my heaviest course right now?",
          "Summarize my upcoming exams.",
        ];

  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div>
        <div className="text-sm font-medium text-ink-700">
          Ask anything about your semester
        </div>
        <div className="mt-1 text-xs text-ink-500">
          The assistant has every course, syllabus, and deadline you&apos;ve added.
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className="rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-xs text-ink-600 hover:bg-ink-100"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({
  message,
  onDelete,
}: {
  message: ChatMessage;
  onDelete: () => void;
}) {
  const isAssistant = message.role === "assistant";
  const time = new Date(message.created_at);
  return (
    <div className={`group flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
          isAssistant
            ? "border border-ink-200 bg-surface text-ink-900"
            : "bg-primary text-primary-fg"
        }`}
      >
        {isAssistant && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            <AiMark />
            SemesterSync AI
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
        <div
          className={`mt-1 flex items-center gap-2 text-[10px] ${
            isAssistant ? "text-ink-400" : "text-primary-fg/70"
          }`}
        >
          <span>
            {time.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 transition group-hover:opacity-100 hover:underline"
            aria-label="Delete message"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl border border-ink-200 bg-surface px-3 py-2 text-sm shadow-soft">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
          <AiMark />
          SemesterSync AI
        </div>
        <div className="flex items-center gap-1 py-0.5">
          <Dot delay="0ms" />
          <Dot delay="120ms" />
          <Dot delay="240ms" />
        </div>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ink-400"
      style={{ animationDelay: delay }}
    />
  );
}

function AiMark() {
  return (
    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-fg">
      AI
    </span>
  );
}
