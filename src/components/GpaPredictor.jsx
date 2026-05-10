import { useState, useMemo } from 'react';
import { useCourses } from '../contexts/CourseContext';
import { Calculator, ChevronDown, ChevronRight, RefreshCw, Percent } from 'lucide-react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const GRADE_THRESHOLDS = [
  { min: 93, letter: 'A', color: 'bg-green-500', text: 'text-green-500' },
  { min: 90, letter: 'A-', color: 'bg-green-400', text: 'text-green-400' },
  { min: 87, letter: 'B+', color: 'bg-emerald-500', text: 'text-emerald-500' },
  { min: 83, letter: 'B', color: 'bg-blue-500', text: 'text-blue-500' },
  { min: 80, letter: 'B-', color: 'bg-indigo-400', text: 'text-indigo-400' },
  { min: 77, letter: 'C+', color: 'bg-amber-500', text: 'text-amber-500' },
  { min: 73, letter: 'C', color: 'bg-orange-400', text: 'text-orange-400' },
  { min: 70, letter: 'C-', color: 'bg-orange-500', text: 'text-orange-500' },
  { min: 67, letter: 'D+', color: 'bg-red-400', text: 'text-red-400' },
  { min: 60, letter: 'D', color: 'bg-red-500', text: 'text-red-500' },
  { min: 0, letter: 'F', color: 'bg-destructive', text: 'text-destructive' },
];

function getLetterGrade(percent) {
  if (percent === null || isNaN(percent)) return { letter: 'N/A', color: 'bg-muted', text: 'text-muted-foreground' };
  for (const g of GRADE_THRESHOLDS) {
    if (percent >= g.min) return g;
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
}

export default function GpaPredictor() {
  const { courses } = useCourses();
  const [expanded, setExpanded] = useState(true);
  const [scores, setScores] = useState({});

  const coursesWithGrades = useMemo(
    () => courses.filter((c) => c.gradeBreakdown && c.gradeBreakdown.length > 0),
    [courses]
  );

  if (coursesWithGrades.length === 0) return null;

  const updateScore = (courseId, component, value) => {
    const key = `${courseId}::${component}`;
    setScores((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : Number(value)
    }));
  };

  const clearScores = () => setScores({});

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm transition-all duration-200 animate-in slide-in-from-bottom-4" id="gpa-predictor">
      <button 
        className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors text-left" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calculator size={20} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground tracking-tight">Grade Calculator</h3>
            <p className="text-sm text-muted-foreground">Input your assignment grades to calculate your course grade</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(scores).some(k => scores[k] !== undefined) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs z-10 hidden sm:flex"
              onClick={(e) => { e.stopPropagation(); clearScores(); }}
            >
              <RefreshCw size={14} className="mr-1.5" /> Clear All
            </Button>
          )}
          <div className="text-muted-foreground">
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </div>
      </button>

      {expanded && (
        <CardContent className="p-4 sm:p-6 space-y-8 border-t border-border/50 bg-background/50 animate-in slide-in-from-top-2">
          {coursesWithGrades.map((course) => {
            const totalWeight = course.gradeBreakdown.reduce((s, g) => s + g.weight, 0);
            
            let earnedWeight = 0;
            let enteredWeight = 0;
            
            course.gradeBreakdown.forEach((g) => {
              const key = `${course.id}::${g.component}`;
              const score = scores[key];
              if (score !== undefined) {
                earnedWeight += (score / 100) * g.weight;
                enteredWeight += g.weight;
              }
            });

            // Calculate grades
            const currentPercent = enteredWeight > 0 ? (earnedWeight / enteredWeight) * 100 : null;
            const remainingWeight = totalWeight - enteredWeight;
            const maxPossible = totalWeight > 0 ? ((earnedWeight + remainingWeight) / totalWeight) * 100 : 100;
            
            const currentGrade = getLetterGrade(currentPercent);
            const maxGrade = getLetterGrade(maxPossible);

            return (
              <div key={course.id} className="space-y-5 pb-6 border-b border-border/40 last:border-0 last:pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="font-bold text-foreground text-lg">{course.courseCode || course.courseName}</span>
                  
                  <div className="flex gap-4 sm:gap-6 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Current</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-2xl font-black ${currentGrade.text}`}>{currentGrade.letter}</span>
                        {currentPercent !== null && (
                          <span className="text-sm font-mono text-muted-foreground">{currentPercent.toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                    <div className="w-px bg-border/50" />
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Max Possible</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-2xl font-black ${maxGrade.text}`}>{maxGrade.letter}</span>
                        <span className="text-sm font-mono text-muted-foreground">{maxPossible.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {course.gradeBreakdown.map((g, i) => {
                    const key = `${course.id}::${g.component}`;
                    const score = scores[key];
                    const isEntered = score !== undefined;
                    
                    return (
                      <div 
                        key={i} 
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all duration-200 ${isEntered ? 'bg-card border-primary/30 shadow-sm' : 'bg-muted/10 border-border/60 hover:border-border'}`}
                      >
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate" title={g.component}>{g.component}</span>
                          <span className="text-xs text-muted-foreground font-mono">{g.weight}% weight</span>
                        </div>
                        <div className="relative w-20 flex-shrink-0">
                          <Input 
                            type="number" 
                            min="0"
                            max="150"
                            placeholder="-"
                            value={score !== undefined ? score : ''}
                            onChange={(e) => updateScore(course.id, g.component, e.target.value)}
                            className="pr-6 h-8 text-right font-mono"
                          />
                          <Percent size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
