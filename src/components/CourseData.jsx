import { useState } from 'react';
import {
  BookOpen, Calendar, Clock, FileText, ChevronDown, ChevronRight,
  AlertTriangle, PieChart, User, MapPin, Sparkles, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_ICONS = {
  exam: '📝',
  assignment: '📋',
  quiz: '❓',
  project: '🏗️',
  lab: '🔬',
  reading: '📖',
  presentation: '🎤',
  other: '📌',
};

const TYPE_COLORS = {
  exam: 'text-destructive border-destructive',
  assignment: 'text-blue-500 border-blue-500',
  quiz: 'text-amber-500 border-amber-500',
  project: 'text-green-500 border-green-500',
  lab: 'text-cyan-500 border-cyan-500',
  reading: 'text-purple-500 border-purple-500',
  presentation: 'text-pink-500 border-pink-500',
  other: 'text-slate-500 border-slate-500',
};

function formatDate(isoDate) {
  if (!isoDate) return null;
  try {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export default function CourseData({ data }) {
  const [expandedSections, setExpandedSections] = useState(
    new Set(['overview', 'assignments', 'grades'])
  );

  if (!data) return null;

  const toggleSection = (section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const totalWeight = data.gradeBreakdown.reduce((sum, g) => sum + g.weight, 0);

  return (
    <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500" id="course-data-section">
      {/* Course Header Card */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-xl">
        <div className="absolute top-0 right-0 p-4">
          <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            <Sparkles size={12} />
            AI Extracted
          </Badge>
        </div>
        
        <CardContent className="pt-8 pb-6 px-6 sm:px-8 space-y-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{data.courseName}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground">
              {data.instructor && (
                <div className="flex items-center gap-1.5"><User size={16} />{data.instructor}</div>
              )}
              {data.semester && (
                <div className="flex items-center gap-1.5"><Calendar size={16} />{data.semester}</div>
              )}
              {data.location && (
                <div className="flex items-center gap-1.5"><MapPin size={16} />{data.location}</div>
              )}
              {data.officeHours && (
                <div className="flex items-center gap-1.5"><Clock size={16} />{data.officeHours}</div>
              )}
            </div>
            {data.description && (
              <p className="text-muted-foreground/80 leading-relaxed mt-4 max-w-3xl text-sm md:text-base">
                {data.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">{data.assignments.length}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Assignments</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">{data.importantDates.length}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Key Dates</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">{data.lectureTopics.length}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Topics</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-foreground">{data.gradeBreakdown.length}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Components</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="space-y-4">
        {/* Grade Breakdown */}
        {data.gradeBreakdown.length > 0 && (
          <Section
            id="grades" title="Grade Breakdown" icon={<PieChart size={18} />}
            count={`${totalWeight}%`} expanded={expandedSections.has('grades')} onToggle={() => toggleSection('grades')}
          >
            <div className="space-y-3 pt-2">
              {data.gradeBreakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/60 group-hover:bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(item.weight, 100)}%` }}
                    />
                  </div>
                  <span className="w-1/3 sm:w-1/4 text-sm font-medium truncate">{item.component}</span>
                  <span className="w-12 text-right text-sm font-bold font-mono">{item.weight}%</span>
                </div>
              ))}
              {totalWeight !== 100 && totalWeight > 0 && (
                <div className="flex items-center gap-2 p-3 mt-4 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle size={16} />
                  <span>Weights total {totalWeight}% (expected 100%)</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Assignments & Deadlines */}
        {data.assignments.length > 0 && (
          <Section
            id="assignments" title="Assignments & Deadlines" icon={<FileText size={18} />}
            count={data.assignments.length} expanded={expandedSections.has('assignments')} onToggle={() => toggleSection('assignments')}
          >
            <div className="grid gap-3 pt-2">
              {data.assignments.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <span className="text-lg">{TYPE_ICONS[item.type] || TYPE_ICONS.other}</span>
                    <span className="font-medium text-sm truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 self-start sm:self-auto pl-8 sm:pl-0">
                    <Badge variant="outline" className={`capitalize font-normal ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>
                      {item.type}
                    </Badge>
                    {(item.dueDate || item.dueDateRaw) && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded-md">
                        <Calendar size={12} />
                        {formatDate(item.dueDate) || item.dueDateRaw}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Important Dates */}
        {data.importantDates.length > 0 && (
          <Section
            id="dates" title="Important Dates" icon={<AlertCircle size={18} />}
            count={data.importantDates.length} expanded={expandedSections.has('dates')} onToggle={() => toggleSection('dates')}
          >
            <div className="grid gap-3 pt-2">
              {data.importantDates.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <span className="font-medium text-sm">{item.event}</span>
                  {(item.date || item.dateRaw) && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      <Calendar size={12} />
                      {formatDate(item.date) || item.dateRaw}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Lecture Topics */}
        {data.lectureTopics.length > 0 && (
          <Section
            id="topics" title="Lecture Topics" icon={<BookOpen size={18} />}
            count={data.lectureTopics.length} expanded={expandedSections.has('topics')} onToggle={() => toggleSection('topics')}
          >
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              {data.lectureTopics.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium leading-relaxed">{item.topic || 'Untitled Topic'}</span>
                    {(item.date || item.dateRaw || item.week) && (
                      <span className="text-xs text-muted-foreground">
                        {item.week ? `Week ${item.week}` : ''}
                        {item.week && (item.date || item.dateRaw) ? ' • ' : ''}
                        {item.date || item.dateRaw || ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, count, children, expanded, onToggle }) {
  return (
    <Card className="overflow-hidden border-border bg-background shadow-sm transition-all duration-200 hover:shadow-md">
      <button
        className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 text-foreground font-semibold">
          <div className="text-primary">{icon}</div>
          <span>{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="ml-2 font-mono text-xs">{count}</Badge>
          )}
        </div>
        <div className="text-muted-foreground transition-transform duration-200">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </Card>
  );
}
