import { useState, useMemo } from 'react';
import { useCourses } from '../contexts/CourseContext';
import { analyzeBurnout } from '../utils/burnoutDetector';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, List, LayoutGrid, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const VIEWS = [
  { id: 'month', icon: LayoutGrid, label: 'Month' },
  { id: 'week', icon: CalIcon, label: 'Week' },
  { id: 'timeline', icon: List, label: 'Timeline' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

export default function CalendarView() {
  const { getAllEvents, courses, addCustomEvent, deleteEvent } = useCourses();
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'assignment', courseId: '' });

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;
    addCustomEvent(newEvent);
    setIsAddEventOpen(false);
    setNewEvent({ title: '', date: '', type: 'assignment', courseId: '' });
  };

  const allEvents = useMemo(() => getAllEvents(), [getAllEvents]);
  const burnout = useMemo(() => analyzeBurnout(allEvents), [allEvents]);

  const eventsByDate = useMemo(() => {
    const map = {};
    allEvents.forEach((e) => {
      if (!e.date) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [allEvents]);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <CalIcon size={32} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Unified Calendar</h2>
        <p className="text-muted-foreground max-w-md">Upload a syllabus and extract with AI to populate your calendar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4 animate-in slide-in-from-bottom-4 duration-500" id="calendar-view">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight min-w-[200px]">
            {view === 'week'
              ? (() => { const m = getMonday(currentDate); return `Week of ${MONTHS[m.getMonth()]} ${m.getDate()}`; })()
              : `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:flex">Today</Button>
          
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus size={16} className="mr-2" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Custom Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddEvent} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input id="title" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="e.g. Doctor Appointment" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <select id="type" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <option value="assignment">Assignment</option>
                      <option value="exam">Exam</option>
                      <option value="project">Project</option>
                      <option value="personal">Personal</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="course">Course (Optional)</Label>
                    <select id="course" value={newEvent.courseId} onChange={e => setNewEvent({...newEvent, courseId: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <option value="">Personal / None</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.courseCode || c.courseName}</option>)}
                    </select>
                  </div>
                </div>
                <Button type="submit" className="mt-4">Save Event</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex gap-2 sm:hidden">
            <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
            <Button size="sm" onClick={() => setIsAddEventOpen(true)} className="bg-primary text-primary-foreground">
              <Plus size={16} />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8"><ChevronLeft size={16} /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(1)} className="h-8 w-8"><ChevronRight size={16} /></Button>
          </div>
          
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg hidden md:flex">
            {VIEWS.map(({ id, icon: Icon, label }) => (
              <Button 
                key={id} 
                variant={view === id ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setView(id)} 
                title={label}
                className={`h-8 px-3 ${view === id ? 'bg-background shadow-sm' : ''}`}
              >
                <Icon size={14} className="mr-2" />
                {label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg md:hidden">
            {VIEWS.map(({ id, icon: Icon }) => (
              <Button 
                key={id} 
                variant={view === id ? "secondary" : "ghost"} 
                size="icon"
                onClick={() => setView(id)} 
                className={`h-8 w-8 ${view === id ? 'bg-background shadow-sm' : ''}`}
              >
                <Icon size={16} />
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Burnout warnings */}
      {burnout.doomWeeks.length > 0 && (
        <div className="flex items-center gap-3 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertTriangle size={18} className="shrink-0" />
          <span className="font-medium">⚠️ {burnout.doomWeeks.length} doom week{burnout.doomWeeks.length > 1 ? 's' : ''} detected! Plan ahead to survive.</span>
        </div>
      )}

      {/* Views */}
      <div className="flex-1 bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
        {view === 'month' && <MonthView currentDate={currentDate} eventsByDate={eventsByDate} selectedDate={selectedDate} onSelectDate={setSelectedDate} burnout={burnout} />}
        {view === 'week' && <WeekView currentDate={currentDate} eventsByDate={eventsByDate} />}
        {view === 'timeline' && <TimelineView events={allEvents} />}
      </div>

      {/* Selected date detail */}
      {selectedDate && eventsByDate[selectedDate] && (
        <Card className="animate-in slide-in-from-bottom-2 border-primary/20 bg-background/50 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {eventsByDate[selectedDate].map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50 border-l-4 group" style={{ borderLeftColor: e.colorRaw }}>
                <Badge variant="outline" className="capitalize w-24 justify-center bg-background shrink-0">{e.type}</Badge>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-semibold truncate">{e.title}</span>
                  <span className="text-xs text-muted-foreground truncate">{e.courseCode || e.courseName}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  {e.weight && <Badge variant="secondary" className="font-mono">{e.weight}%</Badge>}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteEvent(e.id, e.isCustom)}
                    title="Delete Event"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Month View ─── */
function MonthView({ currentDate, eventsByDate, selectedDate, onSelectDate }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const today = toDateStr(new Date());

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-auto">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="border-r border-b border-border/50 bg-muted/5 p-2" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const events = eventsByDate[dateStr] || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;

          return (
            <div
              key={i}
              className={`
                min-h-[80px] p-2 border-r border-b border-border/50 cursor-pointer transition-colors relative group
                ${isToday ? 'bg-primary/5' : 'bg-background hover:bg-muted/30'}
                ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}
              `}
              onClick={() => onSelectDate(dateStr === selectedDate ? null : dateStr)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground group-hover:text-primary'}
                `}>{day}</span>
                {events.length > 0 && <span className="text-[10px] font-bold text-muted-foreground">{events.length}</span>}
              </div>
              
              <div className="flex flex-wrap gap-1 mt-1">
                {events.slice(0, 4).map((e, j) => (
                  <div key={j} className="w-2 h-2 rounded-full" style={{ background: e.colorRaw }} title={e.title} />
                ))}
                {events.length > 4 && <div className="w-2 h-2 rounded-full bg-muted-foreground flex items-center justify-center text-[8px] font-bold text-background"></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Week View ─── */
function WeekView({ currentDate, eventsByDate }) {
  const monday = getMonday(currentDate);
  const today = toDateStr(new Date());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return { date: d, dateStr: toDateStr(d) };
  });

  return (
    <div className="flex flex-col h-full lg:flex-row lg:h-[600px] divide-y lg:divide-y-0 lg:divide-x divide-border/50 overflow-y-auto bg-muted/10">
      {days.map(({ date, dateStr }) => {
        const events = eventsByDate[dateStr] || [];
        const isToday = dateStr === today;
        return (
          <div key={dateStr} className={`flex-1 min-w-[200px] flex flex-col ${isToday ? 'bg-primary/5' : 'bg-background'}`}>
            <div className={`p-3 border-b border-border/50 flex items-center justify-between sticky top-0 bg-inherit z-10
              ${isToday ? 'border-primary/20' : ''}
            `}>
              <span className={`text-sm font-semibold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {DAYS[((date.getDay() + 6) % 7)]}
              </span>
              <span className={`text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                {date.getDate()}
              </span>
            </div>
            <div className="p-2 space-y-2 flex-1 overflow-y-auto">
              {events.length === 0 && <span className="text-xs text-muted-foreground italic block p-2">No events</span>}
              {events.map((e, i) => (
                <div key={i} className="p-2 rounded-md border border-border/50 bg-card shadow-sm border-l-4 text-xs group" style={{ borderLeftColor: e.colorRaw }}>
                  <div className="font-semibold text-foreground truncate mb-1">{e.title}</div>
                  <div className="text-muted-foreground truncate">{e.courseCode} · {e.type}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Timeline View ─── */
function TimelineView({ events }) {
  const datedEvents = events.filter((e) => e.date);
  if (datedEvents.length === 0) {
    return <div className="p-8 text-center text-muted-foreground italic bg-background h-full">No dated events to show.</div>;
  }

  let lastMonth = '';
  return (
    <div className="p-4 sm:p-6 bg-background h-full overflow-y-auto overflow-x-hidden">
      <div className="relative border-l-2 border-muted pl-4 sm:pl-8 ml-20 sm:ml-28 space-y-8 py-4">
        {datedEvents.map((e, i) => {
          const d = new Date(e.date + 'T00:00:00');
          const monthLabel = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
          const showMonth = monthLabel !== lastMonth;
          lastMonth = monthLabel;
          return (
            <div key={i} className="relative">
              {showMonth && (
                <div className="absolute -left-[5.5rem] sm:-left-[6.5rem] -top-3 px-2 sm:px-3 py-1 bg-muted rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground shadow-sm whitespace-nowrap z-10">
                  {monthLabel}
                </div>
              )}
              <div className="absolute -left-[1.45rem] sm:-left-[2.45rem] top-1 h-3 w-3 rounded-full ring-4 ring-background" style={{ background: e.colorRaw }} />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 -mt-1">
                <div className="text-sm font-semibold text-muted-foreground w-24 shrink-0">
                  {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <Card className="flex-1 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-4" style={{ borderLeftColor: e.colorRaw }}>
                    <span className="font-semibold text-sm">{e.title}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs bg-muted/50 font-normal">{e.courseCode}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize font-normal">{e.type}</Badge>
                      {e.weight && <span className="text-xs font-mono font-bold text-muted-foreground">{e.weight}%</span>}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
