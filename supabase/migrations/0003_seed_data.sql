-- =============================================================================
-- WVF Training App — Demo Seed Data
-- Migration: 0003_seed_data.sql
-- Run AFTER 0002_schema_updates.sql
-- Creates 3 demo clients, exercises, 2 programs, and check-in history
-- NOTE: This file is for local development only. Do NOT apply to production.
-- Demo account passwords are stored separately in local dev notes — never in source control.
-- =============================================================================

DO $$
DECLARE
  coach_id uuid;

  -- Demo client auth UUIDs (fixed so seed is idempotent)
  trent_id   uuid := 'a0000001-0000-0000-0000-000000000001';
  isla_id    uuid := 'a0000001-0000-0000-0000-000000000002';
  melanie_id uuid := 'a0000001-0000-0000-0000-000000000003';

  -- clients table IDs
  trent_cid   uuid := 'b0000001-0000-0000-0000-000000000001';
  isla_cid    uuid := 'b0000001-0000-0000-0000-000000000002';
  melanie_cid uuid := 'b0000001-0000-0000-0000-000000000003';

  -- Exercise IDs
  ex01 uuid := 'e0000001-0000-0000-0000-000000000001'; -- 90/90 Breathing
  ex02 uuid := 'e0000001-0000-0000-0000-000000000002'; -- Thread the Needle
  ex03 uuid := 'e0000001-0000-0000-0000-000000000003'; -- Ankle Reapers
  ex04 uuid := 'e0000001-0000-0000-0000-000000000004'; -- Scapular Push Up
  ex05 uuid := 'e0000001-0000-0000-0000-000000000005'; -- Lock 3 Protocol
  ex06 uuid := 'e0000001-0000-0000-0000-000000000006'; -- Safety Bar Squat
  ex07 uuid := 'e0000001-0000-0000-0000-000000000007'; -- KB Half Kneeling Shoulder Press
  ex08 uuid := 'e0000001-0000-0000-0000-000000000008'; -- Walking Lunges
  ex09 uuid := 'e0000001-0000-0000-0000-000000000009'; -- Incline Push Up
  ex10 uuid := 'e0000001-0000-0000-0000-000000000010'; -- KB Suitcase Deadlift
  ex11 uuid := 'e0000001-0000-0000-0000-000000000011'; -- KB Goblet Squat
  ex12 uuid := 'e0000001-0000-0000-0000-000000000012'; -- DB Bench Press
  ex13 uuid := 'e0000001-0000-0000-0000-000000000013'; -- KB Single Arm Bench Press
  ex14 uuid := 'e0000001-0000-0000-0000-000000000014'; -- Static Lunge
  ex15 uuid := 'e0000001-0000-0000-0000-000000000015'; -- 90/90 Hip Lift
  ex16 uuid := 'e0000001-0000-0000-0000-000000000016'; -- Cat Cow
  ex17 uuid := 'e0000001-0000-0000-0000-000000000017'; -- Romanian Deadlift
  ex18 uuid := 'e0000001-0000-0000-0000-000000000018'; -- Seated Cable Row
  ex19 uuid := 'e0000001-0000-0000-0000-000000000019'; -- Single Leg RDL
  ex20 uuid := 'e0000001-0000-0000-0000-000000000020'; -- Lat Pulldown
  ex21 uuid := 'e0000001-0000-0000-0000-000000000021'; -- Kettlebell Swing
  ex22 uuid := 'e0000001-0000-0000-0000-000000000022'; -- Nordic Curl Negative
  ex23 uuid := 'e0000001-0000-0000-0000-000000000023'; -- Face Pull
  ex24 uuid := 'e0000001-0000-0000-0000-000000000024'; -- World's Greatest Stretch
  ex25 uuid := 'e0000001-0000-0000-0000-000000000025'; -- Side Lying Clam Shell
  ex26 uuid := 'e0000001-0000-0000-0000-000000000026'; -- Bulgarian Split Squat
  ex27 uuid := 'e0000001-0000-0000-0000-000000000027'; -- Dumbbell Row
  ex28 uuid := 'e0000001-0000-0000-0000-000000000028'; -- Hip Thrust
  ex29 uuid := 'e0000001-0000-0000-0000-000000000029'; -- Pallof Press
  ex30 uuid := 'e0000001-0000-0000-0000-000000000030'; -- Band Pull Apart

  -- Program IDs
  prog3 uuid := 'c0000001-0000-0000-0000-000000000001';
  prog2 uuid := 'c0000001-0000-0000-0000-000000000002';

  -- Program day IDs
  p3d1 uuid := 'd0000001-0000-0000-0001-000000000001';
  p3d2 uuid := 'd0000001-0000-0000-0001-000000000002';
  p3d3 uuid := 'd0000001-0000-0000-0001-000000000003';
  p2d1 uuid := 'd0000001-0000-0000-0002-000000000001';
  p2d2 uuid := 'd0000001-0000-0000-0002-000000000002';

  -- Section IDs
  s3d1wu uuid := 'f0000001-0001-0001-0000-000000000001'; -- 3day d1 warmup
  s3d1wo uuid := 'f0000001-0001-0001-0000-000000000002'; -- 3day d1 workout
  s3d1cd uuid := 'f0000001-0001-0001-0000-000000000003'; -- 3day d1 cooldown
  s3d2wu uuid := 'f0000001-0001-0002-0000-000000000001';
  s3d2wo uuid := 'f0000001-0001-0002-0000-000000000002';
  s3d2cd uuid := 'f0000001-0001-0002-0000-000000000003';
  s3d3wu uuid := 'f0000001-0001-0003-0000-000000000001';
  s3d3wo uuid := 'f0000001-0001-0003-0000-000000000002';
  s3d3cd uuid := 'f0000001-0001-0003-0000-000000000003';
  s2d1wu uuid := 'f0000001-0002-0001-0000-000000000001';
  s2d1wo uuid := 'f0000001-0002-0001-0000-000000000002';
  s2d2wu uuid := 'f0000001-0002-0002-0000-000000000001';
  s2d2wo uuid := 'f0000001-0002-0002-0000-000000000002';

BEGIN
  -- =========================================================
  -- Coach profile
  -- =========================================================
  SELECT id INTO coach_id FROM profiles WHERE role = 'coach' LIMIT 1;
  IF coach_id IS NULL THEN
    RAISE EXCEPTION 'No coach profile found. Ensure Wayne is set up as coach first.';
  END IF;

  -- =========================================================
  -- Demo client auth users
  -- =========================================================
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES
  (
    trent_id, '00000000-0000-0000-0000-000000000000',
    'trent.demo@wvf.app', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Trent Di Corleto"}',
    false, 'authenticated', 'authenticated', '', '', '', ''
  ),
  (
    isla_id, '00000000-0000-0000-0000-000000000000',
    'isla.demo@wvf.app', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Isla Corlett"}',
    false, 'authenticated', 'authenticated', '', '', '', ''
  ),
  (
    melanie_id, '00000000-0000-0000-0000-000000000000',
    'melanie.demo@wvf.app', crypt('Demo1234!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Melanie Cauchi"}',
    false, 'authenticated', 'authenticated', '', '', '', ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Ensure profiles exist (trigger should auto-create, this is a safety net)
  INSERT INTO profiles (id, full_name, role)
  VALUES
    (trent_id,   'Trent Di Corleto', 'client'),
    (isla_id,    'Isla Corlett',     'client'),
    (melanie_id, 'Melanie Cauchi',   'client')
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, role = 'client';

  -- =========================================================
  -- Client records
  -- =========================================================
  INSERT INTO clients (id, profile_id, package_label, checkin_day, is_active)
  VALUES
    (trent_cid,   trent_id,   'WVF Membership', 1, true),
    (isla_cid,    isla_id,    'WVF Membership', 1, true),
    (melanie_cid, melanie_id, 'WVF Membership', 1, true)
  ON CONFLICT (profile_id) DO NOTHING;

  -- =========================================================
  -- Exercises
  -- =========================================================
  INSERT INTO exercises (id, name, created_by) VALUES
    (ex01, '90/90 Breathing',                          coach_id),
    (ex02, 'Thread the Needle',                        coach_id),
    (ex03, 'Ankle Reapers',                            coach_id),
    (ex04, 'Scapular Push Up (3x Variations)',         coach_id),
    (ex05, 'Lock 3 Protocol',                          coach_id),
    (ex06, 'Safety Bar Squat',                         coach_id),
    (ex07, 'KB Half Kneeling Shoulder Press',          coach_id),
    (ex08, 'Walking Lunges',                           coach_id),
    (ex09, 'Incline Push Up',                          coach_id),
    (ex10, 'KB Suitcase Deadlift',                     coach_id),
    (ex11, 'KB Goblet Squat',                          coach_id),
    (ex12, 'DB Bench Press',                           coach_id),
    (ex13, 'KB Single Arm Bench Press (Rehab)',        coach_id),
    (ex14, 'Static Lunge – Movement Pattern Drill',   coach_id),
    (ex15, '90/90 Hip Lift',                           coach_id),
    (ex16, 'Cat Cow',                                  coach_id),
    (ex17, 'Romanian Deadlift',                        coach_id),
    (ex18, 'Seated Cable Row',                         coach_id),
    (ex19, 'Single Leg Romanian Deadlift',             coach_id),
    (ex20, 'Lat Pulldown',                             coach_id),
    (ex21, 'Kettlebell Swing',                         coach_id),
    (ex22, 'Nordic Curl Negative',                     coach_id),
    (ex23, 'Face Pull',                                coach_id),
    (ex24, 'World''s Greatest Stretch',                coach_id),
    (ex25, 'Side Lying Clam Shell',                    coach_id),
    (ex26, 'Bulgarian Split Squat',                    coach_id),
    (ex27, 'Dumbbell Row',                             coach_id),
    (ex28, 'Hip Thrust',                               coach_id),
    (ex29, 'Pallof Press',                             coach_id),
    (ex30, 'Band Pull Apart',                          coach_id)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- Programs
  -- =========================================================
  INSERT INTO programs (id, name, description, is_template, created_by) VALUES
  (
    prog3,
    '2026 Jan – Apr (3 Day Program)',
    E'Weekly Structure\nDay 1: Squat + Push + Core/Carry Focus\nDay 2: Hinge + Pull + Hamstring/Glute Focus\nDay 3: Full-body Conditioning + Balance/Glute/Upper back Focus\n\nEach session: 5 min mobility + 35–40 min lifting (supersets)\n\nWhy this works for fat loss: Big compounds early = high energy output. Supersets = density without junk cardio. Carries challenge stability and grip under fatigue.',
    true, coach_id
  ),
  (
    prog2,
    '2026 Jan – Apr (2 Day Program)',
    E'A streamlined 2-day upper/lower split. Perfect for clients with limited training time.\n\nDay 1: Lower body + Push\nDay 2: Upper body + Pull\n\nEach session includes a warm-up, two supersets, and a cool-down. ~40 minutes total.',
    true, coach_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- Program Days
  -- =========================================================
  INSERT INTO program_days (id, program_id, day_number, name, sort_order) VALUES
    (p3d1, prog3, 1, 'Day 1 – Squat / Push / Carry',                                1),
    (p3d2, prog3, 2, 'Day 2 – Hinge / Pull / Single Leg',                           2),
    (p3d3, prog3, 3, 'Day 3 – Full-body Conditioning + Balance / Glute / Upper Back',3),
    (p2d1, prog2, 1, 'Day 1 – Lower Body + Push',                                   1),
    (p2d2, prog2, 2, 'Day 2 – Upper Body + Pull',                                   2)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- Program Sections
  -- =========================================================
  INSERT INTO program_sections (id, program_day_id, name, sort_order) VALUES
    (s3d1wu, p3d1, 'Warm Up',   1), (s3d1wo, p3d1, 'Workout',   2), (s3d1cd, p3d1, 'Cool Down', 3),
    (s3d2wu, p3d2, 'Warm Up',   1), (s3d2wo, p3d2, 'Workout',   2), (s3d2cd, p3d2, 'Cool Down', 3),
    (s3d3wu, p3d3, 'Warm Up',   1), (s3d3wo, p3d3, 'Workout',   2), (s3d3cd, p3d3, 'Cool Down', 3),
    (s2d1wu, p2d1, 'Warm Up',   1), (s2d1wo, p2d1, 'Workout',   2),
    (s2d2wu, p2d2, 'Warm Up',   1), (s2d2wo, p2d2, 'Workout',   2)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- Program Exercises — 3-Day Program, Day 1
  -- =========================================================
  -- Warm Up
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, duration_seconds, notes, label, sort_order)
  VALUES
    (s3d1wu, ex01, 1,    4,  6, NULL, 'Knee and hips at 90 degrees, tuck pelvis gently',     'A', 1),
    (s3d1wu, ex02, 1,    6,  6, NULL, 'Can be done with a straight arm for more range',       'B', 2),
    (s3d1wu, ex03, NULL, NULL, NULL, 60, 'Rocking 10 each ankle',                             'C', 3),
    (s3d1wu, ex04, 1,    10, 12, NULL, 'Think of dropping the chest as low as possible',      'D', 4),
    (s3d1wu, ex05, 1,    10, 12, NULL, 'Complete all 3 different positions',                  'E', 5);

  -- Workout
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, superset_group, rir_min, rir_max, rest_seconds, sort_order)
  VALUES
    (s3d1wo, ex06, 3, 5,    8,    NULL,                              'A1', 'A', 2, 3, 60, 1),
    (s3d1wo, ex07, 3, 6,    10,   NULL,                              'A2', 'A', NULL, NULL, 60, 2),
    (s3d1wo, ex08, 3, 10,   15,   '10–15 reps each side',           'B1', 'B', NULL, NULL, 60, 3),
    (s3d1wo, ex09, 3, 8,    12,   'Use a secure elevated position',  'B2', 'B', 1, 2, 60, 4),
    (s3d1wo, ex10, 3, NULL, NULL, '20–30m per side',                 'C',  NULL, NULL, NULL, 30, 5);

  -- Cool Down
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, rir_min, rir_max, rest_seconds, sort_order)
  VALUES
    (s3d1cd, ex11, 3, 12, 15, NULL,                                          'A', 0,    0,    NULL, 1),
    (s3d1cd, ex12, 3, 8,  12, 'Squeeze shoulders back, elbows at 45°',      'B', 2,    3,    60,   2),
    (s3d1cd, ex13, 3, 10, 12, 'Slow and controlled',                         'C', NULL, NULL, 60,   3),
    (s3d1cd, ex14, 3, 10, 15, 'Drive knee towards wall or post',             'D', 1,    2,    60,   4);

  -- =========================================================
  -- Program Exercises — 3-Day Program, Day 2
  -- =========================================================
  -- Warm Up
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, sort_order)
  VALUES
    (s3d2wu, ex15, 1, 5,  5,  '5 reps each side, hold 2 sec at top',     'A', 1),
    (s3d2wu, ex16, 1, 8,  10, 'Move slowly, breathe with each movement',  'B', 2),
    (s3d2wu, ex30, 1, 15, 20, 'Keep arms straight, squeeze at back',       'C', 3),
    (s3d2wu, ex24, 1, 5,  5,  '5 reps each side',                          'D', 4);

  -- Workout
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, superset_group, rir_min, rir_max, rest_seconds, sort_order)
  VALUES
    (s3d2wo, ex17, 3, 6,  8,  NULL,                      'A1', 'A', 2, 3,    60, 1),
    (s3d2wo, ex18, 3, 8,  12, NULL,                      'A2', 'A', NULL, NULL, 60, 2),
    (s3d2wo, ex19, 3, 8,  8,  '8 reps each leg',         'B1', 'B', 1, 2,    60, 3),
    (s3d2wo, ex20, 3, 8,  12, NULL,                      'B2', 'B', NULL, NULL, 60, 4),
    (s3d2wo, ex21, 3, 15, 20, 'Hip drive — not a squat', 'C',  NULL, NULL, NULL, 30, 5);

  -- Cool Down
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, rest_seconds, sort_order)
  VALUES
    (s3d2cd, ex22, 3, 5,  8,  'Lower as slowly as possible',                   'A', 90, 1),
    (s3d2cd, ex23, 3, 15, 20, 'Pull to eye level, external rotate at end',      'B', 60, 2),
    (s3d2cd, ex25, 2, 15, 15, '15 each side with light resistance band',        'C', NULL, 3);

  -- =========================================================
  -- Program Exercises — 3-Day Program, Day 3
  -- =========================================================
  -- Warm Up
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, sort_order)
  VALUES
    (s3d3wu, ex24, 1, 5,  5,  '5 each side',               'A', 1),
    (s3d3wu, ex25, 1, 12, 12, '12 each side',               'B', 2),
    (s3d3wu, ex01, 1, 6,  6,  'Focus on rib cage expansion','C', 3);

  -- Workout
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, superset_group, rir_min, rir_max, rest_seconds, sort_order)
  VALUES
    (s3d3wo, ex26, 3, 8,  10, '8–10 each leg',                       'A1', 'A', 2, 3,    60, 1),
    (s3d3wo, ex27, 3, 8,  12, '8–12 each arm',                       'A2', 'A', NULL, NULL, 60, 2),
    (s3d3wo, ex28, 3, 10, 15, 'Drive through heels, squeeze at top', 'B1', 'B', 1, 2,    60, 3),
    (s3d3wo, ex30, 3, 15, 20, 'Keep arms straight',                  'B2', 'B', NULL, NULL, 60, 4),
    (s3d3wo, ex29, 3, 10, 10, '10 each side, 2 sec hold',            'C',  NULL, NULL, NULL, 30, 5);

  -- Cool Down
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, rest_seconds, sort_order)
  VALUES
    (s3d3cd, ex11, 2, 10, 15, 'Slow — 3 sec at the bottom', 'A', NULL, 1),
    (s3d3cd, ex23, 2, 15, 20, 'Slow tempo',                  'B', 60,   2);

  -- =========================================================
  -- Program Exercises — 2-Day Program, Day 1 (Lower + Push)
  -- =========================================================
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, duration_seconds, notes, label, sort_order)
  VALUES
    (s2d1wu, ex01, 1, 5,    6,    NULL, 'Full breath cycle',    'A', 1),
    (s2d1wu, ex03, NULL, NULL, NULL, 60, '10 reps each ankle',  'B', 2),
    (s2d1wu, ex04, 1, 10,   12,   NULL, NULL,                   'C', 3);

  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, superset_group, rir_min, rir_max, rest_seconds, sort_order)
  VALUES
    (s2d1wo, ex06, 3, 6,  10, NULL,                   'A1', 'A', 2, 3,    60, 1),
    (s2d1wo, ex09, 3, 8,  12, NULL,                   'A2', 'A', NULL, NULL, 60, 2),
    (s2d1wo, ex08, 3, 10, 15, '10–15 each side',      'B1', 'B', NULL, NULL, 60, 3),
    (s2d1wo, ex12, 3, 8,  12, 'Elbows at 45 degrees', 'B2', 'B', 2, 3,    60, 4),
    (s2d1wo, ex11, 3, 12, 15, 'Slow and controlled',  'C',  NULL, 0, 0,    30, 5);

  -- =========================================================
  -- Program Exercises — 2-Day Program, Day 2 (Upper + Pull)
  -- =========================================================
  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, sort_order)
  VALUES
    (s2d2wu, ex02, 1, 6,  6,  '6 each side',  'A', 1),
    (s2d2wu, ex30, 1, 15, 20, NULL,            'B', 2),
    (s2d2wu, ex16, 1, 8,  10, NULL,            'C', 3);

  INSERT INTO program_exercises
    (program_section_id, exercise_id, sets, reps_min, reps_max, notes, label, superset_group, rir_min, rir_max, rest_seconds, sort_order)
  VALUES
    (s2d2wo, ex17, 3, 6,  8,  NULL,               'A1', 'A', 2, 3,    60, 1),
    (s2d2wo, ex20, 3, 8,  12, NULL,               'A2', 'A', NULL, NULL, 60, 2),
    (s2d2wo, ex19, 3, 8,  8,  '8 each leg',       'B1', 'B', 1, 2,    60, 3),
    (s2d2wo, ex18, 3, 8,  12, NULL,               'B2', 'B', NULL, NULL, 60, 4),
    (s2d2wo, ex23, 3, 15, 20, 'Pull to eye level','C',  NULL, NULL, NULL, 30, 5);

  -- =========================================================
  -- Assign programs to clients
  -- =========================================================
  INSERT INTO client_programs (client_id, program_id, is_active) VALUES
    (trent_cid,   prog3, true),
    (isla_cid,    prog2, true),
    (melanie_cid, prog3, true)
  ON CONFLICT (client_id, program_id) DO NOTHING;

  -- =========================================================
  -- Check-in history — Trent (8 weeks, improving trend)
  -- =========================================================
  INSERT INTO checkins (
    client_id, week_starting, weight_kg,
    sleep_rating, nutrition_rating, steps_rating, water_rating, activity_rating,
    training_rating, stress_rating, energy_rating, recovery_rating, overall_rating,
    comments, submitted_at
  ) VALUES
  (trent_cid, '2026-03-09', 88.4, 5, 5, 4, 5, 6, 7, 4, 5, 5, 5,
   'Tough week at work but made all 3 sessions. Quads are pretty sore.',
   '2026-03-09 08:30:00+10'),
  (trent_cid, '2026-03-16', 88.1, 6, 6, 5, 6, 6, 8, 5, 6, 6, 6,
   'Better week. Sleep improving. Squats felt strong on Day 1.',
   '2026-03-16 07:45:00+10'),
  (trent_cid, '2026-03-23', 87.8, 6, 7, 6, 6, 7, 8, 5, 6, 6, 7,
   'Feeling good this week. Energy picking up. Work stress has settled.',
   '2026-03-23 08:00:00+10'),
  (trent_cid, '2026-03-30', 87.2, 7, 7, 6, 7, 7, 8, 6, 7, 7, 7,
   'Best week yet. Hit a new squat PB on Day 1. Sleep has been great.',
   '2026-03-30 07:30:00+10'),
  (trent_cid, '2026-04-06', 86.9, 7, 8, 7, 7, 8, 9, 6, 7, 7, 8,
   'Monthly check-in week. Really happy with how things are going. Clothes fitting noticeably better.',
   '2026-04-06 08:15:00+10'),
  (trent_cid, '2026-04-13', 86.5, 8, 7, 7, 8, 8, 9, 7, 8, 8, 8,
   'Feeling strong. Nutrition was on point Mon–Fri. Slipped a bit on the weekend.',
   '2026-04-13 07:45:00+10'),
  (trent_cid, '2026-04-20', 86.2, 8, 8, 8, 8, 8, 9, 7, 8, 8, 8,
   'Solid week. Recovery has been much better. Really enjoying the program.',
   '2026-04-20 08:00:00+10'),
  (trent_cid, '2026-04-27', 85.8, 8, 8, 8, 9, 9, 9, 8, 9, 8, 9,
   'Best check-in yet! Down nearly 3kg from start. Energy through the roof.',
   '2026-04-27 07:30:00+10')
  ON CONFLICT (client_id, week_starting) DO NOTHING;

  -- Mark older check-ins as reviewed by coach
  UPDATE checkins SET
    coach_reply = 'Great work this week Trent! Keep it up.',
    reviewed_at = submitted_at + interval '4 hours'
  WHERE client_id = trent_cid AND week_starting < '2026-04-20';

  -- Monthly measurements — March 23 (baseline)
  UPDATE checkins SET
    is_monthly = true,
    body_fat_pct = 23.8, body_fat_mass_kg = 21.0, muscle_mass_kg = 63.2,
    chest_cm = 104.0, navel_cm = 93.0, hips_cm = 104.5,
    thigh_cm = 59.0, arm_cm = 34.5, waist_cm = 91.0,
    proud_of = 'Getting back into training after a long break',
    improve_next = 'Be more consistent with sleep'
  WHERE client_id = trent_cid AND week_starting = '2026-03-23';

  -- Monthly measurements — April 6 (month 1)
  UPDATE checkins SET
    is_monthly = true,
    body_fat_pct = 22.4, body_fat_mass_kg = 19.5, muscle_mass_kg = 64.1,
    chest_cm = 102.0, navel_cm = 90.5, hips_cm = 103.0,
    thigh_cm = 58.0, arm_cm = 35.0, waist_cm = 88.0,
    proud_of = 'Showing up consistently every week without missing a session',
    improve_next = 'Dial in nutrition on weekends — that''s where I slip up'
  WHERE client_id = trent_cid AND week_starting = '2026-04-06';

  -- =========================================================
  -- Check-in history — Isla (4 weeks, just started)
  -- =========================================================
  INSERT INTO checkins (
    client_id, week_starting, weight_kg,
    sleep_rating, nutrition_rating, steps_rating, water_rating, activity_rating,
    training_rating, stress_rating, energy_rating, recovery_rating, overall_rating,
    comments, submitted_at
  ) VALUES
  (isla_cid, '2026-04-06', 64.2, 7, 6, 7, 7, 7, 8, 6, 7, 7, 7,
   'First check-in! Really enjoying the program. A bit sore but in a good way.',
   '2026-04-06 09:00:00+10'),
  (isla_cid, '2026-04-13', 63.9, 7, 7, 7, 7, 8, 8, 6, 7, 7, 7,
   'Getting into the routine now. Love the warm up structure.',
   '2026-04-13 08:30:00+10'),
  (isla_cid, '2026-04-20', 63.6, 8, 7, 8, 8, 8, 9, 7, 8, 8, 8,
   'Had a really good week. Hit my steps goal every single day!',
   '2026-04-20 09:15:00+10'),
  (isla_cid, '2026-04-27', 63.4, 8, 8, 8, 8, 8, 9, 7, 8, 8, 8,
   'Feeling strong. Numbers all tracking in the right direction.',
   '2026-04-27 08:45:00+10')
  ON CONFLICT (client_id, week_starting) DO NOTHING;

  UPDATE checkins SET
    coach_reply = 'Love the consistency Isla!',
    reviewed_at = submitted_at + interval '3 hours'
  WHERE client_id = isla_cid AND week_starting < '2026-04-27';

  -- =========================================================
  -- Check-in history — Melanie (6 weeks)
  -- =========================================================
  INSERT INTO checkins (
    client_id, week_starting, weight_kg,
    sleep_rating, nutrition_rating, steps_rating, water_rating, activity_rating,
    training_rating, stress_rating, energy_rating, recovery_rating, overall_rating,
    comments, submitted_at
  ) VALUES
  (melanie_cid, '2026-03-23', 71.8, 6, 6, 5, 6, 6, 7, 5, 6, 6, 6,
   'Busy with the kids this week but got my sessions in.',
   '2026-03-23 20:00:00+10'),
  (melanie_cid, '2026-03-30', 71.5, 7, 6, 6, 6, 6, 8, 6, 6, 7, 6,
   'Better week. Kids routine is settling down.',
   '2026-03-30 19:30:00+10'),
  (melanie_cid, '2026-04-06', 71.2, 7, 7, 6, 7, 7, 8, 5, 7, 7, 7,
   'Good week. Nutrition was on point Mon–Fri.',
   '2026-04-06 20:15:00+10'),
  (melanie_cid, '2026-04-13', 70.9, 7, 7, 7, 7, 7, 8, 6, 7, 7, 7,
   'Getting stronger. Hip thrust felt much easier this week.',
   '2026-04-13 19:45:00+10'),
  (melanie_cid, '2026-04-20', 70.6, 8, 7, 7, 8, 8, 9, 7, 8, 8, 8,
   'Best week so far! Ran after the kids without getting puffed — absolute win.',
   '2026-04-20 20:00:00+10'),
  (melanie_cid, '2026-04-27', 70.3, 8, 8, 7, 8, 8, 9, 6, 8, 8, 8,
   'Really happy with how things are going. Feeling the difference.',
   '2026-04-27 19:30:00+10')
  ON CONFLICT (client_id, week_starting) DO NOTHING;

  UPDATE checkins SET
    coach_reply = 'Great effort Melanie!',
    reviewed_at = submitted_at + interval '2 hours'
  WHERE client_id = melanie_cid AND week_starting < '2026-04-27';

  -- Monthly measurements — Melanie April 6
  UPDATE checkins SET
    is_monthly = true,
    body_fat_pct = 28.5, body_fat_mass_kg = 20.3, muscle_mass_kg = 47.9,
    chest_cm = 90.0, navel_cm = 82.0, hips_cm = 97.0,
    thigh_cm = 55.0, arm_cm = 30.0,
    proud_of = 'Staying consistent despite having a very busy household',
    improve_next = 'Drink more water during the day'
  WHERE client_id = melanie_cid AND week_starting = '2026-04-06';

  -- =========================================================
  -- Food diary — Trent (last 3 days)
  -- =========================================================
  INSERT INTO food_diary (client_id, diary_date, breakfast, lunch, dinner, snacks, water_litres) VALUES
  (trent_cid, '2026-04-28',
   '3 scrambled eggs on sourdough, black coffee',
   'Chicken and rice bowl with avocado and mixed greens',
   'Beef stir fry with broccoli, capsicum and jasmine rice',
   'Banana + protein shake post-training, handful of almonds',
   2.5),
  (trent_cid, '2026-04-27',
   'Greek yoghurt with berries and granola',
   'Leftover stir fry + salad',
   'BBQ chicken with roasted sweet potato and green beans',
   'Apple and peanut butter, protein bar',
   2.2),
  (trent_cid, '2026-04-26',
   'Oats with banana and honey, coffee',
   'Turkey and salad wrap on rye',
   'Salmon fillet with steamed vegies and brown rice',
   'Protein shake, rice cakes with cottage cheese',
   3.0)
  ON CONFLICT (client_id, diary_date) DO NOTHING;

  RAISE NOTICE 'Seed complete. Coach ID: %', coach_id;
END $$;
