-- =============================================================================
-- WVF Training App — Initial Schema
-- Migration: 0001_initial_schema.sql
-- Run via: Supabase dashboard SQL editor, or `supabase db push`
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

create type user_role as enum ('client', 'coach');

create type tag_category as enum (
  'movement_pattern',
  'muscle_group',
  'equipment',
  'training_intent',
  'difficulty',
  'body_position',
  'plane_of_movement',
  'energy_system'
);

-- =============================================================================
-- PROFILES
-- Extends auth.users (one row per user). Role determines which view they see.
-- =============================================================================

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role not null default 'client',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================================================
-- CLIENTS
-- Extra coach-managed metadata for client users.
-- =============================================================================

create table clients (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  package_label     text,               -- e.g. "WVF Membership", "Intelia fit"
  checkin_day       smallint check (checkin_day between 0 and 6),  -- 0=Sun…6=Sat
  start_weight_kg   numeric(5,2),
  notes             text,               -- private coach notes
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index clients_profile_id_idx on clients(profile_id);

-- =============================================================================
-- EXERCISES
-- Wayne's exercise library — every exercise has an optional demo video.
-- =============================================================================

create table exercises (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  video_url             text,               -- external URL fallback
  video_storage_path    text,               -- Supabase Storage path (preferred)
  created_by            uuid not null references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- =============================================================================
-- TAGS (categories A–H from Wayne's tag structure doc)
-- =============================================================================

create table tags (
  id          uuid primary key default gen_random_uuid(),
  category    tag_category not null,
  name        text not null,
  sort_order  smallint not null default 0,
  unique (category, name)
);

-- Many-to-many: exercises ↔ tags
create table exercise_tags (
  exercise_id   uuid not null references exercises(id) on delete cascade,
  tag_id        uuid not null references tags(id) on delete cascade,
  primary key (exercise_id, tag_id)
);

-- =============================================================================
-- SEED TAGS (Wayne's categories A–H)
-- =============================================================================

-- A. Movement Pattern
insert into tags (category, name, sort_order) values
  ('movement_pattern', 'Squat',                  1),
  ('movement_pattern', 'Lunge',                  2),
  ('movement_pattern', 'Hip hinge',              3),
  ('movement_pattern', 'Push — horizontal',      4),
  ('movement_pattern', 'Push — vertical',        5),
  ('movement_pattern', 'Pull — horizontal',      6),
  ('movement_pattern', 'Pull — vertical',        7),
  ('movement_pattern', 'Carry',                  8),
  ('movement_pattern', 'Anti-extension',         9),
  ('movement_pattern', 'Anti-rotation',         10),
  ('movement_pattern', 'Anti-lateral flexion',  11),
  ('movement_pattern', 'Rotation',              12),
  ('movement_pattern', 'Plyometric',            13),
  ('movement_pattern', 'Locomotion',            14);

-- B. Muscle Group
insert into tags (category, name, sort_order) values
  ('muscle_group', 'Quads',       1),
  ('muscle_group', 'Hamstrings',  2),
  ('muscle_group', 'Glutes',      3),
  ('muscle_group', 'Calves',      4),
  ('muscle_group', 'Chest',       5),
  ('muscle_group', 'Upper back',  6),
  ('muscle_group', 'Lats',        7),
  ('muscle_group', 'Shoulders',   8),
  ('muscle_group', 'Biceps',      9),
  ('muscle_group', 'Triceps',    10),
  ('muscle_group', 'Core',       11);

-- C. Equipment / Environment
insert into tags (category, name, sort_order) values
  ('equipment', 'Full gym',          1),
  ('equipment', 'PT studio',         2),
  ('equipment', 'At home',           3),
  ('equipment', 'No equipment',      4),
  ('equipment', 'Barbell',           5),
  ('equipment', 'Dumbbell',          6),
  ('equipment', 'Kettlebell',        7),
  ('equipment', 'Bands',             8),
  ('equipment', 'Machine',           9),
  ('equipment', 'Suspension',       10),
  ('equipment', 'Cardio equipment', 11);

-- D. Training Intent
insert into tags (category, name, sort_order) values
  ('training_intent', 'Strength',        1),
  ('training_intent', 'Hypertrophy',     2),
  ('training_intent', 'Power',           3),
  ('training_intent', 'Endurance',       4),
  ('training_intent', 'Conditioning',    5),
  ('training_intent', 'Mobility',        6),
  ('training_intent', 'Activation',      7),
  ('training_intent', 'Rehab / Prehab',  8),
  ('training_intent', 'Stretching',      9),
  ('training_intent', 'Skill / Technique', 10);

-- E. Difficulty / Level
insert into tags (category, name, sort_order) values
  ('difficulty', 'Beginner',     1),
  ('difficulty', 'Intermediate', 2),
  ('difficulty', 'Advanced',     3),
  ('difficulty', 'Regression',   4),
  ('difficulty', 'Progression',  5);

-- F. Body Position
insert into tags (category, name, sort_order) values
  ('body_position', 'Standing',        1),
  ('body_position', 'Seated',          2),
  ('body_position', 'Supine',          3),
  ('body_position', 'Prone',           4),
  ('body_position', 'Half kneeling',   5),
  ('body_position', 'Tall kneeling',   6),
  ('body_position', 'Single leg',      7);

-- G. Plane of Movement
insert into tags (category, name, sort_order) values
  ('plane_of_movement', 'Sagittal',   1),
  ('plane_of_movement', 'Frontal',    2),
  ('plane_of_movement', 'Transverse', 3);

-- H. Energy System
insert into tags (category, name, sort_order) values
  ('energy_system', 'Aerobic',    1),
  ('energy_system', 'Anaerobic',  2),
  ('energy_system', 'Sprint',     3),
  ('energy_system', 'Tempo',      4);

-- =============================================================================
-- PROGRAMS
-- Wayne builds programs; clients get assigned to them.
-- =============================================================================

create table programs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  is_template   boolean not null default true,  -- true = shared, false = bespoke
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Junction: which clients have which programs
create table client_programs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  program_id    uuid not null references programs(id) on delete cascade,
  assigned_at   timestamptz not null default now(),
  is_active     boolean not null default true,
  unique (client_id, program_id)
);

-- =============================================================================
-- PROGRAM STRUCTURE: days → sections → exercises
-- =============================================================================

create table program_days (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references programs(id) on delete cascade,
  day_number    smallint not null,
  name          text not null,             -- e.g. "Day 1 — Upper Body"
  sort_order    smallint not null default 0
);

create table program_sections (
  id                uuid primary key default gen_random_uuid(),
  program_day_id    uuid not null references program_days(id) on delete cascade,
  name              text not null,         -- e.g. "Warm Up", "Main Lifts"
  sort_order        smallint not null default 0
);

create table program_exercises (
  id                    uuid primary key default gen_random_uuid(),
  program_section_id    uuid not null references program_sections(id) on delete cascade,
  exercise_id           uuid not null references exercises(id),
  sets                  smallint,
  reps_min              smallint,
  reps_max              smallint,
  duration_seconds      smallint,          -- for timed exercises
  target_weight_kg      numeric(6,2),
  notes                 text,
  sort_order            smallint not null default 0
);

-- =============================================================================
-- WORKOUT LOGS
-- A record of a client completing a program day.
-- =============================================================================

create table workout_logs (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients(id) on delete cascade,
  program_day_id    uuid not null references program_days(id),
  logged_at         timestamptz not null default now(),
  notes             text
);

-- Individual set data within a workout log
create table set_logs (
  id                    uuid primary key default gen_random_uuid(),
  workout_log_id        uuid not null references workout_logs(id) on delete cascade,
  program_exercise_id   uuid not null references program_exercises(id),
  set_number            smallint not null,
  weight_kg             numeric(6,2),
  reps                  smallint,
  duration_seconds      smallint,
  notes                 text
);

-- Index for fast "last week's lifts" queries
create index set_logs_program_exercise_idx on set_logs(program_exercise_id);
create index workout_logs_client_day_idx on workout_logs(client_id, program_day_id, logged_at desc);

-- =============================================================================
-- CHECK-INS
-- Weekly (always) + monthly measurements/photos (once per month).
-- =============================================================================

create table checkins (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references clients(id) on delete cascade,
  week_starting       date not null,       -- ISO Monday of the check-in week
  -- Weekly fields
  weight_kg           numeric(5,2),
  training_rating     text,
  food_rating         text,
  free_text           text,
  -- Monthly-only fields (null on regular weekly check-ins)
  chest_cm            numeric(5,1),
  waist_cm            numeric(5,1),
  hips_cm             numeric(5,1),
  thigh_cm            numeric(5,1),
  bicep_cm            numeric(5,1),
  photo_front_path    text,
  photo_side_path     text,
  photo_back_path     text,
  -- Coach response
  coach_reply         text,
  reviewed_at         timestamptz,
  submitted_at        timestamptz not null default now(),
  unique (client_id, week_starting)
);

-- =============================================================================
-- FOOD DIARY
-- One row per client per day. Saves as the client types (upsert pattern).
-- =============================================================================

create table food_diary (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  diary_date      date not null,
  breakfast       text,
  lunch           text,
  dinner          text,
  snacks          text,
  water_litres    numeric(4,2),
  updated_at      timestamptz not null default now(),
  unique (client_id, diary_date)
);

-- =============================================================================
-- RESOURCE LIBRARY
-- Folders → PDF files. All clients see the same content.
-- =============================================================================

create table resource_folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

create table resources (
  id              uuid primary key default gen_random_uuid(),
  folder_id       uuid not null references resource_folders(id) on delete cascade,
  name            text not null,
  storage_path    text not null,   -- Supabase Storage path
  created_at      timestamptz not null default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
alter table profiles         enable row level security;
alter table clients          enable row level security;
alter table exercises        enable row level security;
alter table tags             enable row level security;
alter table exercise_tags    enable row level security;
alter table programs         enable row level security;
alter table client_programs  enable row level security;
alter table program_days     enable row level security;
alter table program_sections enable row level security;
alter table program_exercises enable row level security;
alter table workout_logs     enable row level security;
alter table set_logs         enable row level security;
alter table checkins         enable row level security;
alter table food_diary       enable row level security;
alter table resource_folders enable row level security;
alter table resources        enable row level security;

-- Helper: is the current user the coach?
create or replace function is_coach()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'coach'
  );
$$;

-- Helper: get the clients.id for the current user (null if coach)
create or replace function my_client_id()
returns uuid
language sql
security definer
as $$
  select id from clients where profile_id = auth.uid() limit 1;
$$;

-- --- profiles ---
create policy "Users can view their own profile"
  on profiles for select using (id = auth.uid());
create policy "Coach can view all profiles"
  on profiles for select using (is_coach());
create policy "Users can update their own profile"
  on profiles for update using (id = auth.uid());

-- --- clients ---
create policy "Coach can do everything with clients"
  on clients for all using (is_coach());
create policy "Client can view their own record"
  on clients for select using (profile_id = auth.uid());

-- --- exercises, tags, exercise_tags (coach manages, clients read) ---
create policy "Anyone authenticated can view exercises"
  on exercises for select using (auth.uid() is not null);
create policy "Coach can manage exercises"
  on exercises for all using (is_coach());

create policy "Anyone authenticated can view tags"
  on tags for select using (auth.uid() is not null);
create policy "Coach can manage tags"
  on tags for all using (is_coach());

create policy "Anyone authenticated can view exercise_tags"
  on exercise_tags for select using (auth.uid() is not null);
create policy "Coach can manage exercise_tags"
  on exercise_tags for all using (is_coach());

-- --- programs ---
create policy "Coach can manage programs"
  on programs for all using (is_coach());
create policy "Clients can view programs assigned to them"
  on programs for select using (
    exists (
      select 1 from client_programs cp
      join clients c on c.id = cp.client_id
      where cp.program_id = programs.id
        and c.profile_id = auth.uid()
        and cp.is_active = true
    )
  );

-- --- client_programs ---
create policy "Coach can manage client_programs"
  on client_programs for all using (is_coach());
create policy "Clients can view their own assignments"
  on client_programs for select using (
    client_id = my_client_id()
  );

-- --- program_days, program_sections, program_exercises ---
create policy "Coach can manage program_days"
  on program_days for all using (is_coach());
create policy "Clients can view program_days for their active programs"
  on program_days for select using (
    exists (
      select 1 from client_programs cp
      join clients c on c.id = cp.client_id
      where cp.program_id = program_days.program_id
        and c.profile_id = auth.uid()
        and cp.is_active = true
    )
  );

create policy "Coach can manage program_sections"
  on program_sections for all using (is_coach());
create policy "Clients can view their program sections"
  on program_sections for select using (
    exists (
      select 1 from program_days pd
      join client_programs cp on cp.program_id = pd.program_id
      join clients c on c.id = cp.client_id
      where pd.id = program_sections.program_day_id
        and c.profile_id = auth.uid()
        and cp.is_active = true
    )
  );

create policy "Coach can manage program_exercises"
  on program_exercises for all using (is_coach());
create policy "Clients can view their program exercises"
  on program_exercises for select using (
    exists (
      select 1 from program_sections ps
      join program_days pd on pd.id = ps.program_day_id
      join client_programs cp on cp.program_id = pd.program_id
      join clients c on c.id = cp.client_id
      where ps.id = program_exercises.program_section_id
        and c.profile_id = auth.uid()
        and cp.is_active = true
    )
  );

-- --- workout_logs & set_logs ---
create policy "Clients can manage their own workout logs"
  on workout_logs for all using (client_id = my_client_id());
create policy "Coach can view all workout logs"
  on workout_logs for select using (is_coach());

create policy "Clients can manage their own set logs"
  on set_logs for all using (
    exists (
      select 1 from workout_logs wl
      where wl.id = set_logs.workout_log_id
        and wl.client_id = my_client_id()
    )
  );
create policy "Coach can view all set logs"
  on set_logs for select using (is_coach());

-- --- checkins ---
create policy "Clients can manage their own check-ins"
  on checkins for all using (client_id = my_client_id());
create policy "Coach can view and reply to all check-ins"
  on checkins for all using (is_coach());

-- --- food_diary ---
create policy "Clients can manage their own food diary"
  on food_diary for all using (client_id = my_client_id());
create policy "Coach can view all food diary entries"
  on food_diary for select using (is_coach());

-- --- resource_folders & resources (coach manages, clients read) ---
create policy "Anyone authenticated can view resource folders"
  on resource_folders for select using (auth.uid() is not null);
create policy "Coach can manage resource folders"
  on resource_folders for all using (is_coach());

create policy "Anyone authenticated can view resources"
  on resources for select using (auth.uid() is not null);
create policy "Coach can manage resources"
  on resources for all using (is_coach());

-- =============================================================================
-- STORAGE BUCKETS (run separately in Supabase dashboard or via CLI)
-- =============================================================================
--
-- Create these buckets manually (Storage > New bucket):
--
--   checkin-photos    (private, max 10MB per file)
--   resources         (private, max 50MB per file — PDFs)
--
-- Note: exercise videos are linked via YouTube URL — no storage bucket needed.
--
-- Access control: all buckets are private; serve via signed URLs in the app.
--
-- =============================================================================
