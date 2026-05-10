# SemesterSync

GDG hackathon submission. Drop in your syllabus PDFs and SemesterSync auto-extracts every deadline onto one color-coded calendar you can export anywhere.

## Features

- Sign in with Google (Supabase Auth + Google OAuth)
- Add courses with a color
- Upload syllabus PDFs (Supabase Storage); text is extracted in the browser with `pdfjs-dist`, then **Gemini** scans it via a server Route Handler and returns clean titles, categories (assignment / quiz / exam / project / reading / lab / presentation / other), and ISO due dates. A local `chrono-node` heuristic kicks in as a fallback when no Gemini key is set.
- Color-coded month/week calendar (FullCalendar) with per-course colors and category tags on each event
- One-click `.ics` export to import into Google Calendar, Apple Calendar, Outlook, etc. (categories included as `CATEGORIES:` lines)
- Per-course notes & chat backed by Supabase Postgres + realtime subscriptions

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`): Auth, Postgres, Storage, Realtime
- Google Gemini (`gemini-2.5-flash`) for structured deadline extraction
- FullCalendar React, pdfjs-dist, chrono-node (fallback)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at <https://supabase.com>

   - In **Authentication → Providers**, enable **Google** and follow the setup wizard to plug in a Google OAuth client ID/secret. Supabase shows you the Authorized redirect URI to paste into Google Cloud Console.
   - In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production URL once you deploy) to the **Redirect URLs** allow-list.
   - Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). It creates the `courses`, `deadlines`, `chat_messages` tables, adds RLS policies, enables realtime on those tables, and creates a private `syllabi` storage bucket with owner-scoped policies.

3. **Configure env**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in:

   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API → anon public key
   - `GEMINI_API_KEY` *(optional but strongly recommended)* — grab a free key from <https://aistudio.google.com/app/apikey>. Without it the app silently falls back to the local heuristic extractor.

4. **Run**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>, sign in with Google, add a course, and upload a syllabus.

## Project structure

- `app/` – Next.js routes
  - `/` landing page with Google sign-in
  - `/auth/callback` Route Handler that exchanges the OAuth code for a session
  - `/api/extract-deadlines` Route Handler that calls Gemini (server-side, key never reaches the browser)
  - `/dashboard`, `/dashboard/courses`, `/dashboard/chat` (auth-guarded)
- `components/` – `AuthProvider`, `AuthButton`, `CalendarView`, `CourseForm`, `PdfUpload`, `ChatPanel`
- `lib/supabase.ts` – browser Supabase singleton
- `lib/supabaseServer.ts` – cookie-aware server client for the OAuth callback
- `lib/extractDeadlines.ts` – PDF text extraction, AI client wrapper, and chrono-node fallback parser
- `lib/ics.ts` – ICS calendar serializer + browser download
- `lib/hooks.ts` – realtime hooks (`useCourses`, `useDeadlines`)
- `supabase/schema.sql` – DB schema, RLS policies, realtime publication, storage bucket + policies

## Data model (Postgres / `public` schema)

- `courses` `(id uuid pk, user_id uuid, name text, color text, pdf_storage_path text, pdf_file_name text, created_at timestamptz)`
- `deadlines` `(id uuid pk, user_id uuid, course_id uuid, title text, due_at timestamptz, source_snippet text, created_at timestamptz)`
- `chat_messages` `(id uuid pk, user_id uuid, course_id uuid, user_name text, user_photo text, text text, created_at timestamptz)`

Every table has Row Level Security enabled with `auth.uid() = user_id` policies for select/insert/update/delete. Storage objects in the `syllabi` bucket are restricted by the leading path segment (`<uid>/...`).

## Roadmap (post-MVP)

- True two-way Google Calendar sync (Google Calendar API + refresh tokens)
- LLM-backed deadline extraction (Gemini / OpenAI) for tricky syllabi
- Shared courses / cohorts so chat becomes multi-user
- Mobile-friendly polish + PWA install
