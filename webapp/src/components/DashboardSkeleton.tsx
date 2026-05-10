'use client'

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl p-4">
            <div className="h-3 w-24 animate-skeleton rounded bg-white/10" />
            <div className="mt-4 h-9 w-16 animate-skeleton rounded-md bg-white/[0.07]" />
            <div className="mt-3 h-3 w-full max-w-[180px] animate-skeleton rounded bg-white/5" />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="h-3 w-20 animate-skeleton rounded bg-white/10" />
        <div className="h-[320px] animate-skeleton rounded-[24px] border border-white/10 bg-white/[0.02]" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-xl p-4">
            <div className="h-3 w-32 animate-skeleton rounded bg-white/10" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-3 w-16 shrink-0 animate-skeleton rounded bg-white/5" />
                  <div className="h-2 flex-1 animate-skeleton rounded-full bg-white/5" />
                  <div className="h-3 w-6 shrink-0 animate-skeleton rounded bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="h-3 w-24 animate-skeleton rounded bg-white/10" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
              <div className="h-5 w-5 shrink-0 animate-skeleton rounded bg-white/5" />
              <div className="h-2.5 w-2.5 shrink-0 animate-skeleton rounded-full bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-[55%] max-w-sm animate-skeleton rounded bg-white/[0.07]" />
                <div className="h-3 w-28 animate-skeleton rounded bg-white/5" />
              </div>
              <div className="h-8 w-16 shrink-0 animate-skeleton rounded bg-white/5" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
