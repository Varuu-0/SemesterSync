'use client';

import { motion } from 'motion/react';
import { AlertCircle, CalendarClock, Zap, CheckCircle2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useAppContext } from '@/context/AppContext';

const bgColors: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  red: 'bg-rose-500/20 text-rose-300 ring-rose-500/30',
  purple: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  pink: 'bg-pink-500/20 text-pink-300 ring-pink-500/30',
  indigo: 'bg-indigo-500/20 text-indigo-300 ring-indigo-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 ring-cyan-500/30',
  slate: 'bg-slate-500/20 text-slate-300 ring-slate-500/30'
};

const dotColors: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  red: 'bg-rose-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  cyan: 'bg-cyan-500',
  slate: 'bg-slate-500'
};

export default function DashboardOverviewPage() {
  const { events, courses } = useAppContext();
  
  // Sort events by date to get upcoming ones
  const upcomingEvents = [...events]
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  return (
    <div className="flex-1 w-full p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-light tracking-tight text-white mb-1 font-display"
            >
              Semester <span className="font-semibold">Overview</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-white/40 text-sm"
            >
              Here's how your next few weeks are shaping up.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-2"
          >
            <Zap className="text-yellow-400 fill-yellow-400 z-10" size={18} />
            <div className="text-xs font-medium text-white tracking-widest uppercase">
              <span className="text-white/40 font-normal mr-2">System Note:</span>
              AI Tracking Active
            </div>
          </motion.div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Timeline */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Actionable Week Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-6 relative z-20">
                <span className="text-blue-400 text-xs font-bold uppercase tracking-widest block">Main Viewport</span>
                <span className="text-xs font-medium bg-white/10 text-white/60 px-3 py-1 rounded-full border border-white/10">Upcoming</span>
              </div>
              <h2 className="text-3xl font-medium leading-tight max-w-md mb-8 relative z-20 text-white">Your AI Recommended Plan.</h2>
              <div className="space-y-4 relative z-20">
                {upcomingEvents.length === 0 ? (
                  <p className="text-white/40 italic">No upcoming assignments. Upload a syllabus to get started.</p>
                ) : (
                  upcomingEvents.map((task, i) => {
                    const course = courses.find(c => c.id === task.courseId);
                    if (!course) return null;
                    return (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        className="group flex items-start sm:items-center justify-between p-4 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 backdrop-blur-sm transition-all"
                      >
                        <div className="flex gap-4 items-center">
                          <button className="flex-shrink-0 w-6 h-6 rounded border border-white/20 group-hover:border-blue-400 transition-colors flex items-center justify-center bg-white/5">
                            {/* Unchecked box */}
                          </button>
                          <div>
                            <p className="font-medium text-white leading-tight mb-1">{task.title}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium ring-1 ring-inset ${bgColors[course.color.replace('bg-', '').replace('-500', '')] || bgColors.blue}`}>
                                {course.code || course.name.substring(0, 8)}
                              </span>
                              <span className="text-white/40 font-mono">
                                Due {format(new Date(task.date), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="hidden sm:block text-right">
                          <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">{task.weight}% of grade</div>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </div>
              {/* Decorative Element */}
              <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
            </motion.div>

          </div>

          {/* Right Column: Alerts & Stats */}
          <div className="space-y-6">
            
            {/* Academic Doom Week Alert */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-red-500/20 to-rose-500/20 backdrop-blur-xl border border-red-500/20 rounded-[32px] p-6 text-white relative overflow-hidden flex flex-col"
            >
              {/* Decorative background circle */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={24} className="text-red-400" />
                    <h3 className="font-medium text-xl">Doom Week Detected</h3>
                  </div>
                  <p className="text-red-200 text-xs font-mono mb-5 bg-red-500/20 inline-block px-2.5 py-1 rounded-md border border-red-500/30">
                    Warning
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center text-sm bg-white/5 border border-white/5 px-3 py-2 rounded-xl text-white/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2" />
                      Check Calendar for Overlaps
                    </li>
                  </ul>
                </div>
                
                <div className="bg-black/20 border border-white/10 text-white/90 p-4 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-2">AI Suggestion</p>
                  <p className="text-sm font-medium">Keep uploading syllabi so I can map out potential crunch periods and doom weeks.</p>
                </div>
              </div>
            </motion.div>

            {/* Workload Distribution */}
            {courses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs text-white/40 font-bold uppercase tracking-tighter">Active Courses</span>
                </div>
                <div className="space-y-4">
                  {courses.map((course, i) => {
                    const colorKey = course.color.replace('bg-', '').replace('-500', '');
                    const colorCode = dotColors[colorKey] || dotColors.blue;
                    
                    // Count events for this course to make a fake "workload" percentage
                    const courseEvents = events.filter(e => e.courseId === course.id).length;
                    const totalEvents = Math.max(events.length, 1);
                    const pct = Math.round((courseEvents / totalEvents) * 100);

                    return (
                      <div key={course.id}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-white/80">{course.name}</span>
                          <span className="text-white/40 font-mono">{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            className={`h-full rounded-full ${colorCode}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
