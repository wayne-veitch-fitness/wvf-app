-- Add ON DELETE CASCADE to set_logs.program_exercise_id
-- Previously a hard delete of a program_exercise was blocked if any
-- set_logs referenced it. Now removing an exercise from a program will
-- also remove its logged set history.
alter table set_logs
  drop constraint set_logs_program_exercise_id_fkey;

alter table set_logs
  add constraint set_logs_program_exercise_id_fkey
  foreign key (program_exercise_id)
  references program_exercises(id)
  on delete cascade;
