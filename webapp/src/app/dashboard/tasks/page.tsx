'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Clock, BrainCircuit, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import { useAppContext, AppEvent } from '@/context/AppContext'

type TaskNode = {
  taskName: string;
  estimatedHours: number;
  subtasks?: TaskNode[];
};

// Recursive component to render the task tree
function TaskTreeNode({ node, depth = 0 }: { node: TaskNode, depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.subtasks && node.subtasks.length > 0

  return (
    <div className="mt-3 relative z-10">
      <div 
        className={`flex items-start gap-3 relative ${depth > 0 ? 'ml-6 pl-4' : ''}`}
      >
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-[-16px] w-[1px] bg-slate-300 dark:bg-white/20 -translate-x-[22px]" />
        )}
        {depth > 0 && (
          <div className="absolute left-0 top-3 w-4 h-[1px] bg-slate-300 dark:bg-white/20 -translate-x-[22px]" />
        )}

        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 w-5 h-5 flex items-center justify-center rounded-sm bg-slate-100 dark:bg-[#18181b] border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors z-10">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-5 h-5 mt-0.5 flex-shrink-0 flex items-center justify-center z-10">
            <div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-none" />
          </div>
        )}
        
        <div className="flex-1 sleek-card px-4 py-2.5">
          <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            {node.taskName} 
            <span className="text-slate-500 font-medium ml-2 px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded-sm text-xs">{node.estimatedHours} hrs</span>
          </h5>
        </div>
      </div>
      
      {expanded && hasChildren && (
        <div className="ml-2 relative">
          {node.subtasks!.map((child, idx) => (
            <TaskTreeNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { events, setEvents, courses } = useAppContext()
  const [selectedTask, setSelectedTask] = useState<AppEvent | null>(events[0] || null)
  const [breakdown, setBreakdown] = useState<TaskNode | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch AI breakdown when a new task is selected
  useEffect(() => {
    if (!selectedTask) return

    const fetchBreakdown = async () => {
      setLoading(true)
      setBreakdown(null)
      try {
        const res = await fetch('/api/tasks/breakdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: selectedTask.title,
            description: selectedTask.description,
            weight: selectedTask.weight
          })
        })
        const json = await res.json()
        if (json.data) {
          setBreakdown(json.data)
        }
      } catch (err) {
        console.error('Failed to fetch breakdown', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBreakdown()
  }, [selectedTask])

  const toggleTask = (id: string) => {
    setEvents(events.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  return (
    <div className="h-full flex gap-6">
      {/* Task List */}
      <div className="w-1/2 sleek-panel p-6 flex flex-col">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 tracking-tight">Upcoming Deadlines</h3>

        <div className="space-y-3 overflow-y-auto flex-1 pr-2 scrollbar-hide">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 border border-dashed border-slate-300 dark:border-white/20 rounded-sm">
              <p className="text-sm font-medium">No tasks found. Upload a syllabus.</p>
            </div>
          ) : (
            events.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`flex items-start gap-3 p-4 rounded-sm cursor-pointer transition-all duration-300 ${
                  selectedTask?.id === task.id
                    ? 'bg-slate-100 dark:bg-[#18181b] border border-slate-300 dark:border-white/30 shadow-sm'
                    : 'sleek-card hover:-translate-y-0.5'
                } ${task.completed ? 'opacity-50 grayscale' : ''}`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleTask(task.id) }}
                  className="mt-1"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-slate-800 dark:text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors" />
                  )}
                </button>
                <div className="flex-1">
                  <h4 className={`font-semibold text-[15px] ${task.completed ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="px-2.5 py-1 rounded-sm font-semibold bg-white dark:bg-[#111111] border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                      {courses.find(c => c.id === task.courseId)?.name || task.courseId}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {task.date}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Study Planner */}
      <div className="flex-1 sleek-panel p-6 flex flex-col relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-10 h-10 rounded-sm bg-black dark:bg-white flex items-center justify-center shadow-sm">
            <BrainCircuit className="w-5 h-5 text-white dark:text-black" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Agentic AI Planner</h3>
        </div>

        <div className="sleek-card p-6 flex-1 relative z-10 overflow-y-auto">
          {!selectedTask ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
              <BrainCircuit className="w-12 h-12 mb-4" />
              <p className="text-sm font-medium">Select a task to view execution plan.</p>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-2">
                Breaking down: <span className="text-blue-600 dark:text-blue-500">{selectedTask.title}</span>
              </h4>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                AI has generated the following recursive execution nodes.
              </p>

              <div className="mt-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-800 dark:text-white">
                    <div className="relative">
                      <div className="w-10 h-10 border-2 border-slate-200 dark:border-white/10 border-t-black dark:border-t-white rounded-full animate-spin" />
                    </div>
                    <p className="text-sm font-bold mt-6 tracking-wide text-slate-500 dark:text-slate-400">PLANNING TASK...</p>
                  </div>
                ) : breakdown ? (
                  <div className="sleek-panel p-5">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-4 pb-3 border-b border-slate-200 dark:border-white/10 uppercase tracking-widest text-xs">
                      Execution Tree
                    </h5>
                    <div className="relative pl-2">
                      <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-slate-300 dark:bg-white/20" />
                      <TaskTreeNode node={breakdown} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-500 font-medium bg-red-50 dark:bg-red-500/10 p-4 rounded-sm border border-red-200 dark:border-red-500/20">Failed to generate breakdown. Try again.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
