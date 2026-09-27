-- Organizer works file by file: each ready file gets a digest (topics, glossary,
-- formulas, mistakes), then one merge builds the course map from the digests.
alter table public.course_materials add column if not exists digest jsonb;
