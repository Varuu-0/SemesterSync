import type { Deadline } from "./types";

export type BurnoutSeverity = "chill" | "busy" | "critical" | "doom";

export type BurnoutWeek = {
  isoWeek: string;
  startDate: string;
  endDate: string;
  score: number;
  severity: BurnoutSeverity;
  deadlines: Deadline[];
};

export type BurnoutSummary = {
  score: number;
  peakScore: number;
  meterPercent: number;
  severity: BurnoutSeverity;
  label: string;
  emoji: string;
  peakWeek: BurnoutWeek | null;
  dangerWeeks: BurnoutWeek[];
  allWeeks: BurnoutWeek[];
};

const TYPE_WEIGHTS: Record<string, number> = {
  exam: 5,
  project: 4,
  assignment: 2,
  quiz: 2,
  lab: 2,
  presentation: 3,
  reading: 1,
  other: 1,
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function endOfWeek(d: Date): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isoWeekKey(d: Date): string {
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const diff = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.floor((diff + jan1.getDay()) / 7) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function severityForScore(score: number): BurnoutSeverity {
  if (score > 10) return "doom";
  if (score > 7) return "critical";
  if (score > 4) return "busy";
  return "chill";
}

function severityMeta(severity: BurnoutSeverity): { label: string; emoji: string } {
  switch (severity) {
    case "doom":
      return { label: "DOOM", emoji: "💀" };
    case "critical":
      return { label: "Critical", emoji: "🚨" };
    case "busy":
      return { label: "Busy", emoji: "😵" };
    default:
      return { label: "Chill", emoji: "😌" };
  }
}

export function analyzeBurnout(deadlines: Deadline[], now: Date = new Date()): BurnoutSummary {
  const incomplete = deadlines.filter((d) => !d.completed_at);
  const buckets = new Map<string, Deadline[]>();
  for (const d of incomplete) {
    const due = new Date(d.due_at);
    if (Number.isNaN(due.getTime())) continue;
    const wk = isoWeekKey(startOfWeek(due));
    const list = buckets.get(wk) ?? [];
    list.push(d);
    buckets.set(wk, list);
  }

  const allWeeks: BurnoutWeek[] = Array.from(buckets.entries())
    .map(([isoWeek, items]) => {
      const first = new Date(items[0].due_at);
      const start = startOfWeek(first);
      const end = endOfWeek(first);
      const score = items.reduce((sum, d) => {
        const base = TYPE_WEIGHTS[d.category ?? "other"] ?? 1;
        const due = new Date(d.due_at);
        const days = Math.max(0, Math.floor((due.getTime() - now.getTime()) / 86400000));
        const urgencyBonus = days <= 2 ? 2 : days <= 7 ? 1 : 0;
        return sum + base + urgencyBonus;
      }, 0);
      return {
        isoWeek,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        score,
        severity: severityForScore(score),
        deadlines: items.sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at)),
      };
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const nextFourWeeks = allWeeks.filter((w) => {
    const start = new Date(w.startDate).getTime();
    const diffDays = (start - now.getTime()) / 86400000;
    return diffDays >= -7 && diffDays <= 28;
  });
  const score = nextFourWeeks.reduce((sum, w) => sum + w.score, 0);
  const peakWeek = allWeeks.length
    ? allWeeks.reduce((max, w) => (w.score > max.score ? w : max), allWeeks[0])
    : null;
  const peakScore = peakWeek?.score ?? 0;
  const severity = severityForScore(peakScore);
  const dangerWeeks = allWeeks.filter((w) => w.severity === "critical" || w.severity === "doom");
  const meta = severityMeta(severity);
  const meterPercent = Math.min(100, (peakScore / 20) * 100);

  return {
    score,
    peakScore,
    meterPercent,
    severity,
    label: meta.label,
    emoji: meta.emoji,
    peakWeek,
    dangerWeeks,
    allWeeks,
  };
}
