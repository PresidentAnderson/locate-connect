/**
 * Database types for Supabase
 *
 * Generated from schema in supabase/migrations/001_initial_schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      case_assignments: {
        Row: {
          id: string;
          case_id: string;
          user_id: string;
          role: string;
          assigned_by: string | null;
          is_active: boolean;
          assigned_at: string;
          unassigned_at: string | null;
        };
        Insert: {
          id?: string;
          case_id: string;
          user_id: string;
          role: string;
          assigned_by?: string | null;
          is_active?: boolean;
          assigned_at?: string;
          unassigned_at?: string | null;
        };
        Update: {
          id?: string;
          case_id?: string;
          user_id?: string;
          role?: string;
          assigned_by?: string | null;
          is_active?: boolean;
          assigned_at?: string;
          unassigned_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "case_assignments_assigned_by_fkey";
            columns: ["assigned_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_assignments_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_assignments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      case_attachments: {
        Row: {
          id: string;
          case_id: string;
          uploaded_by: string;
          file_name: string;
          file_type: string;
          file_size: number | null;
          url: string;
          description: string | null;
          is_evidence: boolean;
          is_law_enforcement_only: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          uploaded_by: string;
          file_name: string;
          file_type: string;
          file_size?: number | null;
          url: string;
          description?: string | null;
          is_evidence?: boolean;
          is_law_enforcement_only?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          uploaded_by?: string;
          file_name?: string;
          file_type?: string;
          file_size?: number | null;
          url?: string;
          description?: string | null;
          is_evidence?: boolean;
          is_law_enforcement_only?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_attachments_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      case_photos: {
        Row: {
          id: string;
          case_id: string;
          url: string;
          caption: string | null;
          is_primary: boolean;
          is_age_progressed: boolean;
          photo_date: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          url: string;
          caption?: string | null;
          is_primary?: boolean;
          is_age_progressed?: boolean;
          photo_date?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          url?: string;
          caption?: string | null;
          is_primary?: boolean;
          is_age_progressed?: boolean;
          photo_date?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_photos_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      case_updates: {
        Row: {
          id: string;
          case_id: string;
          author_id: string;
          update_type: string;
          title: string | null;
          content: string | null;
          old_status: Database["public"]["Enums"]["case_status"] | null;
          new_status: Database["public"]["Enums"]["case_status"] | null;
          old_priority: Database["public"]["Enums"]["priority_level"] | null;
          new_priority: Database["public"]["Enums"]["priority_level"] | null;
          is_public: boolean;
          is_law_enforcement_only: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          author_id: string;
          update_type: string;
          title?: string | null;
          content?: string | null;
          old_status?: Database["public"]["Enums"]["case_status"] | null;
          new_status?: Database["public"]["Enums"]["case_status"] | null;
          old_priority?: Database["public"]["Enums"]["priority_level"] | null;
          new_priority?: Database["public"]["Enums"]["priority_level"] | null;
          is_public?: boolean;
          is_law_enforcement_only?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          author_id?: string;
          update_type?: string;
          title?: string | null;
          content?: string | null;
          old_status?: Database["public"]["Enums"]["case_status"] | null;
          new_status?: Database["public"]["Enums"]["case_status"] | null;
          old_priority?: Database["public"]["Enums"]["priority_level"] | null;
          new_priority?: Database["public"]["Enums"]["priority_level"] | null;
          is_public?: boolean;
          is_law_enforcement_only?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_updates_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_updates_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          }
        ];
      };
      cases: {
        Row: {
          id: string;
          case_number: string | null;
          reporter_id: string;
          reporter_relationship: string | null;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          nickname: string | null;
          date_of_birth: string | null;
          age_at_disappearance: number | null;
          gender: Database["public"]["Enums"]["gender"] | null;
          height_cm: number | null;
          weight_kg: number | null;
          eye_color: string | null;
          hair_color: string | null;
          hair_style: string | null;
          skin_tone: string | null;
          distinguishing_features: string | null;
          clothing_last_seen: string | null;
          medical_conditions: string[] | null;
          medications: string[] | null;
          mental_health_conditions: string[] | null;
          is_medication_dependent: boolean;
          last_seen_date: string;
          last_seen_location: string | null;
          last_seen_latitude: number | null;
          last_seen_longitude: number | null;
          last_seen_city: string | null;
          last_seen_province: string | null;
          circumstances: string | null;
          is_minor: boolean;
          is_elderly: boolean;
          is_indigenous: boolean;
          has_dementia: boolean;
          has_autism: boolean;
          is_suicidal_risk: boolean;
          suspected_abduction: boolean;
          suspected_foul_play: boolean;
          status: Database["public"]["Enums"]["case_status"];
          priority_level: Database["public"]["Enums"]["priority_level"];
          priority_score: number;
          priority_factors: Json;
          jurisdiction_id: string | null;
          assigned_organization_id: string | null;
          primary_investigator_id: string | null;
          disposition: Database["public"]["Enums"]["case_disposition"] | null;
          resolution_date: string | null;
          resolution_location: string | null;
          resolution_latitude: number | null;
          resolution_longitude: number | null;
          resolution_city: string | null;
          resolution_province: string | null;
          resolution_notes: string | null;
          resolved_by_id: string | null;
          social_media_accounts: Json;
          primary_photo_url: string | null;
          is_amber_alert: boolean;
          is_public: boolean;
          is_media_restricted: boolean;
          circumstances_fr: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_number?: string | null;
          reporter_id: string;
          reporter_relationship?: string | null;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          nickname?: string | null;
          date_of_birth?: string | null;
          age_at_disappearance?: number | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          eye_color?: string | null;
          hair_color?: string | null;
          hair_style?: string | null;
          skin_tone?: string | null;
          distinguishing_features?: string | null;
          clothing_last_seen?: string | null;
          medical_conditions?: string[] | null;
          medications?: string[] | null;
          mental_health_conditions?: string[] | null;
          is_medication_dependent?: boolean;
          last_seen_date: string;
          last_seen_location?: string | null;
          last_seen_latitude?: number | null;
          last_seen_longitude?: number | null;
          last_seen_city?: string | null;
          last_seen_province?: string | null;
          circumstances?: string | null;
          is_minor?: boolean;
          is_elderly?: boolean;
          is_indigenous?: boolean;
          has_dementia?: boolean;
          has_autism?: boolean;
          is_suicidal_risk?: boolean;
          suspected_abduction?: boolean;
          suspected_foul_play?: boolean;
          status?: Database["public"]["Enums"]["case_status"];
          priority_level?: Database["public"]["Enums"]["priority_level"];
          priority_score?: number;
          priority_factors?: Json;
          jurisdiction_id?: string | null;
          assigned_organization_id?: string | null;
          primary_investigator_id?: string | null;
          disposition?: Database["public"]["Enums"]["case_disposition"] | null;
          resolution_date?: string | null;
          resolution_location?: string | null;
          resolution_latitude?: number | null;
          resolution_longitude?: number | null;
          resolution_city?: string | null;
          resolution_province?: string | null;
          resolution_notes?: string | null;
          resolved_by_id?: string | null;
          social_media_accounts?: Json;
          primary_photo_url?: string | null;
          is_amber_alert?: boolean;
          is_public?: boolean;
          is_media_restricted?: boolean;
          circumstances_fr?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_number?: string | null;
          reporter_id?: string;
          reporter_relationship?: string | null;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          nickname?: string | null;
          date_of_birth?: string | null;
          age_at_disappearance?: number | null;
          gender?: Database["public"]["Enums"]["gender"] | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          eye_color?: string | null;
          hair_color?: string | null;
          hair_style?: string | null;
          skin_tone?: string | null;
          distinguishing_features?: string | null;
          clothing_last_seen?: string | null;
          medical_conditions?: string[] | null;
          medications?: string[] | null;
          mental_health_conditions?: string[] | null;
          is_medication_dependent?: boolean;
          last_seen_date?: string;
          last_seen_location?: string | null;
          last_seen_latitude?: number | null;
          last_seen_longitude?: number | null;
          last_seen_city?: string | null;
          last_seen_province?: string | null;
          circumstances?: string | null;
          is_minor?: boolean;
          is_elderly?: boolean;
          is_indigenous?: boolean;
          has_dementia?: boolean;
          has_autism?: boolean;
          is_suicidal_risk?: boolean;
          suspected_abduction?: boolean;
          suspected_foul_play?: boolean;
          status?: Database["public"]["Enums"]["case_status"];
          priority_level?: Database["public"]["Enums"]["priority_level"];
          priority_score?: number;
          priority_factors?: Json;
          jurisdiction_id?: string | null;
          assigned_organization_id?: string | null;
          primary_investigator_id?: string | null;
          disposition?: Database["public"]["Enums"]["case_disposition"] | null;
          resolution_date?: string | null;
          resolution_location?: string | null;
          resolution_latitude?: number | null;
          resolution_longitude?: number | null;
          resolution_city?: string | null;
          resolution_province?: string | null;
          resolution_notes?: string | null;
          resolved_by_id?: string | null;
          social_media_accounts?: Json;
          primary_photo_url?: string | null;
          is_amber_alert?: boolean;
          is_public?: boolean;
          is_media_restricted?: boolean;
          circumstances_fr?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cases_assigned_organization_id_fkey";
            columns: ["assigned_organization_id"];
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_jurisdiction_id_fkey";
            columns: ["jurisdiction_id"];
            referencedRelation: "jurisdictions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_primary_investigator_id_fkey";
            columns: ["primary_investigator_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_reporter_id_fkey";
            columns: ["reporter_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_resolved_by_id_fkey";
            columns: ["resolved_by_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      email_tracking: {
        Row: {
          id: string;
          case_id: string;
          recipient_email: string;
          subject: string | null;
          sent_at: string;
          tracking_pixel_id: string;
          opened_at: string | null;
          open_count: number;
          last_opened_ip: string | null;
          last_opened_user_agent: string | null;
          last_opened_location: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          recipient_email: string;
          subject?: string | null;
          sent_at?: string;
          tracking_pixel_id?: string;
          opened_at?: string | null;
          open_count?: number;
          last_opened_ip?: string | null;
          last_opened_user_agent?: string | null;
          last_opened_location?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          recipient_email?: string;
          subject?: string | null;
          sent_at?: string;
          tracking_pixel_id?: string;
          opened_at?: string | null;
          open_count?: number;
          last_opened_ip?: string | null;
          last_opened_user_agent?: string | null;
          last_opened_location?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_tracking_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          }
        ];
      };
      jurisdictions: {
        Row: {
          id: string;
          code: string;
          name: string;
          name_fr: string | null;
          type: string;
          parent_jurisdiction_id: string | null;
          region: string | null;
          province: string | null;
          country: string;
          priority_weights: Json;
          contact_email: string | null;
          contact_phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          name_fr?: string | null;
          type: string;
          parent_jurisdiction_id?: string | null;
          region?: string | null;
          province?: string | null;
          country?: string;
          priority_weights?: Json;
          contact_email?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          name_fr?: string | null;
          type?: string;
          parent_jurisdiction_id?: string | null;
          region?: string | null;
          province?: string | null;
          country?: string;
          priority_weights?: Json;
          contact_email?: string | null;
          contact_phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jurisdictions_parent_jurisdiction_id_fkey";
            columns: ["parent_jurisdiction_id"];
            referencedRelation: "jurisdictions";
            referencedColumns: ["id"];
          }
        ];
      };
      leads: {
        Row: {
          id: string;
          case_id: string;
          title: string;
          description: string | null;
          source: string | null;
          source_reference: string | null;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          city: string | null;
          province: string | null;
          status: Database["public"]["Enums"]["lead_status"];
          credibility_score: number;
          is_verified: boolean;
          verified_by: string | null;
          verified_at: string | null;
          assigned_to: string | null;
          reported_at: string;
          sighting_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          title: string;
          description?: string | null;
          source?: string | null;
          source_reference?: string | null;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          city?: string | null;
          province?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          credibility_score?: number;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          assigned_to?: string | null;
          reported_at?: string;
          sighting_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          title?: string;
          description?: string | null;
          source?: string | null;
          source_reference?: string | null;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          city?: string | null;
          province?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
          credibility_score?: number;
          is_verified?: boolean;
          verified_by?: string | null;
          verified_at?: string | null;
          assigned_to?: string | null;
          reported_at?: string;
          sighting_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_verified_by_fkey";
            columns: ["verified_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          content: string | null;
          case_id: string | null;
          lead_id: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          content?: string | null;
          case_id?: string | null;
          lead_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          content?: string | null;
          case_id?: string | null;
          lead_id?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          type: string;
          jurisdiction_id: string | null;
          address: string | null;
          city: string | null;
          province: string | null;
          postal_code: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          api_endpoint: string | null;
          api_key_hash: string | null;
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          jurisdiction_id?: string | null;
          address?: string | null;
          city?: string | null;
          province?: string | null;
          postal_code?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          api_endpoint?: string | null;
          api_key_hash?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          jurisdiction_id?: string | null;
          address?: string | null;
          city?: string | null;
          province?: string | null;
          postal_code?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          api_endpoint?: string | null;
          api_key_hash?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_jurisdiction_id_fkey";
            columns: ["jurisdiction_id"];
            referencedRelation: "jurisdictions";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          role: Database["public"]["Enums"]["user_role"];
          organization: string | null;
          badge_number: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
          jurisdiction_id: string | null;
          notification_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          organization?: string | null;
          badge_number?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          jurisdiction_id?: string | null;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          organization?: string | null;
          badge_number?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
          jurisdiction_id?: string | null;
          notification_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_profiles_jurisdiction";
            columns: ["jurisdiction_id"];
            referencedRelation: "jurisdictions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_verified_by_fkey";
            columns: ["verified_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tips: {
        Row: {
          id: string;
          case_id: string;
          tipster_id: string | null;
          tipster_name: string | null;
          tipster_email: string | null;
          tipster_phone: string | null;
          is_anonymous: boolean;
          content: string;
          location: string | null;
          latitude: number | null;
          longitude: number | null;
          sighting_date: string | null;
          status: Database["public"]["Enums"]["tip_status"];
          credibility_score: number | null;
          is_duplicate: boolean;
          duplicate_of: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          lead_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          tipster_id?: string | null;
          tipster_name?: string | null;
          tipster_email?: string | null;
          tipster_phone?: string | null;
          is_anonymous?: boolean;
          content: string;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          sighting_date?: string | null;
          status?: Database["public"]["Enums"]["tip_status"];
          credibility_score?: number | null;
          is_duplicate?: boolean;
          duplicate_of?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          lead_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          tipster_id?: string | null;
          tipster_name?: string | null;
          tipster_email?: string | null;
          tipster_phone?: string | null;
          is_anonymous?: boolean;
          content?: string;
          location?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          sighting_date?: string | null;
          status?: Database["public"]["Enums"]["tip_status"];
          credibility_score?: number | null;
          is_duplicate?: boolean;
          duplicate_of?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_notes?: string | null;
          lead_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tips_case_id_fkey";
            columns: ["case_id"];
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_duplicate_of_fkey";
            columns: ["duplicate_of"];
            referencedRelation: "tips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_lead_id_fkey";
            columns: ["lead_id"];
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_reviewed_by_fkey";
            columns: ["reviewed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tips_tipster_id_fkey";
            columns: ["tipster_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      case_disposition:
        | "found_alive_safe"
        | "found_alive_injured"
        | "found_deceased"
        | "returned_voluntarily"
        | "located_runaway"
        | "located_custody"
        | "located_medical_facility"
        | "located_shelter"
        | "located_incarcerated"
        | "false_report"
        | "other";
      case_status: "active" | "resolved" | "closed" | "cold";
      gender: "male" | "female" | "non_binary" | "other" | "unknown";
      lead_status: "new" | "investigating" | "verified" | "dismissed" | "acted_upon";
      priority_level: "p0_critical" | "p1_high" | "p2_medium" | "p3_low" | "p4_routine";
      tip_status: "pending" | "reviewing" | "verified" | "hoax" | "duplicate";
      user_role: "user" | "law_enforcement" | "journalist" | "admin" | "developer";
      verification_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {};
  };
};
