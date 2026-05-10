"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders assistant (and optionally user) chat text with GitHub-flavored markdown.
 */
export function MarkdownMessage({
  text,
  variant = "assistant",
}: {
  text: string;
  variant?: "assistant" | "user";
}) {
  const linkClass =
    variant === "assistant"
      ? "font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:opacity-90"
      : "font-medium text-primary-fg underline underline-offset-2";

  return (
    <div className="markdown-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 [&:only-child]:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-4">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isFence = Boolean(className?.startsWith("language-"));
            return isFence ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-ink-100 p-3 text-xs leading-relaxed [&>code]:bg-transparent [&>code]:p-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-ink-300 pl-3 text-ink-600">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <p className="mb-2 mt-1 font-semibold">{children}</p>
          ),
          h2: ({ children }) => (
            <p className="mb-2 mt-1 font-semibold">{children}</p>
          ),
          h3: ({ children }) => (
            <p className="mb-1 mt-1 text-sm font-semibold">{children}</p>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
