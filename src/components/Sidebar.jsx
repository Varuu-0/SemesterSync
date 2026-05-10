import { useCourses } from '../contexts/CourseContext';
import { useAuth } from '../contexts/AuthContext';
import { syncToGoogleCalendar } from '../utils/gcalSync';
import { useState } from 'react';
import { BookOpen, Plus, Trash2, Download, Calendar } from 'lucide-react';
import { downloadICS } from '../utils/icsExport';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Sidebar({ activeTab, onTabChange, onCourseClick }) {
  const { courses, removeCourse, getAllEvents } = useCourses();
  const { getCalendarAccessToken } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  const handleExport = () => {
    const events = getAllEvents();
    if (events.length === 0) {
      toast.warning('No events to export', { description: 'Please upload a syllabus first.' });
      return;
    }
    downloadICS(events);
    toast.success('Calendar exported!', { description: `Downloaded ${events.length} events to .ics file.` });
  };

  const handleSyncGCal = async () => {
    const events = getAllEvents();
    if (events.length === 0) {
      toast.warning('No events to sync', { description: 'Please upload a syllabus first.' });
      return;
    }

    setSyncing(true);
    setSyncProgress('Requesting access...');
    try {
      const token = await getCalendarAccessToken();
      const result = await syncToGoogleCalendar(events, token, (current, total) => {
        setSyncProgress(`Syncing ${current}/${total}...`);
      });
      setSyncProgress(`Done! Added ${result.successCount} events.`);
      toast.success('Google Calendar Synced!', { description: `Successfully added ${result.successCount} events.` });
      
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress('');
      }, 3000);
    } catch (err) {
      setSyncProgress(`Error: ${err.message}`);
      toast.error('Sync Failed', { description: err.message });
      
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress('');
      }, 4000);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col rounded-xl overflow-hidden shadow-lg border-muted/50 bg-background/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 px-4 pt-4">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <BookOpen size={18} className="text-primary" />
          <CardTitle className="text-base">My Courses</CardTitle>
        </div>
        <Badge variant="secondary" className="rounded-full px-2">{courses.length}</Badge>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto px-4 pb-0 space-y-2">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4 text-center">No courses yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {courses.map((course) => (
              <div 
                key={course.id} 
                className="group relative flex items-center justify-between rounded-lg border border-transparent p-3 hover:bg-muted/50 hover:border-border transition-all cursor-pointer"
                onClick={() => onCourseClick?.(course)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: course.colorRaw }} />
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-medium truncate">{course.courseCode || course.courseName}</span>
                    <span className="text-xs text-muted-foreground truncate">{course.courseCode ? course.courseName : ''}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCourse(course.id);
                  }}
                  title="Remove course"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2 px-4 pb-4 pt-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary" 
          onClick={() => onTabChange?.('upload')}
        >
          <Plus size={16} />
          Add Syllabus
        </Button>

        {courses.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 mt-2 border-t border-border/50">
            <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleExport} disabled={syncing}>
              <Download size={16} className="text-muted-foreground" />
              Export .ics
            </Button>
            <Button variant="secondary" className="w-full justify-start gap-2" onClick={handleSyncGCal} disabled={syncing}>
              <Calendar size={16} className={syncing ? "animate-pulse text-primary" : "text-muted-foreground"} />
              {syncing ? syncProgress : 'Sync to GCal'}
            </Button>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground border border-primary/10">
          <span>💡</span>
          <p>Upload a syllabus PDF to automatically extract your course schedule.</p>
        </div>
      </CardFooter>
    </Card>
  );
}
