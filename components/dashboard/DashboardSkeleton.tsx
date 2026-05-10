/** Loading placeholders matching dashboard grid layout to reduce CLS. */

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-ink-200/80" />
            <div className="mt-4 h-9 w-16 animate-pulse rounded-md bg-ink-200/70" />
            <div className="mt-3 h-3 w-full max-w-[180px] animate-pulse rounded bg-ink-100" />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="h-3 w-20 animate-pulse rounded bg-ink-200/70" />
        <div className="h-[320px] animate-pulse rounded-2xl border border-ink-200 bg-ink-50/50" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-ink-200 bg-surface p-4 shadow-soft"
          >
            <div className="h-3 w-32 animate-pulse rounded bg-ink-200/70" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-3 w-16 shrink-0 animate-pulse rounded bg-ink-100" />
                  <div className="h-2 flex-1 animate-pulse rounded-full bg-ink-100" />
                  <div className="h-3 w-6 shrink-0 animate-pulse rounded bg-ink-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-ink-200/70" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-ink-200 bg-surface px-3 py-3"
            >
              <div className="h-5 w-5 shrink-0 animate-pulse rounded bg-ink-100" />
              <div className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-ink-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-[55%] max-w-sm animate-pulse rounded bg-ink-200/60" />
                <div className="h-3 w-28 animate-pulse rounded bg-ink-100" />
              </div>
              <div className="h-8 w-16 shrink-0 animate-pulse rounded bg-ink-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
