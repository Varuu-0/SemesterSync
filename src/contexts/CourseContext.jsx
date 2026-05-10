import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const CourseContext = createContext(null);

const COURSE_COLORS = [
  'var(--course-1)',
  'var(--course-2)',
  'var(--course-3)',
  'var(--course-4)',
  'var(--course-5)',
  'var(--course-6)',
];

export function CourseProvider({ children }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [completedTasks, setCompletedTasks] = useState({});
  
  const storageKey = user ? `semestersync_courses_${user.id}` : 'semestersync_courses';
  const completedStorageKey = user ? `semestersync_completed_${user.id}` : 'semestersync_completed';

  // Restore from localStorage when user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCourses(JSON.parse(stored));
      } else {
        setCourses([]); // Clear if new user has no data
      }

      const storedCompleted = localStorage.getItem(completedStorageKey);
      if (storedCompleted) {
        setCompletedTasks(JSON.parse(storedCompleted));
      } else {
        setCompletedTasks({});
      }
    } catch {
      setCourses([]);
      setCompletedTasks({});
    }
  }, [storageKey, completedStorageKey]);

  // Persist to localStorage
  useEffect(() => {
    if (courses.length > 0 || localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, JSON.stringify(courses));
    }
  }, [courses, storageKey]);

  useEffect(() => {
    if (Object.keys(completedTasks).length > 0 || localStorage.getItem(completedStorageKey)) {
      localStorage.setItem(completedStorageKey, JSON.stringify(completedTasks));
    }
  }, [completedTasks, completedStorageKey]);

  const addCourse = useCallback((data) => {
    const id = `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const colorIndex = courses.length % COURSE_COLORS.length;
    const course = {
      id,
      ...data,
      color: COURSE_COLORS[colorIndex],
      colorRaw: ['#6366f1', '#f472b6', '#34d399', '#fbbf24', '#f97316', '#06b6d4'][colorIndex],
      addedAt: new Date().toISOString(),
    };
    setCourses((prev) => [...prev, course]);
    return course;
  }, [courses.length]);

  const removeCourse = useCallback((id) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearCourses = useCallback(() => {
    setCourses([]);
    setCompletedTasks({});
  }, []);

  const toggleTaskCompletion = useCallback((taskId) => {
    setCompletedTasks((prev) => {
      const next = { ...prev };
      if (next[taskId]) {
        delete next[taskId];
      } else {
        next[taskId] = true;
      }
      return next;
    });
  }, []);

  // Get all events across all courses, flattened
  const getAllEvents = useCallback(() => {
    const events = [];
    courses.forEach((course) => {
      // Assignments
      (course.assignments || []).forEach((a) => {
        const eventId = `${course.id}-${a.name}`;
        events.push({
          id: eventId,
          courseId: course.id,
          courseName: course.courseName,
          courseCode: course.courseCode,
          color: course.color,
          colorRaw: course.colorRaw,
          title: a.name,
          type: a.type,
          date: a.dueDate,
          dateRaw: a.dueDateRaw,
          weight: a.weight,
          description: a.description,
          completed: !!completedTasks[eventId],
        });
      });
      // Important dates (with deduplication)
      (course.importantDates || []).forEach((d) => {
        // Check if this date is already covered by an assignment to avoid double-entries
        const isDuplicate = events.some((e) => {
          if (e.courseId !== course.id || e.date !== d.date || !e.date) return false;
          
          const title1 = e.title.toLowerCase();
          const title2 = d.event.toLowerCase();
          
          // Match if titles are exact, or if one is a significant substring of the other
          return title1 === title2 || title1.includes(title2) || title2.includes(title1);
        });

        if (!isDuplicate) {
          const eventId = `${course.id}-${d.event}`;
          events.push({
            id: eventId,
            courseId: course.id,
            courseName: course.courseName,
            courseCode: course.courseCode,
            color: course.color,
            colorRaw: course.colorRaw,
            title: d.event,
            type: d.type,
            date: d.date,
            dateRaw: d.dateRaw,
            weight: null,
            description: '',
            completed: !!completedTasks[eventId],
          });
        }
      });
    });
    return events.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [courses, completedTasks]);

  // Get events for a specific date (YYYY-MM-DD)
  const getEventsForDate = useCallback((dateStr) => {
    return getAllEvents().filter((e) => e.date === dateStr);
  }, [getAllEvents]);

  // Get events for a week starting at weekStart (Date object)
  const getWeekEvents = useCallback((weekStart) => {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return getAllEvents().filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date + 'T00:00:00');
      return d >= start && d < end;
    });
  }, [getAllEvents]);

  const value = {
    courses,
    completedTasks,
    addCourse,
    removeCourse,
    clearCourses,
    toggleTaskCompletion,
    getAllEvents,
    getEventsForDate,
    getWeekEvents,
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourses() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourses must be used within a CourseProvider');
  }
  return context;
}
