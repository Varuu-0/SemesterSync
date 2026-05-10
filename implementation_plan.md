# Combining SemesterSync: Merging Best Features from All 3 Branches

## Branch Analysis Summary

| Aspect | **Varunjit** (current) | **Owen** | **Sukhman** |
|--------|----------------------|----------|-------------|
| **Framework** | Next.js 15 + TypeScript | Vite + React (JSX) | Next.js 14 + TypeScript |
| **Styling** | Tailwind + custom theme system | Tailwind v4 + shadcn/ui + `next-themes` | Tailwind v3 + custom CSS vars (`ink-*`, `surface`) |
| **Calendar** | FullCalendar (month/week views) | Custom-built (Month/Week/Timeline views) | FullCalendar + Google Calendar overlay |
| **AI Model** | Gemini 3.1 Flash Lite (server-side) | Gemini 3.1 Flash Lite (client-side fetch) | Gemini (server-side + streaming) |
| **PDF Parsing** | `unpdf` (server-side) | `pdfjs-dist` (client-side) | `pdfjs-dist` (client-side) |
| **Auth** | Supabase OAuth (Google) | Custom Google OAuth (`AuthContext`) | Supabase OAuth |
| **Data Persistence** | In-memory React state + Supabase cache | `localStorage` (per-user) | **Full Supabase DB** (courses, deadlines, chat, settings) |
| **State Management** | React Context (`AppContext`) | React Context (`CourseContext`) | Supabase real-time + React state |

---

## Unique Strengths Per Branch

### 🟣 Varunjit — Best Design System & UX Polish
- ✅ **Premium dark glassmorphism UI** — mesh gradient backgrounds, backdrop-blur, animated sidebar with `motion.div`, rounded-[32px] cards
- ✅ **Multi-theme system** — 5 color presets (Nebula, Emerald, Sunset, Rose, Arctic) + custom accent color picker with CSS variable injection
- ✅ **Animated upload flow** — multi-step scanning animation with laser line effect and step-by-step progress
- ✅ **Course color customization** — per-course color picker + randomize button
- ✅ **AI task breakdown (Agentic Planner)** — recursive tree visualization of sub-tasks with time estimates
- ✅ **ICS export** — download `.ics` file of all events
- ✅ **Supabase caching** — SHA-256 hash-based deduplication of syllabus parses

### 🟢 Owen — Best Feature Breadth & Fun Factor
- ✅ **GPA Predictor / Grade Calculator** — input scores per grading component, see current + max possible grade
- ✅ **AI Semester Roast** 🔥 — comedic AI-generated roast of your schedule (with copy + regenerate)
- ✅ **Burnout Detector Engine** — sophisticated stress scoring algorithm (type weights × grade impact), doom week detection with severity levels + stress meter
- ✅ **Smart Weekly Planner** — auto-categorizes tasks into "This Week / Next Week / Upcoming / Completed" with urgency labels, suggested actions, and task completion toggles
- ✅ **Custom Event Creation** — add personal events alongside syllabus-extracted ones
- ✅ **Event deletion** — remove individual events from calendar
- ✅ **3 Calendar Views** — Month, Week, and Timeline views (custom-built, no library)
- ✅ **Google Calendar API Sync** — push events directly via Google Calendar REST API
- ✅ **localStorage persistence** — per-user data survives page refresh
- ✅ **Batch PDF processing** — process multiple files with rate-limiting and retry logic
- ✅ **Toast notifications** — sonner-based feedback

### 🔵 Sukhman — Best Backend Architecture & Data Integrity
- ✅ **Full Supabase database schema** — `courses`, `deadlines`, `chat_messages`, `user_settings` tables with RLS policies, indexes, and realtime subscriptions
- ✅ **Google Calendar OAuth2 integration** — server-side OAuth flow with refresh tokens, calendar sync with color-matching, disconnect/reconnect flow, toggle overlay visibility
- ✅ **PDF storage in Supabase Storage** — syllabi persisted in private `syllabi` bucket with proper RLS
- ✅ **Smart deadline extraction with fallback** — AI-first → local chrono-node fallback with academic term inference
- ✅ **Streaming AI chat** — server-sent events for real-time AI response rendering with markdown support
- ✅ **Chat message persistence** — messages stored in Supabase with delete/clear capability
- ✅ **Rich dashboard metrics** — `computeMetrics()` function: workload by week/course, category breakdown, completion rate, heaviest course detection
- ✅ **Skeleton loading states** — structured placeholder UI matching the actual layout to prevent CLS
- ✅ **Manual deadline creation** — add deadlines without uploading a PDF
- ✅ **Deadline completion tracking** — mark deadlines as done (with `completed_at` timestamp)
- ✅ **Course management** — add/edit/delete courses manually, each with editable color

---

## Proposed Merged Architecture

> [!IMPORTANT]
> **Base framework: Next.js (from Varunjit branch)** — it's already set up with the richest UI and supports both server-side API routes (needed for Supabase + Google OAuth) and client-side interactivity.

### Technology Decisions

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **Next.js 15** (Varunjit) | Already set up; supports server routes for Google OAuth |
| Styling | **Varunjit's theme system** + Tailwind | Premium glassmorphism look, multi-theme presets |
| UI Components | Augment with **shadcn/ui** (from Owen) for buttons, cards, badges, dialogs | Polished, accessible primitives |
| Calendar | **FullCalendar** (from Varunjit/Sukhman) + Owen's **Timeline view** as bonus tab | Best of both: professional grid + visual timeline |
| Database | **Sukhman's Supabase schema** (courses, deadlines, chat_messages, user_settings) | Proper persistence, RLS, realtime |
| AI Model | **Gemini 3.1 Flash Lite** via server-side API routes (Varunjit pattern) | Keeps API key secure; server-side only |
| PDF Parsing | **Dual approach**: `unpdf` server-side (Varunjit) + `pdfjs-dist` client-side fallback (Sukhman) | Robust extraction |
| State | **React Context** (Varunjit) backed by **Supabase DB** (Sukhman) | In-memory for speed, persisted for reliability |
| Auth | **Supabase Auth** with Google OAuth (already in Varunjit) | Simplest; shared by Varunjit & Sukhman |

---

## Proposed Changes

### 1. Database & Persistence Layer
**Source: Sukhman branch**

Adopt Sukhman's full Supabase schema to replace Varunjit's in-memory-only state:

#### [MODIFY] [supabase_schema.sql](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/supabase_schema.sql)
- Replace the current cache-only schema with Sukhman's full schema:
  - `courses` table (id, user_id, name, color, pdf_storage_path, pdf_file_name, syllabus_text)
  - `deadlines` table (id, user_id, course_id, title, due_at, category, source_snippet, completed_at, google_event_id)
  - `user_settings` table (google_refresh_token, google_calendar_id, show_gcal_events, last_sync_at)
  - `chat_messages` table (role, text, course_id, user_name, user_photo)
  - `syllabus_cache` table (keep from Varunjit for dedup)
  - Storage bucket `syllabi` with RLS
  - Realtime publication for courses + deadlines + chat_messages
  - Full RLS policies for all tables

#### [MODIFY] [AppContext.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/context/AppContext.tsx)
- Add Supabase reads/writes behind every `setCourses`, `setEvents` call
- Add `addCourse()`, `removeCourse()`, `toggleDeadlineCompletion()` methods that write to Supabase
- Keep color customization logic from Varunjit
- Add `getAllEvents()` helper from Owen's `CourseContext` for computed event lists

#### [NEW] `src/lib/types.ts`
- Consolidate type definitions from all branches (Course, Deadline, ChatMessage, UserSettings, DeadlineCategory, GoogleCalendarEvent)

---

### 2. Dashboard Overview
**Sukhman's layout structure + Varunjit's visual layer + Owen & Sukhman features**

> [!IMPORTANT]
> **Design direction:** Use Sukhman's dashboard as the **structural blueprint** (section order, data density, component placement). Apply Varunjit's **glassmorphism styling** on top of every element (backdrop-blur cards, `bg-white/5` panels, `motion.div` entrance animations, gradient decorative blurs, theme CSS variables). Pull in **features** from both Owen and Sukhman.

#### [MODIFY] [page.tsx (dashboard)](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/dashboard/page.tsx)

**Layout structure (from Sukhman):**
```
┌──────────────────────────────────────────────────────┐
│  Header: "Dashboard" + subtitle + Export ICS button  │
├────────┬────────┬────────┬────────┬──────────────────┤
│ Next   │ Due    │ Missed │ Comp.  │  Doom Week       │
│Deadline│This Wk │        │ Rate   │  Stress Meter    │
├────────┴────────┴────────┴────────┴──────────────────┤
│  Embedded Calendar (FullCalendar + GCal overlay)     │
├──────────────┬──────────────┬────────────────────────┤
│ Workload     │ Workload     │ Category Mix           │
│ by Week      │ by Course    │ (next 30 days)         │
├──────────────┴──────────────┴────────────────────────┤
│  Google Calendar Panel (connect / sync / toggle)     │
├──────────────────────────────────────────────────────┤
│  Upcoming Deadlines (list, show more/less)           │
│  Missed Deadlines (list, collapsible)                │
│  Completed (list, collapsible)                       │
└──────────────────────────────────────────────────────┘
```

**Visual layer (from Varunjit) — applied to every section above:**
- Cards use `bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px]` glassmorphism
- All sections enter with `motion.div` animations (`initial={{ opacity: 0, y: 20 }}`, staggered delays)
- Stat card icons use `style={{ color: 'var(--theme-accent)' }}` from the active theme
- Gradient decorative blurs behind key cards (`bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl`)
- Section headers use `text-xs font-bold uppercase tracking-widest text-white/40` Varunjit style
- Progress bars use theme-aware colors via CSS variables

**Features integrated:**
- **From Sukhman:** `computeMetrics()` for stat cards (next deadline, due this week, missed count, completion rate %), workload-by-week bar chart (next 4 weeks), workload-by-course horizontal bars, category mix tag pills, embedded FullCalendar with Google Calendar overlay, deadline lists with completion toggles + show more/less, skeleton loader during data fetch, ICS export button, Google Calendar panel
- **From Owen:** Doom Week stress meter in the stat card row (score 0-20, color bar from green→amber→red with emoji labels Chill→Busy→Critical→DOOM), confetti burst on completing a deadline (using `canvas-confetti`), urgency-based text coloring on deadline rows (overdue=red, today=amber, this week=blue)

---

### 3. Calendar Page
**Merge FullCalendar + Owen's Timeline + Sukhman's Google Calendar overlay**

#### [MODIFY] [calendar/page.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/dashboard/calendar/page.tsx)
- **Keep**: Varunjit's FullCalendar with course filter pills, event detail slide-over panel, AI study plan generation button
- **Add from Sukhman**: Google Calendar event overlay (outlined events from primary GCal), CalendarEventModal with syllabus excerpt display
- **Add from Owen**: Timeline view as a third view option (Month | Week | Timeline)
- **Add from Owen**: Custom event creation dialog (add personal events)
- **Add from Owen**: Delete event button on each event

---

### 4. Smart Planner / Task Board
**Owen's Planner + Varunjit's AI Breakdown**

#### [MODIFY] [tasks/page.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/dashboard/tasks/page.tsx)
- **Keep**: Varunjit's Agentic AI Planner with recursive task tree visualization
- **Replace left panel with Owen's Smart Planner**: auto-categorized "This Week / Next Week / Upcoming / Completed" sections with urgency badges, countdown labels, and suggested actions
- **Add from Owen**: Task completion toggle (checkbox) that persists to Supabase
- **Add from Sukhman**: Completion tracking with `completed_at` timestamps

---

### 5. Courses Page
**Varunjit's premium design + Owen's expanded data + Sukhman's course management**

#### [MODIFY] [courses/page.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/dashboard/courses/page.tsx)
- **Keep**: Varunjit's glassmorphism cards, grading breakdown bars, color picker
- **Add from Owen**: Instructor display, semester info, office hours, lecture topics, policies (late policy, attendance, academic integrity)
- **Add from Sukhman**: PDF upload per course (inline), manual course creation form, delete course button, PDF file name display

---

### 6. GPA Predictor (NEW PAGE)
**Source: Owen branch**

#### [NEW] `src/app/dashboard/gpa/page.tsx`
- Port Owen's GPA Predictor component to Next.js/TypeScript
- Input scores per grading component → see current grade, max possible grade
- Styled with Varunjit's glassmorphism design system
- Add sidebar nav entry

---

### 7. Doom Week / Burnout Detector
**Owen's algorithm + Varunjit's premium UI**

#### [MODIFY] [warnings/page.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/dashboard/warnings/page.tsx)
- **Replace**: Current placeholder with Owen's full Doom Week Detector
- Port `burnoutDetector.js` to TypeScript: stress scoring engine (TYPE_WEIGHTS, severity thresholds, ISO week grouping, semester summary generation)
- Stress meter visualization (progress bar from Chill → Doom with emoji + color)
- Grid of danger weeks with per-week event breakdown
- Styled with Varunjit's dark glassmorphism

#### [NEW] `src/lib/burnoutDetector.ts`
- Port Owen's `burnoutDetector.js` to TypeScript

---

### 8. AI Semester Roast (NEW PAGE)
**Source: Owen branch**

#### [NEW] `src/app/dashboard/roast/page.tsx`
- Port Owen's SemesterRoast component
- "Roast My Semester" button → AI generates humorous commentary about the schedule
- Copy to clipboard + regenerate functionality
- Add sidebar nav entry

#### [NEW] `src/app/api/roast/route.ts`
- Server-side Gemini API call for roast generation (move Owen's client-side key to server)

---

### 9. AI Chat
**Sukhman's persistent streaming chat + Varunjit's floating UI**

#### [MODIFY] [Chatbot.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/components/Chatbot.tsx)
- **Keep**: Varunjit's floating chat button + slide-up chat window design
- **Add from Sukhman**: Streaming responses with real-time text rendering, markdown message rendering (react-markdown + remark-gfm), chat history persistence to Supabase, delete/clear messages, suggestion pills in empty state, chat thread skeleton loader
- **Add from Sukhman**: Full-page chat view at `/dashboard/chat` for extended conversations

#### [MODIFY] [chat/route.ts](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/api/chat/route.ts)
- Add streaming support (SSE or ReadableStream) from Sukhman
- Include syllabus text in prompt context (from Sukhman's `chatPrompt.ts`)

---

### 10. Upload Flow
**Varunjit's animation + Sukhman's pipeline**

#### [MODIFY] [UploadModal.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/components/UploadModal.tsx)
- **Keep**: Varunjit's gorgeous scanning animation, glassmorphism dropzone, step-by-step progress
- **Add from Sukhman**: Save PDF to Supabase Storage, save syllabus text to course record, smart extraction (AI → local fallback), detailed per-step progress indicator

#### [MODIFY] [upload/route.ts](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/api/upload/route.ts)
- **Keep**: Varunjit's cache dedup, Zod schema validation, color assignment
- **Add from Owen**: Retry logic with exponential backoff on 429s
- **Add from Sukhman**: Local chrono-node fallback extractor for when AI fails

---

### 11. Google Calendar Integration (NEW)
**Source: Sukhman branch (backend) + Owen branch (sync utility)**

#### [NEW] `src/app/api/google/` — Full set of API routes:
- `sync/route.ts` — Push deadlines to Google Calendar
- `status/route.ts` — Check connection status
- `settings/route.ts` — Update sync preferences
- `disconnect/route.ts` — Revoke Google Calendar connection
- `events/route.ts` — Fetch Google Calendar events for overlay

#### [NEW] `src/lib/googleCalendar.ts`
- Port Sukhman's Google Calendar library (create/update/delete events, color matching, list primary events, list SemesterSync events)

#### [NEW] `src/components/GoogleCalendarPanel.tsx`
- Port Sukhman's Google Calendar management panel (connect/disconnect, sync now, toggle overlay visibility, sync summary)

---

### 12. Sidebar & Navigation Updates

#### [MODIFY] [dashboard/layout.tsx](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/dashboard/layout.tsx)
- **Keep**: Varunjit's glassmorphism sidebar with animated active indicator
- **Add nav entries**: GPA Predictor, Semester Roast, Chat
- **Add from Owen**: Google Calendar sync button in header
- **Add from Sukhman**: Google Calendar panel in courses page

---

### 13. Design System Polish

#### [MODIFY] [globals.css](file:///c:/Users/varun/Desktop/Hackathon/SemesterSync/webapp/src/app/globals.css)
- Keep Varunjit's mesh gradient background, glassmorphism utilities
- Add skeleton animation classes from Sukhman
- Add FullCalendar custom styles for Google Calendar event overlays (dotted border for external events)

---

## Consolidated Feature Matrix

| Feature | Source | Priority |
|---------|--------|----------|
| 🎨 Glassmorphism dark theme + 5 presets | Varunjit | ✅ Keep |
| 📤 Animated PDF upload flow | Varunjit | ✅ Keep |
| 📅 FullCalendar (Month + Week) | Varunjit + Sukhman | ✅ Keep |
| 📅 Timeline view | Owen | ✅ Add |
| 🤖 AI Task Breakdown (recursive tree) | Varunjit | ✅ Keep |
| 💬 AI Chat (floating + full page) | Varunjit UI + Sukhman backend | ✅ Merge |
| 📊 Dashboard metrics (stats, charts) | Sukhman | ✅ Add |
| 💀 Doom Week Detector | Owen | ✅ Add |
| 📈 GPA Predictor / Grade Calculator | Owen | ✅ Add |
| 🔥 AI Semester Roast | Owen | ✅ Add |
| 📋 Smart Weekly Planner | Owen | ✅ Add |
| 🗄️ Supabase full DB persistence | Sukhman | ✅ Add |
| 📆 Google Calendar sync (OAuth) | Sukhman | ✅ Add |
| 📆 Google Calendar event overlay | Sukhman | ✅ Add |
| ✅ Deadline completion tracking | Owen + Sukhman | ✅ Add |
| ➕ Manual deadline/event creation | Owen + Sukhman | ✅ Add |
| 🗑️ Event/deadline deletion | Owen | ✅ Add |
| 📎 ICS export | Varunjit | ✅ Keep |
| 🔔 Toast notifications | Owen (sonner) | ✅ Add |
| 💀 Skeleton loaders | Sukhman | ✅ Add |
| 🎲 Course color customization | Varunjit | ✅ Keep |
| 💾 Supabase cache (parse dedup) | Varunjit | ✅ Keep |
| 🔄 AI extraction with local fallback | Sukhman | ✅ Add |
| 📝 Markdown chat rendering | Sukhman | ✅ Add |
| 🌊 Streaming AI responses | Sukhman | ✅ Add |

---

## Resolved Decisions

> [!TIP]
> **1. Supabase schema — RESOLVED.** Using Sukhman's full Supabase schema (courses, deadlines, chat_messages, user_settings tables with RLS + realtime). Will keep Varunjit's `syllabus_cache` table for parse deduplication.

> [!TIP]
> **2. Google Calendar — RESOLVED.** Will implement the Google Calendar integration with graceful degradation — it works when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present in `.env.local`, and shows a "not configured" message otherwise. Credentials will be added when we reach Wave 7.

> [!TIP]
> **3. Owen JSX → TSX — RESOLVED.** Acknowledged. All of Owen's features (GPA Predictor, Semester Roast, Burnout Detector, Smart Planner) will be ported from Vite JSX to Next.js TypeScript as part of Waves 1 and 5.

> [!TIP]
> **4. Data migration — RESOLVED.** Not needed. No one has production data in Owen's localStorage format. Dropped from scope.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify no TypeScript compilation errors
- Run `npm run lint` to check for linting issues
- Test each API route with `curl` or browser DevTools

### Manual Verification
1. **Upload Flow**: Upload a real syllabus PDF → verify events appear on calendar + task board
2. **Dashboard**: Confirm stat cards, workload charts, doom week detection all render correctly
3. **Calendar**: Test month/week/timeline views, course filter pills, event details modal
4. **Task Board**: Verify This Week/Next Week categorization, completion toggles, AI breakdown
5. **Courses Page**: Test color picker, grading breakdown, manual course creation
6. **GPA Predictor**: Input scores, verify grade calculations
7. **Semester Roast**: Generate roast, test copy/regenerate
8. **AI Chat**: Send messages, verify streaming response, check persistence
9. **Google Calendar**: Connect → sync → verify events appear in GCal → toggle overlay
10. **Theme System**: Switch between all 5 presets + custom accent color
11. **ICS Export**: Download and import into a calendar app
12. **Persistence**: Refresh page → verify all data persists via Supabase

---

## Implementation Waves

Each wave is a self-contained chunk of work. Complete and verify each wave before starting the next. Every wave ends with a working, runnable app — no half-broken states.

---

### 🌊 Wave 1 — Foundation: Types, Schema & Dependencies
**Goal:** Set up the shared types, install missing packages, and deploy the merged Supabase schema. No UI changes yet — just plumbing.

**~30 min**

- [ ] **1.1** Create `src/lib/types.ts` — consolidated types from all 3 branches (Course, Deadline, ChatMessage, UserSettings, DeadlineCategory, GoogleCalendarEvent, COURSE_COLORS, CATEGORY_LABELS)
- [ ] **1.2** Update `supabase_schema.sql` — merge Sukhman's full schema (courses, deadlines, chat_messages, user_settings tables + RLS + realtime + storage bucket) with Varunjit's `syllabus_cache` table
- [ ] **1.3** Run the new schema against your Supabase project (via SQL editor in Supabase dashboard)
- [ ] **1.4** Install missing npm packages:
  ```
  npm install sonner react-markdown remark-gfm chrono-node canvas-confetti pdfjs-dist
  npm install -D @types/canvas-confetti
  ```
- [ ] **1.5** Create `src/lib/burnoutDetector.ts` — port Owen's stress scoring engine to TypeScript
- [ ] **1.6** Create `src/lib/dashboardMetrics.ts` — port Sukhman's `computeMetrics()` function to TypeScript

**✅ Checkpoint:** `npm run build` succeeds. New lib files compile without errors.

---

### 🌊 Wave 2 — Data Layer: AppContext → Supabase
**Goal:** Wire AppContext to read/write from Supabase instead of only holding in-memory state. After this wave, data survives page refresh.

**~45 min**

- [ ] **2.1** Refactor `src/context/AppContext.tsx`:
  - On mount: fetch courses + deadlines from Supabase for the logged-in user
  - `addExtractedData()` → writes courses + deadlines to Supabase, then updates local state
  - Add `addCourse()` — insert single course to DB
  - Add `removeCourse()` — delete course + cascade deadlines
  - Add `toggleDeadlineCompletion(id)` — update `completed_at` in Supabase
  - Add `deleteDeadline(id)` — remove from DB
  - Add `addManualDeadline(courseId, title, dueAt)` — insert a deadline without PDF
  - Keep existing color assignment + randomization logic
- [ ] **2.2** Update `src/lib/supabase.ts` / `src/lib/supabase-server.ts` to ensure both client and server Supabase clients are properly configured
- [ ] **2.3** Update upload API (`src/app/api/upload/route.ts`):
  - After parsing, write courses + deadlines to Supabase DB (not just cache)
  - Add retry logic with exponential backoff on 429 (from Owen)

**✅ Checkpoint:** Upload a syllabus → refresh page → data is still there. Manually verify in Supabase dashboard.

---

### 🌊 Wave 3 — Dashboard Upgrade
**Goal:** Rebuild the dashboard using Sukhman's layout as the structural base, applying Varunjit's glassmorphism theme and integrating features from both Owen and Sukhman.

**~1 hour**

- [ ] **3.1** Create `src/components/DashboardSkeleton.tsx` — port Sukhman's skeleton loader, restyle with glassmorphism (replace `bg-ink-*` classes with `bg-white/5 backdrop-blur-xl border-white/10` etc.)
- [ ] **3.2** Rewrite `src/app/dashboard/page.tsx` following Sukhman's section order:
  - **Header** — "Dashboard" title + subtitle + Export ICS button, wrapped in `motion.div` fade-in
  - **Row 1 — Stat cards** (from Sukhman's `KpiCard`): Next Deadline, Due This Week, Missed, Completion Rate
    - Restyle as glassmorphism cards: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-4`
    - Icons use `var(--theme-accent)` color from Varunjit's theme system
    - Each card enters with `motion.div` staggered animation (delay 0.1 * i)
    - **Add 5th card from Owen:** Doom Week stress meter — score 0-20 with colored progress bar (green→amber→orange→red) and emoji severity label
  - **Row 2 — Embedded Calendar** (from Sukhman): FullCalendar month view showing deadlines + Google Calendar event overlay
    - Styled with dark theme calendar CSS from Varunjit
  - **Row 3 — Analytics grid** (3-column, from Sukhman):
    - **Workload by Week** — next 4 weeks, horizontal bar chart with theme-colored bars
    - **Workload by Course** — horizontal bars per course with course color dots
    - **Category Mix** — tag pills showing assignment/exam/quiz/project counts for next 30 days, plus Tracked/Done/Open stat row
    - All 3 cards use glassmorphism styling + `motion.div` entrance
  - **Row 4 — Google Calendar Panel** (from Sukhman): connect/disconnect, sync now, toggle overlay, styled as glassmorphism card
  - **Row 5 — Deadline Lists** (from Sukhman's structure + Owen's urgency features):
    - **Upcoming Deadlines** — list with completion checkbox, urgency badge (overdue=red, today=amber, this week=blue from Owen), course color dot, show more/less toggle
    - **Missed Deadlines** — collapsible section, red-tinted glassmorphism card
    - **Completed** — collapsible section, strikethrough styling, confetti burst on completion (from Owen via `canvas-confetti`)
  - Use `computeMetrics()` from Wave 1 for all data, `analyzeBurnout()` for doom week card
- [ ] **3.3** Wire up `toggleCompleted()` to call `toggleDeadlineCompletion()` from AppContext (Supabase write)
- [ ] **3.4** Wire up ICS export button to call `exportToICS()` from Varunjit's `lib/exportIcs.ts`

**✅ Checkpoint:** Dashboard shows Sukhman's data-rich layout with Varunjit's glassmorphism look. Stat cards animate in. Doom week meter shows stress score. Calendar embeds with events. Deadline lists have urgency badges and completion toggles. Skeleton shows during load.

---

### 🌊 Wave 4 — Task Board & Calendar Enhancements
**Goal:** Upgrade the task board with Owen's smart planner and add timeline view + event management to the calendar.

**~1 hour**

- [ ] **4.1** Rewrite `src/app/dashboard/tasks/page.tsx`:
  - **Left panel — Smart Planner** (from Owen): group deadlines into This Week / Next Week / Upcoming / Completed with urgency badges (overdue → red, today → amber, 7 days → blue), countdown labels, suggested action text
  - Add completion toggle (checkbox) that calls `toggleDeadlineCompletion()`
  - Show/hide completed section toggle
  - **Right panel — AI Breakdown** (keep Varunjit): recursive task tree visualization on selected task
- [ ] **4.2** Enhance `src/app/dashboard/calendar/page.tsx`:
  - Add "Timeline" as a third view mode (port Owen's `TimelineView` — vertical timeline with month labels, color-coded dots, event cards)
  - Add "Add Event" button → small dialog to create a manual deadline (title, date, category, course)
  - Add delete button on event detail slide-over
  - Mark completed events with strikethrough/opacity
- [ ] **4.3** Install `sonner` toast notifications — add `<Toaster>` to root layout, add success/error toasts for key actions (upload, delete, complete)

**✅ Checkpoint:** Task board auto-groups events by urgency. Completion toggles work and persist. Timeline view renders. Custom events can be created/deleted.

---

### 🌊 Wave 5 — New Feature Pages (GPA + Roast + Doom Week)
**Goal:** Add the three new feature pages from Owen, reskinned with Varunjit's design system.

**~1 hour**

- [ ] **5.1** Create `src/app/dashboard/gpa/page.tsx`:
  - Port Owen's GPA Predictor to TSX
  - Per-course grade breakdown: input fields for each grading component → compute current grade (letter + %) and max possible grade
  - Style with glassmorphism cards, motion animations
- [ ] **5.2** Create `src/app/api/roast/route.ts`:
  - Server-side Gemini call with Owen's roast prompt (courses + deadlines summary → comedic 3-5 sentence roast)
- [ ] **5.3** Create `src/app/dashboard/roast/page.tsx`:
  - "Roast My Semester" button → loading animation → display roast in styled quote card
  - Copy to clipboard + regenerate buttons
  - Style: gradient border card, flame icon, dark glassmorphism
- [ ] **5.4** Rewrite `src/app/dashboard/warnings/page.tsx`:
  - Replace placeholder with full Doom Week Detector
  - Stress meter bar (0-20 score, color-coded Chill→Busy→Critical→DOOM)
  - Peak stress week callout
  - Grid of danger weeks with event breakdowns
- [ ] **5.5** Update `src/app/dashboard/layout.tsx`:
  - Add sidebar nav entries for GPA (📈), Roast (🔥), and Doom Week (update icon)
  - Reorder nav: Dashboard, Calendar, Tasks, Courses, Doom Week, GPA, Roast

**✅ Checkpoint:** All three new pages render and function. GPA calculator does math correctly. Roast generates via API. Doom week scores match uploaded data.

---

### 🌊 Wave 6 — AI Chat Upgrade & Courses Page Polish
**Goal:** Upgrade the chatbot to stream responses with markdown, persist messages, and add course management features.

**~1 hour**

- [ ] **6.1** Update `src/app/api/chat/route.ts`:
  - Switch to streaming response (ReadableStream / SSE)
  - Include syllabus text in system prompt for grounded answers (from Sukhman's `chatPrompt.ts`)
  - Save messages to `chat_messages` table
- [ ] **6.2** Upgrade `src/components/Chatbot.tsx`:
  - Load chat history from Supabase on open
  - Streaming text rendering (character-by-character appearance)
  - Render assistant messages with `react-markdown` + `remark-gfm` (code blocks, lists, bold, etc.)
  - Add suggestion pills when chat is empty ("What's due this week?", "Plan my next 2 weeks", etc.)
  - Add Clear conversation button + delete individual messages
  - Skeleton loader while loading history
- [ ] **6.3** (Optional) Create `src/app/dashboard/chat/page.tsx` — full-page chat view for longer conversations
- [ ] **6.4** Enhance `src/app/dashboard/courses/page.tsx`:
  - Add "Add Course" button → manual course creation form (name, color picker)
  - Add delete course button on each card (with confirmation)
  - Add inline PDF upload per course (from Sukhman's `PdfUpload` component)
  - Show current PDF filename if uploaded
  - Display instructor, office hours, policies if extracted by AI
- [ ] **6.5** Enhance `src/components/UploadModal.tsx`:
  - After upload + parse, save PDF to Supabase Storage bucket
  - Save syllabus text to course record for chat grounding

**✅ Checkpoint:** Chat responses stream in real-time with markdown formatting. Messages persist across sessions. Courses can be manually created/deleted. PDFs are stored in Supabase.

---

### 🌊 Wave 7 — Google Calendar Integration & Final Polish
**Goal:** Add Google Calendar OAuth sync and do final polish pass.

**~1.5 hours**

- [ ] **7.1** Create `src/lib/googleCalendar.ts` — port Sukhman's Google Calendar library:
  - `createDeadlineEvent()`, `updateDeadlineEvent()`, `deleteCalendarEvent()`
  - `listSemesterSyncEvents()`, `listPrimaryEvents()`
  - Color matching (hex → nearest Google Calendar colorId)
- [ ] **7.2** Create Google API routes (`src/app/api/google/`):
  - `status/route.ts` — check if user has connected Google Calendar
  - `sync/route.ts` — push all deadlines to Google Calendar (create/update/delete to match)
  - `events/route.ts` — fetch primary calendar events for overlay display
  - `settings/route.ts` — PATCH toggle for `show_gcal_events`
  - `disconnect/route.ts` — revoke refresh token, clear settings
- [ ] **7.3** Create `src/components/GoogleCalendarPanel.tsx`:
  - Connect / Disconnect buttons
  - Sync Now button with progress
  - Toggle "Show Google Calendar events" switch
  - Status indicator (connected + last sync time)
- [ ] **7.4** Add Google Calendar panel to Courses page (bottom section)
- [ ] **7.5** Update Calendar page to overlay Google Calendar events (dotted border, different style from deadline events)
- [ ] **7.6** Final polish pass:
  - Verify all theme presets work across every page
  - Ensure mobile responsiveness on sidebar collapse
  - Add loading states / error boundaries everywhere
  - Remove debug files (`debug_syllabus_text.txt`, console.logs)
  - Update `README.md` with setup instructions and feature list
  - Run `npm run build` — fix any remaining TypeScript errors

**✅ Checkpoint:** Full end-to-end flow works: sign in → upload syllabus → see data on dashboard/calendar/tasks → complete deadlines → use GPA calculator → get roasted → chat with AI → sync to Google Calendar → export ICS → switch themes. Build succeeds with zero errors.

---

### Wave Summary

| Wave | Focus | Est. Time | Key Deliverables |
|------|-------|-----------|------------------|
| **1** | Foundation | 30 min | Types, schema, dependencies, utility libs |
| **2** | Data layer | 45 min | Supabase persistence, data survives refresh |
| **3** | Dashboard | 45 min | Metrics, doom alert, skeleton loaders |
| **4** | Tasks + Calendar | 1 hr | Smart planner, timeline view, event CRUD, toasts |
| **5** | New pages | 1 hr | GPA Predictor, Semester Roast, Doom Week page |
| **6** | Chat + Courses | 1 hr | Streaming AI chat, markdown, course management |
| **7** | Google Cal + Polish | 1.5 hr | Google Calendar sync, final QA, README |
| | **Total** | **~6 hours** | |
