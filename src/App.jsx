import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useCourses } from './contexts/CourseContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import FileUpload from './components/FileUpload';
import ParsedContent from './components/ParsedContent';
import CourseData from './components/CourseData';
import CalendarView from './components/Calendar';
import Planner from './components/Planner';
import DoomWeekDetector from './components/DoomWeekDetector';
import SemesterRoast from './components/SemesterRoast';
import GpaPredictor from './components/GpaPredictor';
import AiChat from './components/AiChat';
import LoginPage from './components/LoginPage';
import { extractCourseData } from './utils/geminiParser';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

function App() {
  const { isAuthenticated, loading } = useAuth();
  const { addCourse } = useCourses();
  const [activeTab, setActiveTab] = useState('upload');
  const [parseResult, setParseResult] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [aiError, setAiError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Show nothing while checking stored session
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  // Not logged in → show login page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleParseComplete = (result) => {
    setParseResult(result);
    setCourseData(null);
    setAiError(null);
  };

  const handleExtract = async (resultsArray) => {
    setExtracting(true);
    setAiError(null);
    setAiStatus('');

    try {
      const BATCH_SIZE = 3;
      let completedCount = 0;
      let failureCount = 0;

      // Process in batches
      for (let i = 0; i < resultsArray.length; i += BATCH_SIZE) {
        const batch = resultsArray.slice(i, i + BATCH_SIZE);
        
        if (i > 0) {
          setAiStatus(`Pausing to respect AI rate limits...`);
          await new Promise(resolve => setTimeout(resolve, 4000));
        }

        setAiStatus(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(resultsArray.length / BATCH_SIZE)}...`);

        // Run batch concurrently
        const batchPromises = batch.map(async (result, idx) => {
          const globalIdx = i + idx;
          const fileName = result.fileName || `File ${globalIdx + 1}`;
          
          try {
            const data = await extractCourseData(result.fullText, (status) => {
              // Only update status if it's the first item in the batch to avoid flicker
              if (idx === 0) setAiStatus(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${status}`);
            });
            return { success: true, data, fileName };
          } catch (error) {
            return { success: false, error, fileName };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        // Handle results for this batch
        batchResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value.success) {
            addCourse(res.value.data);
            completedCount++;
          } else {
            failureCount++;
            const err = res.status === 'rejected' ? res.reason : res.value.error;
            const name = res.status === 'fulfilled' ? res.value.fileName : 'A file';
            toast.error(`Extraction failed for ${name}`, { description: err?.message || 'Unknown error' });
          }
        });
      }

      setParseResult(null);
      setAiStatus('Batch extraction complete!');
      
      // Automatically navigate to the planner/calendar to see the results
      setTimeout(() => {
        setActiveTab('calendar');
        setAiStatus('');
      }, 1500);

    } catch (err) {
      setAiError(err.message);
      toast.error('AI Extraction Failed', { description: err.message });
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden font-sans">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--foreground) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main layout */}
      <main className="flex-1 container mx-auto max-w-7xl w-full p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-6rem)] w-full relative">
          {/* Sidebar */}
          <div className="w-full md:w-80 flex-shrink-0 md:h-full hidden md:block">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onCourseClick={setSelectedCourse} />
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-12 w-full">
            {activeTab === 'upload' && (
              <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                <FileUpload onParseComplete={handleParseComplete} />

                {parseResult && (
                  <ParsedContent
                    results={parseResult}
                    onExtract={handleExtract}
                    extracting={extracting}
                    aiStatus={aiStatus}
                  />
                )}

                {aiError && (
                  <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl flex items-center gap-2">
                    <span>⚠️ {aiError}</span>
                  </div>
                )}

                {courseData && <CourseData data={courseData} />}
              </div>
            )}

            {activeTab === 'calendar' && <CalendarView />}

            {activeTab === 'planner' && (
              <div className="flex flex-col gap-8 max-w-5xl mx-auto">
                <Planner />
                <DoomWeekDetector />
                <GpaPredictor />
                <SemesterRoast />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating AI Chat */}
      <AiChat />

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedCourse(null)}>
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSelectedCourse(null)}
            >
              &times;
            </button>
            <div className="overflow-y-auto max-h-[85vh] p-6">
              <CourseData data={selectedCourse} />
            </div>
          </div>
        </div>
      )}

      {/* Global Toaster */}
      <Toaster position="bottom-right" theme="dark" />
    </div>
  );
}

export default App;
