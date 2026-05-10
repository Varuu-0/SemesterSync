import { useMemo } from 'react';
import { useCourses } from '../contexts/CourseContext';
import { analyzeBurnout, getSemesterSummary } from '../utils/burnoutDetector';
import { Flame, Skull, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const STRESS_STAGES = [
  { min: 0, label: 'Chill', emoji: '😎', desc: 'Smooth sailing', color: 'bg-green-500' },
  { min: 5, label: 'Busy', emoji: '😰', desc: 'Getting real', color: 'bg-amber-500' },
  { min: 8, label: 'Critical', emoji: '🔥', desc: 'Danger zone', color: 'bg-orange-500' },
  { min: 11, label: 'CATASTROPHIC', emoji: '💀', desc: 'Academic extinction event', color: 'bg-destructive' },
];

function getStage(score) {
  for (let i = STRESS_STAGES.length - 1; i >= 0; i--) {
    if (score >= STRESS_STAGES[i].min) return STRESS_STAGES[i];
  }
  return STRESS_STAGES[0];
}

export default function DoomWeekDetector() {
  const { getAllEvents, courses } = useCourses();
  const events = useMemo(() => getAllEvents(), [getAllEvents]);
  const analysis = useMemo(() => analyzeBurnout(events), [events]);
  const summary = useMemo(() => getSemesterSummary(analysis), [analysis]);

  if (courses.length === 0 || analysis.weekScores.length === 0) return null;

  const { peakWeek, doomWeeks, warnings } = analysis;
  if (!peakWeek) return null;

  const peakStage = getStage(peakWeek.score);
  const isDoom = peakWeek.severity.level === 'doom';
  const meterPercent = Math.min((peakWeek.score / 20) * 100, 100);

  return (
    <Card className={`overflow-hidden shadow-xl animate-in slide-in-from-bottom-4 duration-500 transition-colors ${
      isDoom ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'
    }`} id="doom-detector">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
            isDoom ? 'bg-destructive/20 text-destructive animate-pulse' : 'bg-primary/10 text-primary'
          }`}>
            {isDoom ? <Skull size={24} /> : <TrendingUp size={24} />}
          </div>
          <div className="space-y-1">
            <CardTitle className={`text-xl sm:text-2xl font-bold ${isDoom ? 'text-destructive' : 'text-foreground'}`}>
              {isDoom ? '💀 DOOM WEEK DETECTED' : '📊 Semester Stress Report'}
            </CardTitle>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{summary}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Stress meter */}
        <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/50">
          <div className="flex justify-between text-xs sm:text-sm font-medium text-muted-foreground px-1">
            <span>Chill 😎</span>
            <span>Busy 😰</span>
            <span>Critical 🔥</span>
            <span>DOOM 💀</span>
          </div>
          
          <div className="relative h-4 rounded-full bg-muted overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out ${peakStage.color}`}
              style={{ width: `${meterPercent}%` }}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
            <span className="font-medium">Peak Stress: <strong className="text-foreground">Week of {peakWeek.weekStart}</strong></span>
            <span className="text-muted-foreground">Score: <strong className="text-foreground">{peakWeek.score}</strong> · {peakWeek.eventCount} events</span>
          </div>
        </div>

        {/* Doom weeks list */}
        {warnings.length > 0 && (
          <div className="space-y-4">
            <h4 className="flex items-center gap-2 font-bold text-foreground">
              <AlertTriangle size={16} className={doomWeeks.length > 0 ? "text-destructive" : "text-amber-500"} />
              {doomWeeks.length > 0 ? 'Danger Weeks' : 'Busy Weeks'}
            </h4>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {warnings.slice(0, 6).map((w, i) => {
                const stage = getStage(w.score);
                const date = new Date(w.weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return (
                  <Card key={i} className="border-t-4 bg-background/50 hover:bg-muted/20 transition-colors shadow-sm" style={{ borderTopColor: w.severity.color }}>
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                        <span className="font-semibold text-sm">{date}</span>
                        <Badge variant="outline" className="border-transparent" style={{ backgroundColor: w.severity.color + '20', color: w.severity.color }}>
                          {stage.emoji} {w.severity.label}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {w.events.slice(0, 3).map((e, j) => (
                          <div key={j} className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e.colorRaw || w.severity.color }} />
                            <span className="font-medium text-foreground">{e.courseCode || e.courseName}:</span> {e.title}
                          </div>
                        ))}
                        {w.events.length > 3 && (
                          <div className="text-[10px] font-medium text-muted-foreground pt-1 italic">
                            +{w.events.length - 3} more events
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
