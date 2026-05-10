-- Run in Supabase → SQL Editor (or psql against your project DB).
-- Expect three rows; relrowsecurity should be true for courses, deadlines, chat_messages.
select relname, relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and relname in ('courses', 'deadlines', 'chat_messages');
