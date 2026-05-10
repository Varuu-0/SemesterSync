import type { Course, Deadline, DeadlineCategory } from "./types";

export type WeekBucket = {
  start: Date;
  end: Date;
  label: string;
  count: number;
};

export type CourseWorkload = {
  course: Course;
  total: number;
  upcoming: number;
  missed: number;
  completed: number;
};

export type CategoryStat = {
  category: DeadlineCategory | "uncategorized";
  count: number;
};

export type DashboardMetrics = {
  totalCount: number;
  completedCount: number;
  completedThisWeek: number;

  upcoming: Deadline[]; // future + incomplete, asc by date
  upcomingThisWeek: Deadline[];
  upcomingNext30: Deadline[];

  missed: Deadline[]; // past + incomplete, desc by date (most recent first)
  completed: Deadline[]; // any with completed_at, desc by completed_at

  /** Course with the most upcoming-incomplete deadlines in the next 30 days. */
  heaviestCourse: { course: Course; count: number } | null;

  /** Completion rate of decided-by-now items: completed / (completed + missed). */
  completionRate: number;

  /** Counts per ISO-week starting Sunday for the next 4 weeks. */
  workloadByWeek: WeekBucket[];

  /** All courses ranked by upcoming load. */
  workloadByCourse: CourseWorkload[];

  /** Category distribution across upcoming-next-30 deadlines. */
  categoryBreakdown: CategoryStat[];

  /** The very next incomplete deadline, if any. */
  nextDeadline: Deadline | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeMetrics(
  courses: Course[],
  deadlines: Deadline[],
  now: Date = new Date()
): DashboardMetrics {
  const today = startOfDay(now);
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);

  // Partition all deadlines once.
  const completed: Deadline[] = [];
  const missed: Deadline[] = [];
  const upcoming: Deadline[] = [];

  for (const d of deadlines) {
    const due = new Date(d.due_at);
    if (d.completed_at) {
      completed.push(d);
    } else if (due < today) {
      missed.push(d);
    } else {
      upcoming.push(d);
    }
  }

  upcoming.sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  missed.sort((a, b) => +new Date(b.due_at) - +new Date(a.due_at));
  completed.sort((a, b) => {
    const ax = a.completed_at ?? a.due_at;
    const bx = b.completed_at ?? b.due_at;
    return +new Date(bx) - +new Date(ax);
  });

  const upcomingThisWeek = upcoming.filter((d) => new Date(d.due_at) <= in7);
  const upcomingNext30 = upcoming.filter((d) => new Date(d.due_at) <= in30);

  const sevenDaysAgo = addDays(today, -7);
  const completedThisWeek = completed.filter(
    (d) => d.completed_at && new Date(d.completed_at) >= sevenDaysAgo
  ).length;

  // Heaviest course (next 30 days).
  const courseLoad = new Map<string, number>();
  for (const d of upcomingNext30) {
    courseLoad.set(d.course_id, (courseLoad.get(d.course_id) ?? 0) + 1);
  }
  let heaviestCourse: DashboardMetrics["heaviestCourse"] = null;
  for (const c of courses) {
    const count = courseLoad.get(c.id) ?? 0;
    if (count > 0 && (!heaviestCourse || count > heaviestCourse.count)) {
      heaviestCourse = { course: c, count };
    }
  }

  // Workload by week (next 4 weeks, starting today).
  const workloadByWeek: WeekBucket[] = [];
  for (let i = 0; i < 4; i++) {
    const start = addDays(today, i * 7);
    const end = addDays(start, 7);
    const count = upcoming.filter((d) => {
      const due = new Date(d.due_at);
      return due >= start && due < end;
    }).length;
    workloadByWeek.push({
      start,
      end,
      label:
        i === 0
          ? "This week"
          : i === 1
            ? "Next week"
            : `Wk of ${start.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}`,
      count,
    });
  }

  // Workload per course (across all states for context).
  const workloadByCourse: CourseWorkload[] = courses
    .map((course) => {
      const all = deadlines.filter((d) => d.course_id === course.id);
      return {
        course,
        total: all.length,
        upcoming: all.filter(
          (d) => !d.completed_at && new Date(d.due_at) >= today
        ).length,
        missed: all.filter(
          (d) => !d.completed_at && new Date(d.due_at) < today
        ).length,
        completed: all.filter((d) => !!d.completed_at).length,
      };
    })
    .sort((a, b) => b.upcoming - a.upcoming || b.total - a.total);

  // Category breakdown across upcomingNext30.
  const catCount = new Map<string, number>();
  for (const d of upcomingNext30) {
    const k = d.category ?? "uncategorized";
    catCount.set(k, (catCount.get(k) ?? 0) + 1);
  }
  const categoryBreakdown: CategoryStat[] = Array.from(catCount.entries())
    .map(([category, count]) => ({
      category: category as CategoryStat["category"],
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const decidedTotal = completed.length + missed.length;
  const completionRate = decidedTotal === 0 ? 1 : completed.length / decidedTotal;

  return {
    totalCount: deadlines.length,
    completedCount: completed.length,
    completedThisWeek,
    upcoming,
    upcomingThisWeek,
    upcomingNext30,
    missed,
    completed,
    heaviestCourse,
    completionRate,
    workloadByWeek,
    workloadByCourse,
    categoryBreakdown,
    nextDeadline: upcoming[0] ?? null,
  };
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}
