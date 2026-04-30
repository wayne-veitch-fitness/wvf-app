-- =============================================================================
-- WVF Training App — Schema Updates
-- Migration: 0002_schema_updates.sql
-- Run BEFORE 0003_seed_data.sql
-- =============================================================================

-- Add exercise-detail fields to program_exercises
ALTER TABLE program_exercises
  ADD COLUMN IF NOT EXISTS label          text,
  ADD COLUMN IF NOT EXISTS superset_group text,
  ADD COLUMN IF NOT EXISTS rir_min        smallint,
  ADD COLUMN IF NOT EXISTS rir_max        smallint,
  ADD COLUMN IF NOT EXISTS rest_seconds   smallint;

-- Update checkins to match Wayne's actual 10-metric weekly form + monthly fields
-- Drop old generic columns first (safe — no real client data yet)
ALTER TABLE checkins
  DROP COLUMN IF EXISTS training_rating,
  DROP COLUMN IF EXISTS food_rating,
  DROP COLUMN IF EXISTS free_text;

ALTER TABLE checkins
  -- 10 weekly 1-10 ratings (in Wayne's form order)
  ADD COLUMN IF NOT EXISTS sleep_rating      smallint CHECK (sleep_rating      BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS nutrition_rating  smallint CHECK (nutrition_rating  BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS steps_rating      smallint CHECK (steps_rating      BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS water_rating      smallint CHECK (water_rating      BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS activity_rating   smallint CHECK (activity_rating   BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS training_rating   smallint CHECK (training_rating   BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS stress_rating     smallint CHECK (stress_rating     BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS energy_rating     smallint CHECK (energy_rating     BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS recovery_rating   smallint CHECK (recovery_rating   BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS overall_rating    smallint CHECK (overall_rating    BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS comments          text,
  -- Monthly flag
  ADD COLUMN IF NOT EXISTS is_monthly        boolean NOT NULL DEFAULT false,
  -- Monthly body composition (from Hume scan)
  ADD COLUMN IF NOT EXISTS body_fat_pct      numeric(5,2),
  ADD COLUMN IF NOT EXISTS body_fat_mass_kg  numeric(5,2),
  ADD COLUMN IF NOT EXISTS muscle_mass_kg    numeric(5,2),
  -- Monthly measurements (cm)
  ADD COLUMN IF NOT EXISTS navel_cm          numeric(5,1),
  ADD COLUMN IF NOT EXISTS arm_cm            numeric(5,1),
  ADD COLUMN IF NOT EXISTS under_bust_cm     numeric(5,1),
  ADD COLUMN IF NOT EXISTS calf_cm           numeric(5,1),
  -- Monthly summary questions
  ADD COLUMN IF NOT EXISTS proud_of          text,
  ADD COLUMN IF NOT EXISTS improve_next      text;
