import { useState } from 'react';
import { useCourses } from '../contexts/CourseContext';
import { generateRoast } from '../utils/semesterRoast';
import { Flame, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

export default function SemesterRoast() {
  const { courses } = useCourses();
  const [roast, setRoast] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (courses.length === 0) return null;

  const handleRoast = async () => {
    setLoading(true);
    setError('');
    try {
      const text = await generateRoast(courses);
      setRoast(text);
      toast.success('Roast Generated', { description: 'Brace yourself...' });
    } catch (err) {
      setError(err.message);
      toast.error('Roast Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roast);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden border-orange-500/20 bg-gradient-to-br from-background via-background to-orange-500/5 shadow-lg animate-in slide-in-from-bottom-4" id="semester-roast">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
            <Flame size={24} />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-foreground">AI Semester Roast</CardTitle>
            <CardDescription>Let AI brutally roast your upcoming schedule</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!roast && !loading && (
          <Button 
            onClick={handleRoast} 
            disabled={loading}
            className="w-full sm:w-auto gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20"
          >
            <Flame size={16} />
            Roast My Semester
          </Button>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-orange-500 animate-in fade-in">
            <Loader2 size={32} className="animate-spin" />
            <span className="font-medium animate-pulse">Analyzing your poor life choices...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {roast && !loading && (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className="relative">
              <div className="absolute -top-3 -left-2 text-4xl opacity-20 text-orange-500">"</div>
              <p className="text-muted-foreground leading-relaxed p-6 bg-muted/40 rounded-xl border border-border/50 text-sm sm:text-base italic">
                {roast}
              </p>
              <div className="absolute -bottom-4 right-0 text-4xl opacity-20 text-orange-500">"</div>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRoast} disabled={loading} className="gap-2">
                <RefreshCw size={14} />
                New Roast
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
