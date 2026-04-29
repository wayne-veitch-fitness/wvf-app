/**
 * Supabase database type definitions.
 *
 * The canonical way to keep these in sync is via the Supabase CLI:
 *   npx supabase gen types typescript --project-id aokchdumugrjqwbpdqnj > src/lib/supabase/types.ts
 *
 * For now this is a hand-written stub that covers the Phase 2 schema.
 * Re-generate after each migration.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'client' | 'coach'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: UserRole
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          role?: UserRole
          avatar_url?: string | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          profile_id: string
          package_label: string | null
          checkin_day: number | null // 0=Sun, 1=Mon, … 6=Sat
          start_weight_kg: number | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          package_label?: string | null
          checkin_day?: number | null
          start_weight_kg?: number | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          package_label?: string | null
          checkin_day?: number | null
          start_weight_kg?: number | null
          notes?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          name: string
          description: string | null
          is_template: boolean // true = shared; false = bespoke for one client
          created_by: string // coach profile id
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_template?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          is_template?: boolean
          updated_at?: string
        }
      }
      client_programs: {
        Row: {
          id: string
          client_id: string
          program_id: string
          assigned_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          client_id: string
          program_id: string
          assigned_at?: string
          is_active?: boolean
        }
        Update: {
          is_active?: boolean
        }
      }
      program_days: {
        Row: {
          id: string
          program_id: string
          day_number: number
          name: string // e.g. "Day 1 — Upper Body"
          sort_order: number
        }
        Insert: {
          id?: string
          program_id: string
          day_number: number
          name: string
          sort_order?: number
        }
        Update: {
          day_number?: number
          name?: string
          sort_order?: number
        }
      }
      program_sections: {
        Row: {
          id: string
          program_day_id: string
          name: string // e.g. "Warm Up", "Main Lifts", "Accessories"
          sort_order: number
        }
        Insert: {
          id?: string
          program_day_id: string
          name: string
          sort_order?: number
        }
        Update: {
          name?: string
          sort_order?: number
        }
      }
      program_exercises: {
        Row: {
          id: string
          program_section_id: string
          exercise_id: string
          sets: number | null
          reps_min: number | null
          reps_max: number | null
          duration_seconds: number | null // for timed exercises
          target_weight_kg: number | null
          notes: string | null
          sort_order: number
        }
        Insert: {
          id?: string
          program_section_id: string
          exercise_id: string
          sets?: number | null
          reps_min?: number | null
          reps_max?: number | null
          duration_seconds?: number | null
          target_weight_kg?: number | null
          notes?: string | null
          sort_order?: number
        }
        Update: {
          sets?: number | null
          reps_min?: number | null
          reps_max?: number | null
          duration_seconds?: number | null
          target_weight_kg?: number | null
          notes?: string | null
          sort_order?: number
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          video_url: string | null
          video_storage_path: string | null // Supabase Storage path
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          video_url?: string | null
          video_storage_path?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          video_url?: string | null
          video_storage_path?: string | null
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          category: string // 'movement_pattern' | 'muscle_group' | 'equipment' | etc.
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          category: string
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          name?: string
          sort_order?: number
        }
      }
      exercise_tags: {
        Row: {
          exercise_id: string
          tag_id: string
        }
        Insert: {
          exercise_id: string
          tag_id: string
        }
        Update: Record<string, never>
      }
      workout_logs: {
        Row: {
          id: string
          client_id: string
          program_day_id: string
          logged_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          client_id: string
          program_day_id: string
          logged_at?: string
          notes?: string | null
        }
        Update: {
          notes?: string | null
        }
      }
      set_logs: {
        Row: {
          id: string
          workout_log_id: string
          program_exercise_id: string
          set_number: number
          weight_kg: number | null
          reps: number | null
          duration_seconds: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          workout_log_id: string
          program_exercise_id: string
          set_number: number
          weight_kg?: number | null
          reps?: number | null
          duration_seconds?: number | null
          notes?: string | null
        }
        Update: {
          weight_kg?: number | null
          reps?: number | null
          duration_seconds?: number | null
          notes?: string | null
        }
      }
      checkins: {
        Row: {
          id: string
          client_id: string
          week_starting: string // ISO date of Monday
          weight_kg: number | null
          training_rating: string | null
          food_rating: string | null
          free_text: string | null
          // Monthly fields (null on weekly-only check-ins)
          chest_cm: number | null
          waist_cm: number | null
          hips_cm: number | null
          thigh_cm: number | null
          bicep_cm: number | null
          photo_front_path: string | null
          photo_side_path: string | null
          photo_back_path: string | null
          coach_reply: string | null
          reviewed_at: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          client_id: string
          week_starting: string
          weight_kg?: number | null
          training_rating?: string | null
          food_rating?: string | null
          free_text?: string | null
          chest_cm?: number | null
          waist_cm?: number | null
          hips_cm?: number | null
          thigh_cm?: number | null
          bicep_cm?: number | null
          photo_front_path?: string | null
          photo_side_path?: string | null
          photo_back_path?: string | null
          coach_reply?: string | null
          reviewed_at?: string | null
          submitted_at?: string
        }
        Update: {
          coach_reply?: string | null
          reviewed_at?: string | null
        }
      }
      food_diary: {
        Row: {
          id: string
          client_id: string
          diary_date: string // ISO date
          breakfast: string | null
          lunch: string | null
          dinner: string | null
          snacks: string | null
          water_litres: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          diary_date: string
          breakfast?: string | null
          lunch?: string | null
          dinner?: string | null
          snacks?: string | null
          water_litres?: number | null
          updated_at?: string
        }
        Update: {
          breakfast?: string | null
          lunch?: string | null
          dinner?: string | null
          snacks?: string | null
          water_litres?: number | null
          updated_at?: string
        }
      }
      resource_folders: {
        Row: {
          id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          name?: string
          sort_order?: number
        }
      }
      resources: {
        Row: {
          id: string
          folder_id: string
          name: string
          storage_path: string
          created_at: string
        }
        Insert: {
          id?: string
          folder_id: string
          name: string
          storage_path: string
          created_at?: string
        }
        Update: {
          folder_id?: string
          name?: string
          storage_path?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: 'client' | 'coach'
    }
  }
}
