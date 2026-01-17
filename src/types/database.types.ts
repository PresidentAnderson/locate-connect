/**
 * Database types for Supabase
 *
 * Generate with: npx supabase gen types typescript --local > src/types/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Define your tables here
      // Example:
      // users: {
      //   Row: { id: string; email: string; created_at: string }
      //   Insert: { id?: string; email: string; created_at?: string }
      //   Update: { id?: string; email?: string; created_at?: string }
      // }
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
