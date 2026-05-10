import { useMemo } from 'react';
import { useCourses } from '../contexts/CourseContext';
import { CheckCircle2, Circle, AlertTriangle, Clock, Flame, CalendarClock, Info } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function getDaysUntil(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + 'T00:00:00');
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

function getUrgencyClass(days) {
  if (days < 0) return 'text-destructive bg-destructive/10 border-destructive/20';
  if (days <= 2) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  if (days <= 7) return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  return 'text-muted-foreground bg-muted border-border';
}

function getUrgencyLabel(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today!';
  if (days === 1) return 'Due tomorrow';
  return `${days}d left`;
}

function getSuggestedAction(event, days) {
  if (days < 0) return `Submit ${event.title} ASAP`;
  if (days === 0) return `Finalize and submit ${event.title}`;
  if (days === 1) return `Final review of ${event.title}`;
  if (days <= 3) return `Focus on completing ${event.title}`;
  if (days <= 7) return `Start working on ${event.title}`;
  return `Plan ahead for ${event.title}`;
}

export default function Planner() {
  const { getAllEvents, courses, toggleTaskCompletion } = useCourses();

  const { thisWeek, nextWeek, upcoming } = useMemo(() => {
    const events = getAllEvents().filter((e) => e.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endThisWeek = new Date(today);
    endThisWeek.setDate(endThisWeek.getDate() + (7 - today.getDay()));

    const endNextWeek = new Date(endThisWeek);
    endNextWeek.setDate(endNextWeek.getDate() + 7);

    const thisWeek = [];
    const nextWeek = [];
    const upcoming = [];

    events.forEach((e) => {
      const d = new Date(e.date + 'T00:00:00');
      const days = getDaysUntil(e.date);
      const item = { ...e, daysUntil: days, urgencyClass: getUrgencyClass(days) };

      if (days < 0 || d <= endThisWeek) thisWeek.push(item);
      else if (d <= endNextWeek) nextWeek.push(item);
      else upcoming.push(item);
    });

    const sort = (a, b) => a.daysUntil - b.daysUntil;
    thisWeek.sort(sort);
    nextWeek.sort(sort);
    upcoming.sort(sort);

    return { thisWeek, nextWeek, upcoming };
  }, [getAllEvents]);

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <CalendarClock size={32} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Smart Weekly Planner</h2>
        <p className="text-muted-foreground max-w-md">Upload and extract your syllabi to generate a personalized task planner.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in slide-in-from-bottom-4 duration-500" id="planner-view">
      <div className="flex items-center gap-3 pb-2 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarClock size={20} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Smart Weekly Planner</h2>
      </div>

      <div className="grid gap-8">
        <PlannerSection title="This Week" icon={<Flame size={18} className="text-destructive" />} items={thisWeek} emptyMsg="Nothing due this week! 🎉" onToggle={toggleTaskCompletion} />
        <PlannerSection title="Next Week" icon={<Clock size={18} className="text-amber-500" />} items={nextWeek} emptyMsg="Clear next week too!" onToggle={toggleTaskCompletion} />
        {upcoming.length > 0 && (
          <PlannerSection title="Upcoming" icon={<CalendarClock size={18} className="text-primary" />} items={upcoming.slice(0, 10)} emptyMsg="" onToggle={toggleTaskCompletion} />
        )}
      </div>
    </div>
  );
}

function PlannerSection({ title, icon, items, emptyMsg, onToggle }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-foreground font-semibold">
        {icon}
        <h3 className="text-lg">{title}</h3>
        <Badge variant="secondary" className="ml-2 font-mono">{items.length}</Badge>
      </div>
      
      {items.length === 0 ? (
        <Card className="bg-muted/30 border-dashed border-muted-foreground/30">
          <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground italic">
            {emptyMsg}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item, i) => (
            <Card 
              key={i} 
              className={`overflow-hidden transition-all duration-200 border-l-4 hover:shadow-md ${item.completed ? 'opacity-60 saturate-50' : 'bg-card'}`}
              style={{ borderLeftColor: item.colorRaw }}
            >
              <div className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="flex items-start sm:items-center gap-4 flex-1">
                  <button 
                    onClick={() => onToggle(item.id)}
                    className="mt-0.5 sm:mt-0 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  >
                    {item.completed ? (
                      <CheckCircle2 size={22} className="text-green-500" />
                    ) : (
                      <Circle size={22} />
                    )}
                  </button>
                  <div className="flex flex-col gap-1">
                    <span className={`font-semibold ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {item.courseCode || item.courseName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:ml-auto pl-10 sm:pl-0">
                  <Badge variant="outline" className={`font-medium ${item.urgencyClass}`}>
                    {getUrgencyLabel(item.daysUntil)}
                  </Badge>
                  {item.weight && (
                    <Badge variant="secondary" className="font-mono text-xs text-muted-foreground bg-muted/50">
                      {item.weight}%
                    </Badge>
                  )}
                </div>
              </div>
              
              {!item.completed && (
                <div className="bg-muted/30 px-4 py-2 border-t border-border/50 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Info size={14} className="text-primary/70" />
                  <span>{getSuggestedAction(item, item.daysUntil)}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
