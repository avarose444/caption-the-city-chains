-- Prompt chain tool. Run in the Supabase SQL editor after observability.sql.
-- Safe to run more than once.

-- Test runs can use an uploaded image that isn't a photo in the app.
alter table public.generation_requests add column if not exists image_url text;

-- Runs from the tool are labeled 'tool'.
alter table public.generation_requests drop constraint if exists generation_requests_source_check;
alter table public.generation_requests add constraint generation_requests_source_check
  check (source in ('post', 'more', 'admin', 'backfill', 'tool'));
