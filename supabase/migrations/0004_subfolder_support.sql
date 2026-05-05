-- Add sub-folder support to resource_folders
-- Run this in: Supabase Dashboard → SQL Editor

alter table resource_folders
  add column parent_folder_id uuid references resource_folders(id) on delete cascade;

create index resource_folders_parent_idx on resource_folders(parent_folder_id);
