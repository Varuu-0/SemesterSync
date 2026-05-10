"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "./supabase";
import type { Course, Deadline } from "./types";

/**
 * Subscribe to a user's courses with realtime updates.
 * On any postgres_changes event, we just refetch the full list — simple and
 * fine at MVP scale; revisit if courses ever exceed a few hundred rows.
 */
export function useCourses(userId: string | undefined) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCourses([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabase = supabaseBrowser();

    async function load() {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", userId!)
        .order("name", { ascending: true });
      if (!mounted) return;
      if (error) {
        console.error(error);
        setCourses([]);
      } else {
        setCourses((data ?? []) as Course[]);
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`courses:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "courses",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const removeLocal = useCallback((id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { courses, loading, removeLocal };
}

export function useDeadlines(userId: string | undefined) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setDeadlines([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabase = supabaseBrowser();

    async function load() {
      const { data, error } = await supabase
        .from("deadlines")
        .select("*")
        .eq("user_id", userId!);
      if (!mounted) return;
      if (error) {
        console.error(error);
        setDeadlines([]);
      } else {
        setDeadlines((data ?? []) as Deadline[]);
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`deadlines:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deadlines",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Optimistic local patch — used for snappy checkbox toggles. The realtime
  // subscription will reconcile from server state shortly after.
  const mutateLocal = useCallback(
    (id: string, patch: Partial<Deadline>) => {
      setDeadlines((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
    },
    []
  );

  const removeByCourseIdLocal = useCallback((courseId: string) => {
    setDeadlines((prev) => prev.filter((d) => d.course_id !== courseId));
  }, []);

  return { deadlines, loading, mutateLocal, removeByCourseIdLocal };
}

export function useCoursesById(courses: Course[]): Record<string, Course> {
  return useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c])),
    [courses]
  );
}

export function getAllEvents(deadlines: Deadline[]) {
  return [...deadlines].sort(
    (a, b) => +new Date(a.due_at) - +new Date(b.due_at)
  );
}
