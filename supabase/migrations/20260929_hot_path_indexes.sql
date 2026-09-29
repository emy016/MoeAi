-- Indexes on the foreign keys every chat and course list touches, ahead of a
-- full class using the app at once. Cheap now, and they stop sequential scans
-- as course_chunks and enrollments grow.
create index if not exists course_chunks_material_idx on public.course_chunks (material_id);
create index if not exists course_materials_course_idx on public.course_materials (course_id);
create index if not exists course_enrollments_user_idx on public.course_enrollments (user_id);
create index if not exists org_members_user_idx on public.org_members (user_id);
create index if not exists org_identities_user_idx on public.org_identities (user_id);
create index if not exists courses_org_idx on public.courses (org_id);
create index if not exists conversations_course_idx on public.conversations (course_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index if not exists org_join_redemptions_user_idx on public.org_join_redemptions (user_id);
