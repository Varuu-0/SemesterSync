import Link from "next/link";

export function DashboardEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-8 shadow-soft sm:p-12">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex justify-center text-primary">
          <EmptyCalendarIllustration />
        </div>
        <h3 className="text-lg font-semibold text-ink-900">
          Your semester calendar is empty
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Add a course and upload its syllabus PDF. We&apos;ll scan it for every
          assignment, quiz, and exam — then track them here so nothing slips
          through the cracks.
        </p>
        <Link
          href="/dashboard/courses"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-fg shadow-soft transition hover:opacity-95"
        >
          Get started — add a course
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <p className="mt-4 text-xs text-ink-500">
          Tip: You can manage syllabi anytime from the Courses tab.
        </p>
      </div>
    </div>
  );
}

function EmptyCalendarIllustration() {
  return (
    <svg
      width="160"
      height="140"
      viewBox="0 0 160 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="18"
        y="28"
        width="124"
        height="96"
        rx="12"
        stroke="currentColor"
        strokeWidth="2"
        className="text-ink-300"
      />
      <path
        d="M18 48h124"
        stroke="currentColor"
        strokeWidth="2"
        className="text-ink-200"
      />
      <rect x="34" y="36" width="28" height="8" rx="2" fill="currentColor" className="text-ink-200" />
      <circle cx="124" cy="40" r="4" fill="currentColor" className="text-accent" opacity="0.85" />
      <rect x="34" y="58" width="92" height="6" rx="2" fill="currentColor" className="text-ink-200/80" />
      <rect x="34" y="72" width="72" height="6" rx="2" fill="currentColor" className="text-ink-200/50" />
      <rect x="34" y="88" width="56" height="22" rx="6" fill="currentColor" className="text-primary opacity-25" />
      <path
        d="M46 99l6 6 12-14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />
      <circle cx="130" cy="22" r="16" fill="currentColor" className="text-primary opacity-15" />
      <path
        d="M124 22h12M130 16v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}
