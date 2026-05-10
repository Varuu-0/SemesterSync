"use client";

import { useEffect, useRef, useState } from "react";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { supabaseBrowser } from "@/lib/supabase";
import type { AssistantActionPayload, ChatMessage } from "@/lib/types";
import { useAuth } from "./AuthProvider";

type Stats = {
  courseCount: number;
  syllabusCount: number;
  deadlineCount: number;
};

/** Parse SSE frames from POST /api/chat (text/event-stream). */
async function readChatSseStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (delta: string) => void
): Promise<{
  message?: ChatMessage;
  actionPayload?: AssistantActionPayload | null;
  error?: string;
}> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let message: ChatMessage | undefined;
  let actionPayload: AssistantActionPayload | null | undefined;
  let error: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    while (true) {
      const m = buf.match(/\r?\n\r?\n/);
      if (!m || m.index === undefined) break;
      const block = buf.slice(0, m.index);
      buf = buf.slice(m.index + m[0].length);
      const line = block.split(/\r?\n/).find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        const payload = JSON.parse(line.slice(6).trim()) as {
          delta?: string;
          done?: boolean;
          message?: ChatMessage;
          actionPayload?: AssistantActionPayload | null;
          error?: string;
        };
        if (payload.error) error = payload.error;
        if (payload.delta) onDelta(payload.delta);
        if (payload.done && payload.message) {
          message = payload.message;
          actionPayload = payload.actionPayload ?? null;
        }
      } catch {
        /* ignore malformed chunk */
      }
    }
  }

  const tail = buf.trim();
  if (tail) {
    const line = tail.split(/\r?\n/).find((l) => l.startsWith("data: "));
    if (line) {
      try {
        const payload = JSON.parse(line.slice(6).trim()) as {
          delta?: string;
          done?: boolean;
          message?: ChatMessage;
          actionPayload?: AssistantActionPayload | null;
          error?: string;
        };
        if (payload.error) error = payload.error;
        if (payload.delta) onDelta(payload.delta);
        if (payload.done && payload.message) {
          message = payload.message;
          actionPayload = payload.actionPayload ?? null;
        }
      } catch {
        /* ignore */
      }
    }
  }

  return { message, actionPayload, error };
}

function groupChatMessages(messages: ChatMessage[]): {
  label: string;
  messages: ChatMessage[];
}[] {
  if (messages.length === 0) return [];
  const groups: { label: string; messages: ChatMessage[] }[] = [];
  let lastLabel = "";
  for (const m of messages) {
    const label = formatChatDayLabel(new Date(m.created_at));
    if (label !== lastLabel) {
      lastLabel = label;
      groups.push({ label, messages: [m] });
    } else {
      groups[groups.length - 1].messages.push(m);
    }
  }
  return groups;
}

function formatChatDayLabel(d: Date): string {
  const sod = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const today = sod(new Date());
  const day = sod(d);
  const diffDays = Math.round((today - day) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays >= 2 && diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }
  const sameYear = d.getFullYear() === new Date().getFullYear();
  if (sameYear) {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ChatPanel({ stats }: { stats: Stats }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  /** Live assistant text while SSE stream is open (including empty string = started). */
  const [streamReply, setStreamReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPayloadByMessage, setActionPayloadByMessage] = useState<
    Record<string, AssistantActionPayload>
  >({});
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
  }, [messages.length, streamReply]);

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

    setStreamReply("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
        },
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

      if (!res.body) throw new Error("No response body.");

      const streamResult = await readChatSseStream(res.body, (delta) => {
        setStreamReply((prev) => (prev === null ? delta : prev + delta));
      });

      if (streamResult.error) {
        throw new Error(streamResult.error);
      }
      if (streamResult.message) {
        const row = streamResult.message as ChatMessage;
        setMessages((prev) =>
          prev.some((m) => m.id === row.id) ? prev : [...prev, row]
        );
        if (streamResult.actionPayload) {
          setActionPayloadByMessage((prev) => ({
            ...prev,
            [row.id]: streamResult.actionPayload as AssistantActionPayload,
          }));
        }
      }
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
      setStreamReply(null);
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
    <div className="flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-soft">
      <div className="flex shrink-0 items-center gap-3 border-b border-ink-200 px-4 py-3">
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

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
      >
        {loading ? (
          <ChatThreadSkeleton />
        ) : messages.length === 0 ? (
          <EmptyState stats={stats} onPick={(s) => setText(s)} />
        ) : (
          groupChatMessages(messages).map((group) => (
            <div
              key={`${group.label}-${group.messages[0]?.id ?? ""}`}
              className="space-y-3"
            >
              <div className="flex justify-center py-0.5">
                <span className="rounded-full bg-ink-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                  {group.label}
                </span>
              </div>
              {group.messages.map((m) => (
                <Bubble
                  key={m.id}
                  message={m}
                  actionPayload={actionPayloadByMessage[m.id]}
                  onDelete={() => deleteMessage(m.id)}
                />
              ))}
            </div>
          ))
        )}
        {streamReply !== null && (
          <StreamingAssistantBubble text={streamReply} />
        )}
      </div>

      {error && (
        <div className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex shrink-0 items-center gap-2 border-t border-ink-200 px-3 py-3"
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
          {busy ? (streamReply !== null ? "Replying…" : "Sending…") : "Send"}
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
  actionPayload,
  onDelete,
}: {
  message: ChatMessage;
  actionPayload?: AssistantActionPayload;
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
        {isAssistant ? (
          <MarkdownMessage text={message.text} variant="assistant" />
        ) : (
          <div className="whitespace-pre-wrap break-words">{message.text}</div>
        )}
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

function StreamingAssistantBubble({ text }: { text: string }) {
  const showDots = text.length === 0;
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl border border-ink-200 bg-surface px-3 py-2 text-sm shadow-soft">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
          <AiMark />
          SemesterSync AI
        </div>
        {showDots ? (
          <div className="flex items-center gap-2 py-0.5">
            <span className="text-xs text-ink-400">Generating…</span>
            <Dot delay="0ms" />
            <Dot delay="120ms" />
            <Dot delay="240ms" />
          </div>
        ) : (
          <MarkdownMessage text={text} variant="assistant" />
        )}
      </div>
    </div>
  );
}

function ChatThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-1 py-2">
      <div className="flex justify-end">
        <div className="h-16 w-[72%] animate-pulse rounded-2xl bg-ink-200/70" />
      </div>
      <div className="flex justify-start">
        <div className="h-24 w-[78%] animate-pulse rounded-2xl bg-ink-100" />
      </div>
      <div className="flex justify-end">
        <div className="h-12 w-[52%] animate-pulse rounded-2xl bg-ink-200/60" />
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
