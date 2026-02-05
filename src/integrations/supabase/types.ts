export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          answers: Json | null
          candidate_id: string
          candidate_phf_url: string | null
          consents: Json | null
          created_at: string
          files: Json | null
          id: string
          job_id: string
          longlist_rating: string | null
          phf_completed: boolean | null
          phf_data: Json | null
          phf_pdf_url: string | null
          photo_url: string | null
          source: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          submitted_at: string
          suggested_for_longlist: boolean | null
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          candidate_id: string
          candidate_phf_url?: string | null
          consents?: Json | null
          created_at?: string
          files?: Json | null
          id?: string
          job_id: string
          longlist_rating?: string | null
          phf_completed?: boolean | null
          phf_data?: Json | null
          phf_pdf_url?: string | null
          photo_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string
          suggested_for_longlist?: boolean | null
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          candidate_id?: string
          candidate_phf_url?: string | null
          consents?: Json | null
          created_at?: string
          files?: Json | null
          id?: string
          job_id?: string
          longlist_rating?: string | null
          phf_completed?: boolean | null
          phf_data?: Json | null
          phf_pdf_url?: string | null
          photo_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          submitted_at?: string
          suggested_for_longlist?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_email_threads: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          original_email_id: string
          parent_message_id: string | null
          scheduled_for: string | null
          sender_email: string
          sender_name: string
          sender_type: string
          slot_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          original_email_id: string
          parent_message_id?: string | null
          scheduled_for?: string | null
          sender_email: string
          sender_name: string
          sender_type: string
          slot_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          original_email_id?: string
          parent_message_id?: string | null
          scheduled_for?: string | null
          sender_email?: string
          sender_name?: string
          sender_type?: string
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_email_threads_original_email_id_fkey"
            columns: ["original_email_id"]
            isOneToOne: false
            referencedRelation: "assessment_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_email_threads_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "assessment_email_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_email_threads_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "assessment_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_emails: {
        Row: {
          assessment_id: string
          body: string
          created_at: string
          expected_response_guidance: string | null
          id: string
          is_curveball: boolean
          order_index: number
          reply_ai_prompt: string | null
          reply_delay_max: number | null
          reply_delay_min: number | null
          reply_enabled: boolean | null
          reply_mode: string | null
          reply_pre_written: string | null
          reply_style: string | null
          sender_email: string
          sender_name: string
          subject: string
          urgency: Database["public"]["Enums"]["email_urgency"]
        }
        Insert: {
          assessment_id: string
          body: string
          created_at?: string
          expected_response_guidance?: string | null
          id?: string
          is_curveball?: boolean
          order_index?: number
          reply_ai_prompt?: string | null
          reply_delay_max?: number | null
          reply_delay_min?: number | null
          reply_enabled?: boolean | null
          reply_mode?: string | null
          reply_pre_written?: string | null
          reply_style?: string | null
          sender_email: string
          sender_name: string
          subject: string
          urgency?: Database["public"]["Enums"]["email_urgency"]
        }
        Update: {
          assessment_id?: string
          body?: string
          created_at?: string
          expected_response_guidance?: string | null
          id?: string
          is_curveball?: boolean
          order_index?: number
          reply_ai_prompt?: string | null
          reply_delay_max?: number | null
          reply_delay_min?: number | null
          reply_enabled?: boolean | null
          reply_mode?: string | null
          reply_pre_written?: string | null
          reply_style?: string | null
          sender_email?: string
          sender_name?: string
          subject?: string
          urgency?: Database["public"]["Enums"]["email_urgency"]
        }
        Relationships: [
          {
            foreignKeyName: "assessment_emails_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "written_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          created_at: string
          email_id: string
          id: string
          last_saved_at: string | null
          order_addressed: number | null
          response_text: string | null
          slot_id: string
          started_at: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          created_at?: string
          email_id: string
          id?: string
          last_saved_at?: string | null
          order_addressed?: number | null
          response_text?: string | null
          slot_id: string
          started_at?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          created_at?: string
          email_id?: string
          id?: string
          last_saved_at?: string | null
          order_addressed?: number | null
          response_text?: string | null
          slot_id?: string
          started_at?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "assessment_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "assessment_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scores: {
        Row: {
          comments: string | null
          communication: number | null
          created_at: string
          email_id: string
          id: string
          legal_accuracy: number | null
          prioritization: number | null
          risk_awareness: number | null
          scored_by: string
          slot_id: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          communication?: number | null
          created_at?: string
          email_id: string
          id?: string
          legal_accuracy?: number | null
          prioritization?: number | null
          risk_awareness?: number | null
          scored_by: string
          slot_id: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          communication?: number | null
          created_at?: string
          email_id?: string
          id?: string
          legal_accuracy?: number | null
          prioritization?: number | null
          risk_awareness?: number | null
          scored_by?: string
          slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "assessment_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_scores_scored_by_fkey"
            columns: ["scored_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_scores_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "assessment_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_series: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          series_closes_at: string | null
          series_opens_at: string | null
          status: Database["public"]["Enums"]["assessment_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          series_closes_at?: string | null
          series_opens_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          series_closes_at?: string | null
          series_opens_at?: string | null
          status?: Database["public"]["Enums"]["assessment_status"] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_series_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_series_candidates: {
        Row: {
          access_token: string | null
          candidate_email: string
          candidate_name: string
          created_at: string | null
          created_by: string | null
          id: string
          series_id: string | null
        }
        Insert: {
          access_token?: string | null
          candidate_email: string
          candidate_name: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          series_id?: string | null
        }
        Update: {
          access_token?: string | null
          candidate_email?: string
          candidate_name?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          series_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_series_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_series_candidates_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "assessment_series"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_series_parts: {
        Row: {
          assessment_id: string | null
          created_at: string | null
          id: string
          part_number: number
          part_title: string | null
          series_id: string | null
          unlock_after_previous: boolean | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string | null
          id?: string
          part_number: number
          part_title?: string | null
          series_id?: string | null
          unlock_after_previous?: boolean | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string | null
          id?: string
          part_number?: number
          part_title?: string | null
          series_id?: string | null
          unlock_after_previous?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_series_parts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "written_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_series_parts_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "assessment_series"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_slots: {
        Row: {
          access_token: string
          assessment_id: string
          available_from: string | null
          available_until: string | null
          candidate_email: string
          candidate_name: string
          created_at: string
          created_by: string | null
          curveball_shown_at: string | null
          id: string
          scheduled_end: string
          scheduled_start: string
          started_at: string | null
          status: Database["public"]["Enums"]["assessment_slot_status"]
          submitted_at: string | null
        }
        Insert: {
          access_token?: string
          assessment_id: string
          available_from?: string | null
          available_until?: string | null
          candidate_email: string
          candidate_name: string
          created_at?: string
          created_by?: string | null
          curveball_shown_at?: string | null
          id?: string
          scheduled_end: string
          scheduled_start: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_slot_status"]
          submitted_at?: string | null
        }
        Update: {
          access_token?: string
          assessment_id?: string
          available_from?: string | null
          available_until?: string | null
          candidate_email?: string
          candidate_name?: string
          created_at?: string
          created_by?: string | null
          curveball_shown_at?: string | null
          id?: string
          scheduled_end?: string
          scheduled_start?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["assessment_slot_status"]
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_slots_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "written_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          at: string
          before: Json | null
          entity: string
          entity_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity: string
          entity_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          entity?: string
          entity_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_scoring_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_count: number
          error_message: string | null
          id: string
          job_id: string
          last_updated_at: string | null
          scored_count: number
          skipped_count: number
          started_at: string | null
          status: string
          total_applications: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number
          error_message?: string | null
          id?: string
          job_id: string
          last_updated_at?: string | null
          scored_count?: number
          skipped_count?: number
          started_at?: string | null
          status?: string
          total_applications?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_count?: number
          error_message?: string | null
          id?: string
          job_id?: string
          last_updated_at?: string | null
          scored_count?: number
          skipped_count?: number
          started_at?: string | null
          status?: string
          total_applications?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_scoring_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_outputs: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          programme: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          programme?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          programme?: string | null
        }
        Relationships: []
      }
      candidate_flags: {
        Row: {
          candidate_id: string
          created_at: string | null
          flag_type: string
          flagged_by: string
          id: string
          notes: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          flag_type: string
          flagged_by: string
          id?: string
          notes?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          flag_type?: string
          flagged_by?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_flags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_notes: {
        Row: {
          candidate_id: string
          created_at: string | null
          created_by: string
          id: string
          is_private: boolean | null
          note: string
          updated_at: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_private?: boolean | null
          note: string
          updated_at?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_private?: boolean | null
          note?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          additional_fellowships: Json | null
          affiliate_subtype: string | null
          availability_date: string | null
          availability_date_detailed: string | null
          availability_mode: string | null
          availability_mode_detailed: string | null
          availability_status: string | null
          candidate_type: string | null
          certifications: Json | null
          contract_type_preference: string | null
          country_of_birth: string | null
          country_of_birth_detailed: string | null
          created_at: string
          current_organization: string | null
          current_position: string | null
          date_of_birth: string | null
          dependants: Json | null
          dependants_detailed: Json | null
          education: Json | null
          email: string
          email_public: boolean | null
          family_name: string | null
          fellowships: Json | null
          first_name: string | null
          gender: string | null
          government_employment: boolean | null
          has_security_clearance: boolean | null
          id: string
          languages: Json | null
          last_name: string | null
          law_violations_details: string | null
          law_violations_disclosed: boolean | null
          linkedin_url: string | null
          location: string | null
          maiden_name: string | null
          maiden_name_detailed: string | null
          marital_status: string | null
          marital_status_detailed: string | null
          middle_names: string | null
          mobility_medical_reservations: string | null
          motivation_letter: string | null
          name: string
          nationality_change_details: string | null
          nationality_change_details_detailed: string | null
          nationality_changed: boolean | null
          notice_period: string | null
          notice_period_days: number | null
          notice_period_detailed: string | null
          objection_to_contact_present_employer: boolean | null
          permanent_address: string | null
          permanent_address_detailed: string | null
          permanent_address_line1: string | null
          permanent_address_line2: string | null
          permanent_city: string | null
          permanent_country: string | null
          personal_references: Json | null
          phf_education: Json | null
          phf_work_experience: Json | null
          phone: string | null
          phone_public: boolean | null
          place_of_birth: string | null
          place_of_birth_detailed: string | null
          portfolio_attachments: Json | null
          preferred_locations: Json | null
          present_address: string | null
          present_address_detailed: string | null
          present_address_line1: string | null
          present_address_line2: string | null
          present_address_same_as_permanent: boolean | null
          present_city: string | null
          present_country: string | null
          present_nationality: string | null
          present_nationality_detailed: string | null
          presently_in_government_employ: boolean | null
          privacy_setting: string | null
          professional_summary: string | null
          profile_completion_percentage: number | null
          profile_photo_url: string | null
          relatives: Json | null
          relatives_detailed: Json | null
          remote_work_preference: string | null
          salary_expectation_range: string | null
          security_clearance_level: string | null
          skills: Json | null
          slug: string | null
          supervisor_contact_consent: boolean | null
          telephone_detailed: string | null
          title: string | null
          travel_availability: string | null
          un_experience: boolean | null
          un_organizations_worked: Json | null
          unemployment_periods: Json | null
          updated_at: string
          us_green_card: boolean | null
          us_green_card_detailed: boolean | null
          us_green_card_details: string | null
          us_green_card_details_detailed: string | null
          willing_to_relocate: boolean | null
          work_auth: string | null
          work_experience: Json | null
          work_preferences: Json | null
          years_of_experience: number | null
        }
        Insert: {
          additional_fellowships?: Json | null
          affiliate_subtype?: string | null
          availability_date?: string | null
          availability_date_detailed?: string | null
          availability_mode?: string | null
          availability_mode_detailed?: string | null
          availability_status?: string | null
          candidate_type?: string | null
          certifications?: Json | null
          contract_type_preference?: string | null
          country_of_birth?: string | null
          country_of_birth_detailed?: string | null
          created_at?: string
          current_organization?: string | null
          current_position?: string | null
          date_of_birth?: string | null
          dependants?: Json | null
          dependants_detailed?: Json | null
          education?: Json | null
          email: string
          email_public?: boolean | null
          family_name?: string | null
          fellowships?: Json | null
          first_name?: string | null
          gender?: string | null
          government_employment?: boolean | null
          has_security_clearance?: boolean | null
          id?: string
          languages?: Json | null
          last_name?: string | null
          law_violations_details?: string | null
          law_violations_disclosed?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          maiden_name?: string | null
          maiden_name_detailed?: string | null
          marital_status?: string | null
          marital_status_detailed?: string | null
          middle_names?: string | null
          mobility_medical_reservations?: string | null
          motivation_letter?: string | null
          name: string
          nationality_change_details?: string | null
          nationality_change_details_detailed?: string | null
          nationality_changed?: boolean | null
          notice_period?: string | null
          notice_period_days?: number | null
          notice_period_detailed?: string | null
          objection_to_contact_present_employer?: boolean | null
          permanent_address?: string | null
          permanent_address_detailed?: string | null
          permanent_address_line1?: string | null
          permanent_address_line2?: string | null
          permanent_city?: string | null
          permanent_country?: string | null
          personal_references?: Json | null
          phf_education?: Json | null
          phf_work_experience?: Json | null
          phone?: string | null
          phone_public?: boolean | null
          place_of_birth?: string | null
          place_of_birth_detailed?: string | null
          portfolio_attachments?: Json | null
          preferred_locations?: Json | null
          present_address?: string | null
          present_address_detailed?: string | null
          present_address_line1?: string | null
          present_address_line2?: string | null
          present_address_same_as_permanent?: boolean | null
          present_city?: string | null
          present_country?: string | null
          present_nationality?: string | null
          present_nationality_detailed?: string | null
          presently_in_government_employ?: boolean | null
          privacy_setting?: string | null
          professional_summary?: string | null
          profile_completion_percentage?: number | null
          profile_photo_url?: string | null
          relatives?: Json | null
          relatives_detailed?: Json | null
          remote_work_preference?: string | null
          salary_expectation_range?: string | null
          security_clearance_level?: string | null
          skills?: Json | null
          slug?: string | null
          supervisor_contact_consent?: boolean | null
          telephone_detailed?: string | null
          title?: string | null
          travel_availability?: string | null
          un_experience?: boolean | null
          un_organizations_worked?: Json | null
          unemployment_periods?: Json | null
          updated_at?: string
          us_green_card?: boolean | null
          us_green_card_detailed?: boolean | null
          us_green_card_details?: string | null
          us_green_card_details_detailed?: string | null
          willing_to_relocate?: boolean | null
          work_auth?: string | null
          work_experience?: Json | null
          work_preferences?: Json | null
          years_of_experience?: number | null
        }
        Update: {
          additional_fellowships?: Json | null
          affiliate_subtype?: string | null
          availability_date?: string | null
          availability_date_detailed?: string | null
          availability_mode?: string | null
          availability_mode_detailed?: string | null
          availability_status?: string | null
          candidate_type?: string | null
          certifications?: Json | null
          contract_type_preference?: string | null
          country_of_birth?: string | null
          country_of_birth_detailed?: string | null
          created_at?: string
          current_organization?: string | null
          current_position?: string | null
          date_of_birth?: string | null
          dependants?: Json | null
          dependants_detailed?: Json | null
          education?: Json | null
          email?: string
          email_public?: boolean | null
          family_name?: string | null
          fellowships?: Json | null
          first_name?: string | null
          gender?: string | null
          government_employment?: boolean | null
          has_security_clearance?: boolean | null
          id?: string
          languages?: Json | null
          last_name?: string | null
          law_violations_details?: string | null
          law_violations_disclosed?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          maiden_name?: string | null
          maiden_name_detailed?: string | null
          marital_status?: string | null
          marital_status_detailed?: string | null
          middle_names?: string | null
          mobility_medical_reservations?: string | null
          motivation_letter?: string | null
          name?: string
          nationality_change_details?: string | null
          nationality_change_details_detailed?: string | null
          nationality_changed?: boolean | null
          notice_period?: string | null
          notice_period_days?: number | null
          notice_period_detailed?: string | null
          objection_to_contact_present_employer?: boolean | null
          permanent_address?: string | null
          permanent_address_detailed?: string | null
          permanent_address_line1?: string | null
          permanent_address_line2?: string | null
          permanent_city?: string | null
          permanent_country?: string | null
          personal_references?: Json | null
          phf_education?: Json | null
          phf_work_experience?: Json | null
          phone?: string | null
          phone_public?: boolean | null
          place_of_birth?: string | null
          place_of_birth_detailed?: string | null
          portfolio_attachments?: Json | null
          preferred_locations?: Json | null
          present_address?: string | null
          present_address_detailed?: string | null
          present_address_line1?: string | null
          present_address_line2?: string | null
          present_address_same_as_permanent?: boolean | null
          present_city?: string | null
          present_country?: string | null
          present_nationality?: string | null
          present_nationality_detailed?: string | null
          presently_in_government_employ?: boolean | null
          privacy_setting?: string | null
          professional_summary?: string | null
          profile_completion_percentage?: number | null
          profile_photo_url?: string | null
          relatives?: Json | null
          relatives_detailed?: Json | null
          remote_work_preference?: string | null
          salary_expectation_range?: string | null
          security_clearance_level?: string | null
          skills?: Json | null
          slug?: string | null
          supervisor_contact_consent?: boolean | null
          telephone_detailed?: string | null
          title?: string | null
          travel_availability?: string | null
          un_experience?: boolean | null
          un_organizations_worked?: Json | null
          unemployment_periods?: Json | null
          updated_at?: string
          us_green_card?: boolean | null
          us_green_card_detailed?: boolean | null
          us_green_card_details?: string | null
          us_green_card_details_detailed?: string | null
          willing_to_relocate?: boolean | null
          work_auth?: string | null
          work_experience?: Json | null
          work_preferences?: Json | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          application_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          recipient_email: string
          recipient_name: string | null
          requisition_id: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          template_slug: string
          variables: Json | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_name?: string | null
          requisition_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          template_slug: string
          variables?: Json | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string | null
          requisition_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          template_slug?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          application_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          participants: Json | null
          thread_key: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          participants?: Json | null
          thread_key: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          participants?: Json | null
          thread_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          application_id: string
          created_at: string
          evaluator_id: string
          id: string
          notes: string | null
          section_scores: Json | null
          total: number | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          evaluator_id: string
          id?: string
          notes?: string | null
          section_scores?: Json | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          evaluator_id?: string
          id?: string
          notes?: string | null
          section_scores?: Json | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      external_panel_members: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          organization: string
          position: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          organization: string
          position: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          organization?: string
          position?: string
          updated_at?: string
        }
        Relationships: []
      }
      feedback_form_responses: {
        Row: {
          application_id: string
          created_at: string
          evaluator_id: string
          id: string
          overall: number | null
          panel_interview_id: string | null
          recommendation: Database["public"]["Enums"]["recommendation"] | null
          responses: Json | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          evaluator_id: string
          id?: string
          overall?: number | null
          panel_interview_id?: string | null
          recommendation?: Database["public"]["Enums"]["recommendation"] | null
          responses?: Json | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          evaluator_id?: string
          id?: string
          overall?: number | null
          panel_interview_id?: string | null
          recommendation?: Database["public"]["Enums"]["recommendation"] | null
          responses?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_form_responses_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_form_responses_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_form_templates: {
        Row: {
          auto_generated: boolean | null
          created_at: string
          id: string
          job_id: string | null
          name: string
          sections: Json | null
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string
          id?: string
          job_id?: string | null
          name: string
          sections?: Json | null
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string
          id?: string
          job_id?: string | null
          name?: string
          sections?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_form_templates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_appointment_comments: {
        Row: {
          appointment_id: string
          author_id: string | null
          comment_text: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          author_id?: string | null
          comment_text: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          author_id?: string | null
          comment_text?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_appointment_comments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "hr_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_appointments: {
        Row: {
          actions_in_hr_plan: string | null
          comments: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          duty_station: string | null
          effective_date: string | null
          email: string | null
          first_name: string
          grade: string | null
          id: string
          is_international: boolean | null
          job_title: string | null
          last_name: string
          main_hr_focal_point: string | null
          new_po: string | null
          notice_days_required: number | null
          old_po: string | null
          onboarding_comments: string | null
          operation_type: string
          recruitment_type: string | null
          section_unit: string | null
          status: string | null
          supervisor: string | null
          tentative_date: string | null
          updated_at: string | null
          user_id: string | null
          vacancy_reference: string | null
        }
        Insert: {
          actions_in_hr_plan?: string | null
          comments?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          duty_station?: string | null
          effective_date?: string | null
          email?: string | null
          first_name: string
          grade?: string | null
          id?: string
          is_international?: boolean | null
          job_title?: string | null
          last_name: string
          main_hr_focal_point?: string | null
          new_po?: string | null
          notice_days_required?: number | null
          old_po?: string | null
          onboarding_comments?: string | null
          operation_type: string
          recruitment_type?: string | null
          section_unit?: string | null
          status?: string | null
          supervisor?: string | null
          tentative_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          vacancy_reference?: string | null
        }
        Update: {
          actions_in_hr_plan?: string | null
          comments?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          duty_station?: string | null
          effective_date?: string | null
          email?: string | null
          first_name?: string
          grade?: string | null
          id?: string
          is_international?: boolean | null
          job_title?: string | null
          last_name?: string
          main_hr_focal_point?: string | null
          new_po?: string | null
          notice_days_required?: number | null
          old_po?: string | null
          onboarding_comments?: string | null
          operation_type?: string
          recruitment_type?: string | null
          section_unit?: string | null
          status?: string | null
          supervisor?: string | null
          tentative_date?: string | null
          updated_at?: string | null
          user_id?: string | null
          vacancy_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_separation_comments: {
        Row: {
          author_id: string | null
          comment_text: string
          created_at: string
          id: string
          separation_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          comment_text: string
          created_at?: string
          id?: string
          separation_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          comment_text?: string
          created_at?: string
          id?: string
          separation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_separation_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_separation_comments_separation_id_fkey"
            columns: ["separation_id"]
            isOneToOne: false
            referencedRelation: "hr_separations"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_separations: {
        Row: {
          actions_in_hr_plan: string | null
          clearance_status: string | null
          comments: string | null
          contract_type: string | null
          created_at: string
          duty_station: string | null
          effective_date: string | null
          email: string | null
          event_type: string | null
          first_name: string
          grade: string | null
          id: string
          is_international: boolean | null
          job_title: string | null
          last_name: string
          main_hr_focal_point: string | null
          notice_days_required: number | null
          operation_type: string
          pd_number: string | null
          reason: string | null
          section_unit: string | null
          separation_type: string | null
          staff_number: string | null
          status: string
          supervisor: string | null
          supervisor_staff_number: string | null
          tentative_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actions_in_hr_plan?: string | null
          clearance_status?: string | null
          comments?: string | null
          contract_type?: string | null
          created_at?: string
          duty_station?: string | null
          effective_date?: string | null
          email?: string | null
          event_type?: string | null
          first_name: string
          grade?: string | null
          id?: string
          is_international?: boolean | null
          job_title?: string | null
          last_name: string
          main_hr_focal_point?: string | null
          notice_days_required?: number | null
          operation_type?: string
          pd_number?: string | null
          reason?: string | null
          section_unit?: string | null
          separation_type?: string | null
          staff_number?: string | null
          status?: string
          supervisor?: string | null
          supervisor_staff_number?: string | null
          tentative_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actions_in_hr_plan?: string | null
          clearance_status?: string | null
          comments?: string | null
          contract_type?: string | null
          created_at?: string
          duty_station?: string | null
          effective_date?: string | null
          email?: string | null
          event_type?: string | null
          first_name?: string
          grade?: string | null
          id?: string
          is_international?: boolean | null
          job_title?: string | null
          last_name?: string
          main_hr_focal_point?: string | null
          notice_days_required?: number | null
          operation_type?: string
          pd_number?: string | null
          reason?: string | null
          section_unit?: string | null
          separation_type?: string | null
          staff_number?: string | null
          status?: string
          supervisor?: string | null
          supervisor_staff_number?: string | null
          tentative_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_separations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_talent_saved_searches: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          filters: Json
          id: string
          is_shared: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          filters?: Json
          id?: string
          is_shared?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          filters?: Json
          id?: string
          is_shared?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_talent_saved_searches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_panel_reports: {
        Row: {
          application_id: string
          competencies: string | null
          created_at: string | null
          created_by: string | null
          id: string
          introduction: string | null
          job_id: string
          recommendation: string | null
          skills: string | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          competencies?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          introduction?: string | null
          job_id: string
          recommendation?: string | null
          skills?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          competencies?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          introduction?: string | null
          job_id?: string
          recommendation?: string | null
          skills?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_panel_reports_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_panel_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_competencies: {
        Row: {
          competency_name: string
          competency_type: string
          created_at: string | null
          description: string | null
          id: string
          job_id: string
          order_index: number | null
          weight: number | null
        }
        Insert: {
          competency_name: string
          competency_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          job_id: string
          order_index?: number | null
          weight?: number | null
        }
        Update: {
          competency_name?: string
          competency_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          job_id?: string
          order_index?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_competencies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_email_alerts: {
        Row: {
          categories: Json | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          locations: Json | null
          search_term: string | null
          types: Json | null
          updated_at: string
          verification_token: string | null
          verified: boolean | null
        }
        Insert: {
          categories?: Json | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          locations?: Json | null
          search_term?: string | null
          types?: Json | null
          updated_at?: string
          verification_token?: string | null
          verified?: boolean | null
        }
        Update: {
          categories?: Json | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          locations?: Json | null
          search_term?: string | null
          types?: Json | null
          updated_at?: string
          verification_token?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      job_hiring_managers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: []
      }
      job_interview_panel_members: {
        Row: {
          created_at: string
          id: string
          job_id: string
          panel_role: Database["public"]["Enums"]["panel_member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          panel_role: Database["public"]["Enums"]["panel_member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          panel_role?: Database["public"]["Enums"]["panel_member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_interview_panel_members_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_panel_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_interview_question_competencies: {
        Row: {
          competency_id: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          competency_id: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          competency_id?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_interview_question_competencies_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "job_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_question_competencies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "job_interview_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_interview_question_contributors: {
        Row: {
          contributed_at: string | null
          contribution_type: string | null
          id: string
          question_id: string | null
          user_id: string | null
        }
        Insert: {
          contributed_at?: string | null
          contribution_type?: string | null
          id?: string
          question_id?: string | null
          user_id?: string | null
        }
        Update: {
          contributed_at?: string | null
          contribution_type?: string | null
          id?: string
          question_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_interview_question_contributors_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "job_interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_question_contributors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_interview_question_requirements: {
        Row: {
          bullet_index: number | null
          created_at: string
          id: string
          question_id: string
          requirement_id: string
        }
        Insert: {
          bullet_index?: number | null
          created_at?: string
          id?: string
          question_id: string
          requirement_id: string
        }
        Update: {
          bullet_index?: number | null
          created_at?: string
          id?: string
          question_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_interview_question_requirements_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "job_interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_question_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      job_interview_questions: {
        Row: {
          assigned_to: string | null
          competency_id: string | null
          created_at: string | null
          created_by: string | null
          estimated_minutes: number | null
          id: string
          job_id: string | null
          language_requirement_id: string | null
          order_index: number | null
          question_text: string
          requirement_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          competency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_minutes?: number | null
          id?: string
          job_id?: string | null
          language_requirement_id?: string | null
          order_index?: number | null
          question_text: string
          requirement_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          competency_id?: string | null
          created_at?: string | null
          created_by?: string | null
          estimated_minutes?: number | null
          id?: string
          job_id?: string | null
          language_requirement_id?: string | null
          order_index?: number | null
          question_text?: string
          requirement_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_interview_questions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_questions_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "job_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_questions_language_requirement_id_fkey"
            columns: ["language_requirement_id"]
            isOneToOne: false
            referencedRelation: "job_language_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interview_questions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      job_language_requirements: {
        Row: {
          created_at: string | null
          id: string
          is_essential: boolean | null
          job_id: string
          language: string
          level: string
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_essential?: boolean | null
          job_id: string
          language: string
          level: string
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_essential?: boolean | null
          job_id?: string
          language?: string
          level?: string
          order_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_language_requirements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          job_id: string
          must_have: boolean | null
          order_index: number | null
          params: Json | null
          title: string
          validator: string | null
          weight: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          job_id: string
          must_have?: boolean | null
          order_index?: number | null
          params?: Json | null
          title: string
          validator?: string | null
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string
          must_have?: boolean | null
          order_index?: number | null
          params?: Json | null
          title?: string
          validator?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "essential_criteria_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requisitions: {
        Row: {
          brief_outline: string | null
          chief_hr_comments: string | null
          chief_hr_reviewed: boolean | null
          chief_hr_reviewed_at: string | null
          chief_hr_reviewed_by: string | null
          chief_of_division_approval: boolean | null
          chief_of_division_approved_at: string | null
          chief_of_division_approved_by: string | null
          chief_of_division_sent_at: string | null
          chief_pd_approval: boolean | null
          chief_pd_approved_at: string | null
          chief_pd_approved_by: string | null
          chief_pd_comments: string | null
          closed_at: string | null
          closed_by: string | null
          closed_status: string | null
          closure_reason: string | null
          comments: Json | null
          consultant_duration: string | null
          converted_to_job_id: string | null
          core_competencies: Json | null
          created_at: string
          created_by: string
          deputy_director_approval: boolean | null
          deputy_director_approved_at: string | null
          deputy_director_approved_by: string | null
          deputy_director_sent_at: string | null
          desirable_education: string | null
          desirable_experience: string | null
          director_approval: boolean | null
          director_approved_at: string | null
          director_approved_by: string | null
          director_sent_at: string | null
          duty_station: string | null
          eligible_grades: string | null
          essential_education: string | null
          essential_education_level: string | null
          essential_experience: string | null
          final_clean_version: Json | null
          finance_controller_approval: boolean | null
          finance_controller_approved_at: string | null
          finance_controller_approved_by: string | null
          funding_comments: string | null
          funding_status: string | null
          global_competencies: Json | null
          grade: string | null
          hiring_manager_changes: Json | null
          hiring_manager_confirmed_at: string | null
          hiring_manager_confirmed_hr_changes: boolean | null
          hiring_manager_sent_at: string | null
          hr_change_summary: string | null
          hr_changes: Json | null
          hr_comments: string | null
          hr_final_review_at: string | null
          hr_final_review_by: string | null
          hr_final_review_completed: boolean | null
          hr_internal_status: string | null
          hr_original_data: Json | null
          hr_reviewed: boolean | null
          hr_reviewed_at: string | null
          hr_reviewed_by: string | null
          hr_sent_at: string | null
          id: string
          initial_request_approved: boolean | null
          initial_request_approved_at: string | null
          initial_request_approved_by: string | null
          initial_request_submitted: boolean | null
          intern_duration: string | null
          intern_modality: string | null
          internal_only: boolean | null
          language_requirements: Json | null
          leadership_competencies: Json | null
          main_duties_responsibilities: string | null
          management_competencies: Json | null
          nature_of_position: string | null
          objectives_of_programme: string | null
          pd_submitted_at: string | null
          pdf_url: string | null
          position_title: string | null
          positions_available: number | null
          postponed_until: string | null
          purpose_of_position: string | null
          reference_number: string | null
          slug: string | null
          start_date: string | null
          status: string
          temporary_duration: string | null
          unit_section_division: string | null
          updated_at: string
        }
        Insert: {
          brief_outline?: string | null
          chief_hr_comments?: string | null
          chief_hr_reviewed?: boolean | null
          chief_hr_reviewed_at?: string | null
          chief_hr_reviewed_by?: string | null
          chief_of_division_approval?: boolean | null
          chief_of_division_approved_at?: string | null
          chief_of_division_approved_by?: string | null
          chief_of_division_sent_at?: string | null
          chief_pd_approval?: boolean | null
          chief_pd_approved_at?: string | null
          chief_pd_approved_by?: string | null
          chief_pd_comments?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_status?: string | null
          closure_reason?: string | null
          comments?: Json | null
          consultant_duration?: string | null
          converted_to_job_id?: string | null
          core_competencies?: Json | null
          created_at?: string
          created_by: string
          deputy_director_approval?: boolean | null
          deputy_director_approved_at?: string | null
          deputy_director_approved_by?: string | null
          deputy_director_sent_at?: string | null
          desirable_education?: string | null
          desirable_experience?: string | null
          director_approval?: boolean | null
          director_approved_at?: string | null
          director_approved_by?: string | null
          director_sent_at?: string | null
          duty_station?: string | null
          eligible_grades?: string | null
          essential_education?: string | null
          essential_education_level?: string | null
          essential_experience?: string | null
          final_clean_version?: Json | null
          finance_controller_approval?: boolean | null
          finance_controller_approved_at?: string | null
          finance_controller_approved_by?: string | null
          funding_comments?: string | null
          funding_status?: string | null
          global_competencies?: Json | null
          grade?: string | null
          hiring_manager_changes?: Json | null
          hiring_manager_confirmed_at?: string | null
          hiring_manager_confirmed_hr_changes?: boolean | null
          hiring_manager_sent_at?: string | null
          hr_change_summary?: string | null
          hr_changes?: Json | null
          hr_comments?: string | null
          hr_final_review_at?: string | null
          hr_final_review_by?: string | null
          hr_final_review_completed?: boolean | null
          hr_internal_status?: string | null
          hr_original_data?: Json | null
          hr_reviewed?: boolean | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
          hr_sent_at?: string | null
          id?: string
          initial_request_approved?: boolean | null
          initial_request_approved_at?: string | null
          initial_request_approved_by?: string | null
          initial_request_submitted?: boolean | null
          intern_duration?: string | null
          intern_modality?: string | null
          internal_only?: boolean | null
          language_requirements?: Json | null
          leadership_competencies?: Json | null
          main_duties_responsibilities?: string | null
          management_competencies?: Json | null
          nature_of_position?: string | null
          objectives_of_programme?: string | null
          pd_submitted_at?: string | null
          pdf_url?: string | null
          position_title?: string | null
          positions_available?: number | null
          postponed_until?: string | null
          purpose_of_position?: string | null
          reference_number?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string
          temporary_duration?: string | null
          unit_section_division?: string | null
          updated_at?: string
        }
        Update: {
          brief_outline?: string | null
          chief_hr_comments?: string | null
          chief_hr_reviewed?: boolean | null
          chief_hr_reviewed_at?: string | null
          chief_hr_reviewed_by?: string | null
          chief_of_division_approval?: boolean | null
          chief_of_division_approved_at?: string | null
          chief_of_division_approved_by?: string | null
          chief_of_division_sent_at?: string | null
          chief_pd_approval?: boolean | null
          chief_pd_approved_at?: string | null
          chief_pd_approved_by?: string | null
          chief_pd_comments?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closed_status?: string | null
          closure_reason?: string | null
          comments?: Json | null
          consultant_duration?: string | null
          converted_to_job_id?: string | null
          core_competencies?: Json | null
          created_at?: string
          created_by?: string
          deputy_director_approval?: boolean | null
          deputy_director_approved_at?: string | null
          deputy_director_approved_by?: string | null
          deputy_director_sent_at?: string | null
          desirable_education?: string | null
          desirable_experience?: string | null
          director_approval?: boolean | null
          director_approved_at?: string | null
          director_approved_by?: string | null
          director_sent_at?: string | null
          duty_station?: string | null
          eligible_grades?: string | null
          essential_education?: string | null
          essential_education_level?: string | null
          essential_experience?: string | null
          final_clean_version?: Json | null
          finance_controller_approval?: boolean | null
          finance_controller_approved_at?: string | null
          finance_controller_approved_by?: string | null
          funding_comments?: string | null
          funding_status?: string | null
          global_competencies?: Json | null
          grade?: string | null
          hiring_manager_changes?: Json | null
          hiring_manager_confirmed_at?: string | null
          hiring_manager_confirmed_hr_changes?: boolean | null
          hiring_manager_sent_at?: string | null
          hr_change_summary?: string | null
          hr_changes?: Json | null
          hr_comments?: string | null
          hr_final_review_at?: string | null
          hr_final_review_by?: string | null
          hr_final_review_completed?: boolean | null
          hr_internal_status?: string | null
          hr_original_data?: Json | null
          hr_reviewed?: boolean | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
          hr_sent_at?: string | null
          id?: string
          initial_request_approved?: boolean | null
          initial_request_approved_at?: string | null
          initial_request_approved_by?: string | null
          initial_request_submitted?: boolean | null
          intern_duration?: string | null
          intern_modality?: string | null
          internal_only?: boolean | null
          language_requirements?: Json | null
          leadership_competencies?: Json | null
          main_duties_responsibilities?: string | null
          management_competencies?: Json | null
          nature_of_position?: string | null
          objectives_of_programme?: string | null
          pd_submitted_at?: string | null
          pdf_url?: string | null
          position_title?: string | null
          positions_available?: number | null
          postponed_until?: string | null
          purpose_of_position?: string | null
          reference_number?: string | null
          slug?: string | null
          start_date?: string | null
          status?: string
          temporary_duration?: string | null
          unit_section_division?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requisitions_chief_pd_approved_by_fkey"
            columns: ["chief_pd_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requisitions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requisitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requisitions_initial_request_approved_by_fkey"
            columns: ["initial_request_approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_review_committee_members: {
        Row: {
          created_at: string
          id: string
          job_id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_review_committee_members_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_review_committee_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attachments_required: Json | null
          branding: Json | null
          category: string | null
          closing_date: string | null
          competencies: string | null
          created_at: string
          description_md: string | null
          eligibility_note: string | null
          essential_education_level: string | null
          grade: string | null
          id: string
          internal_only: boolean | null
          issue_date: string | null
          language_requirements: string | null
          location: string | null
          notice_no: string | null
          org_unit: string | null
          positions: number | null
          privacy_notice_url: string | null
          requirements_md: string | null
          review_committee_approved: boolean | null
          review_committee_approved_at: string | null
          review_committee_approved_by: string | null
          review_committee_is_resubmission: boolean | null
          review_committee_sent_by: string | null
          review_committee_sent_for_approval_at: string | null
          review_committee_status: string | null
          salary_estimate: string | null
          slug: string | null
          status: string | null
          timezone: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          attachments_required?: Json | null
          branding?: Json | null
          category?: string | null
          closing_date?: string | null
          competencies?: string | null
          created_at?: string
          description_md?: string | null
          eligibility_note?: string | null
          essential_education_level?: string | null
          grade?: string | null
          id?: string
          internal_only?: boolean | null
          issue_date?: string | null
          language_requirements?: string | null
          location?: string | null
          notice_no?: string | null
          org_unit?: string | null
          positions?: number | null
          privacy_notice_url?: string | null
          requirements_md?: string | null
          review_committee_approved?: boolean | null
          review_committee_approved_at?: string | null
          review_committee_approved_by?: string | null
          review_committee_is_resubmission?: boolean | null
          review_committee_sent_by?: string | null
          review_committee_sent_for_approval_at?: string | null
          review_committee_status?: string | null
          salary_estimate?: string | null
          slug?: string | null
          status?: string | null
          timezone?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          attachments_required?: Json | null
          branding?: Json | null
          category?: string | null
          closing_date?: string | null
          competencies?: string | null
          created_at?: string
          description_md?: string | null
          eligibility_note?: string | null
          essential_education_level?: string | null
          grade?: string | null
          id?: string
          internal_only?: boolean | null
          issue_date?: string | null
          language_requirements?: string | null
          location?: string | null
          notice_no?: string | null
          org_unit?: string | null
          positions?: number | null
          privacy_notice_url?: string | null
          requirements_md?: string | null
          review_committee_approved?: boolean | null
          review_committee_approved_at?: string | null
          review_committee_approved_by?: string | null
          review_committee_is_resubmission?: boolean | null
          review_committee_sent_by?: string | null
          review_committee_sent_for_approval_at?: string | null
          review_committee_status?: string | null
          salary_estimate?: string | null
          slug?: string | null
          status?: string | null
          timezone?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      killer_questions: {
        Row: {
          created_at: string
          custom_logic: Json | null
          id: string
          input_type: Database["public"]["Enums"]["input_type"]
          job_id: string
          label: string
          options: Json | null
          rule: Database["public"]["Enums"]["killer_question_rule"]
        }
        Insert: {
          created_at?: string
          custom_logic?: Json | null
          id?: string
          input_type: Database["public"]["Enums"]["input_type"]
          job_id: string
          label: string
          options?: Json | null
          rule: Database["public"]["Enums"]["killer_question_rule"]
        }
        Update: {
          created_at?: string
          custom_logic?: Json | null
          id?: string
          input_type?: Database["public"]["Enums"]["input_type"]
          job_id?: string
          label?: string
          options?: Json | null
          rule?: Database["public"]["Enums"]["killer_question_rule"]
        }
        Relationships: [
          {
            foreignKeyName: "killer_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_determinations: {
        Row: {
          additional_years_counted: number | null
          application_id: string
          approved_at: string | null
          approved_by: string | null
          base_step: number | null
          calculated_at: string | null
          calculated_by: string | null
          calculated_step: number
          candidate_education_level: string | null
          candidate_highest_education: string | null
          candidate_relevant_experience_years: number | null
          candidate_total_experience_years: number | null
          created_at: string | null
          education_step: number | null
          education_step_justification: string | null
          essential_education_level: string | null
          essential_experience_text: string | null
          essential_experience_years: number | null
          experience_steps: number | null
          experience_steps_justification: string | null
          final_step: number | null
          id: string
          job_grade: string | null
          job_id: string
          override_justification: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          whed_verification_notes: string | null
          whed_verified: boolean | null
        }
        Insert: {
          additional_years_counted?: number | null
          application_id: string
          approved_at?: string | null
          approved_by?: string | null
          base_step?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          calculated_step: number
          candidate_education_level?: string | null
          candidate_highest_education?: string | null
          candidate_relevant_experience_years?: number | null
          candidate_total_experience_years?: number | null
          created_at?: string | null
          education_step?: number | null
          education_step_justification?: string | null
          essential_education_level?: string | null
          essential_experience_text?: string | null
          essential_experience_years?: number | null
          experience_steps?: number | null
          experience_steps_justification?: string | null
          final_step?: number | null
          id?: string
          job_grade?: string | null
          job_id: string
          override_justification?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          whed_verification_notes?: string | null
          whed_verified?: boolean | null
        }
        Update: {
          additional_years_counted?: number | null
          application_id?: string
          approved_at?: string | null
          approved_by?: string | null
          base_step?: number | null
          calculated_at?: string | null
          calculated_by?: string | null
          calculated_step?: number
          candidate_education_level?: string | null
          candidate_highest_education?: string | null
          candidate_relevant_experience_years?: number | null
          candidate_total_experience_years?: number | null
          created_at?: string | null
          education_step?: number | null
          education_step_justification?: string | null
          essential_education_level?: string | null
          essential_experience_text?: string | null
          essential_experience_years?: number | null
          experience_steps?: number | null
          experience_steps_justification?: string | null
          final_step?: number | null
          id?: string
          job_grade?: string | null
          job_id?: string
          override_justification?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          whed_verification_notes?: string | null
          whed_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_determinations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_determinations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_determinations_calculated_by_fkey"
            columns: ["calculated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_determinations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_interview_invitations: {
        Row: {
          application_id: string
          booked_at: string | null
          booked_slot_id: string | null
          created_at: string
          created_by: string | null
          deadline_at: string | null
          id: string
          invited_at: string
          job_id: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          booked_at?: string | null
          booked_slot_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          id?: string
          invited_at?: string
          job_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          booked_at?: string | null
          booked_slot_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          id?: string
          invited_at?: string
          job_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_interview_invitations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_interview_invitations_booked_slot_id_fkey"
            columns: ["booked_slot_id"]
            isOneToOne: false
            referencedRelation: "panel_interview_time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_interview_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_interview_invitations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_interview_participants: {
        Row: {
          confirmed: boolean | null
          created_at: string
          external_panelist_id: string | null
          id: string
          panel_interview_id: string
          panelist_id: string | null
          role: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          external_panelist_id?: string | null
          id?: string
          panel_interview_id: string
          panelist_id?: string | null
          role?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
          external_panelist_id?: string | null
          id?: string
          panel_interview_id?: string
          panelist_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panel_interview_participants_external_panelist_id_fkey"
            columns: ["external_panelist_id"]
            isOneToOne: false
            referencedRelation: "external_panel_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_interview_participants_panel_interview_id_fkey"
            columns: ["panel_interview_id"]
            isOneToOne: false
            referencedRelation: "panel_interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_interview_participants_panelist_id_fkey"
            columns: ["panelist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_interview_time_slots: {
        Row: {
          booked_by_application_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          job_id: string
          panel_member_ids: string[]
          slot_datetime: string
          status: string
          updated_at: string
        }
        Insert: {
          booked_by_application_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          job_id: string
          panel_member_ids: string[]
          slot_datetime: string
          status?: string
          updated_at?: string
        }
        Update: {
          booked_by_application_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          job_id?: string
          panel_member_ids?: string[]
          slot_datetime?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "panel_interview_time_slots_booked_by_application_id_fkey"
            columns: ["booked_by_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_interview_time_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panel_interview_time_slots_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      panel_interviews: {
        Row: {
          application_id: string
          created_at: string
          created_by: string
          duration_minutes: number
          feedback_template_id: string | null
          id: string
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number
          feedback_template_id?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          feedback_template_id?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      performance_cycles: {
        Row: {
          begin_year_deadline: string | null
          created_at: string
          created_by: string | null
          cycle_type: string | null
          end_date: string
          end_year_deadline: string | null
          id: string
          is_auto_generated: boolean | null
          mid_year_deadline: string | null
          name: string
          staff_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          begin_year_deadline?: string | null
          created_at?: string
          created_by?: string | null
          cycle_type?: string | null
          end_date: string
          end_year_deadline?: string | null
          id?: string
          is_auto_generated?: boolean | null
          mid_year_deadline?: string | null
          name: string
          staff_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          begin_year_deadline?: string | null
          created_at?: string
          created_by?: string | null
          cycle_type?: string | null
          end_date?: string
          end_year_deadline?: string | null
          id?: string
          is_auto_generated?: boolean | null
          mid_year_deadline?: string | null
          name?: string
          staff_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_cycles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_cycles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      requisition_field_comments: {
        Row: {
          author_id: string
          comment_text: string
          created_at: string
          field_name: string
          highlighted_text: string | null
          id: string
          is_resolved: boolean
          parent_comment_id: string | null
          requisition_id: string
          resolved_at: string | null
          resolved_by: string | null
          selection_end: number | null
          selection_start: number | null
          updated_at: string
        }
        Insert: {
          author_id: string
          comment_text: string
          created_at?: string
          field_name: string
          highlighted_text?: string | null
          id?: string
          is_resolved?: boolean
          parent_comment_id?: string | null
          requisition_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          selection_end?: number | null
          selection_start?: number | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment_text?: string
          created_at?: string
          field_name?: string
          highlighted_text?: string | null
          id?: string
          is_resolved?: boolean
          parent_comment_id?: string | null
          requisition_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          selection_end?: number | null
          selection_start?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisition_field_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_field_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "requisition_field_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_field_comments_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisition_field_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      research_exercise_submissions: {
        Row: {
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          slot_id: string | null
          submitted_at: string | null
        }
        Insert: {
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          slot_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          slot_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_exercise_submissions_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "assessment_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_scores: {
        Row: {
          ai_score: number | null
          application_id: string
          created_at: string
          id: string
          rubric_breakdown: Json | null
          version: string | null
        }
        Insert: {
          ai_score?: number | null
          application_id: string
          created_at?: string
          id?: string
          rubric_breakdown?: Json | null
          version?: string | null
        }
        Update: {
          ai_score?: number | null
          application_id?: string
          created_at?: string
          id?: string
          rubric_breakdown?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screening_scores_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          ip_address: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          ip_address: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          ip_address?: string
          success?: boolean
        }
        Relationships: []
      }
      skill_assessments: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assessed_at: string | null
          assessed_by: string | null
          attachments: Json | null
          created_at: string
          expiration_date: string | null
          has_credential: boolean | null
          id: string
          manager_assessment: number | null
          remarks: string | null
          required_level: number | null
          scope: string | null
          self_assessment: number | null
          skill_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assessed_at?: string | null
          assessed_by?: string | null
          attachments?: Json | null
          created_at?: string
          expiration_date?: string | null
          has_credential?: boolean | null
          id?: string
          manager_assessment?: number | null
          remarks?: string | null
          required_level?: number | null
          scope?: string | null
          self_assessment?: number | null
          skill_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assessed_at?: string | null
          assessed_by?: string | null
          attachments?: Json | null
          created_at?: string
          expiration_date?: string | null
          has_credential?: boolean | null
          id?: string
          manager_assessment?: number | null
          remarks?: string | null
          required_level?: number | null
          scope?: string | null
          self_assessment?: number | null
          skill_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_assessments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_assessed_by_fkey"
            columns: ["assessed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_definitions: {
        Row: {
          ai_review_pending: boolean | null
          ai_reviewed_at: string | null
          ai_reviewed_by: string | null
          ai_suggested_category: string | null
          ai_suggested_status: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          skill_type: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ai_review_pending?: boolean | null
          ai_reviewed_at?: string | null
          ai_reviewed_by?: string | null
          ai_suggested_category?: string | null
          ai_suggested_status?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          skill_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ai_review_pending?: boolean | null
          ai_reviewed_at?: string | null
          ai_reviewed_by?: string | null
          ai_suggested_category?: string | null
          ai_suggested_status?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          skill_type?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stage_events: {
        Row: {
          application_id: string
          at: string
          by_user: string | null
          from_stage: Database["public"]["Enums"]["application_status"] | null
          id: string
          reason: string | null
          to_stage: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          application_id: string
          at?: string
          by_user?: string | null
          from_stage?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          reason?: string | null
          to_stage: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          application_id?: string
          at?: string
          by_user?: string | null
          from_stage?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          reason?: string | null
          to_stage?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "stage_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_events_by_user_fkey"
            columns: ["by_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      talent_pool_searches: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_shared: boolean | null
          name: string
          search_criteria: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_shared?: boolean | null
          name: string
          search_criteria?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_shared?: boolean | null
          name?: string
          search_criteria?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_searches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_skill_requirements: {
        Row: {
          applies_to_division: string | null
          applies_to_unit: string | null
          created_at: string
          id: string
          manager_id: string
          required_level: number
          skill_id: string
          updated_at: string
        }
        Insert: {
          applies_to_division?: string | null
          applies_to_unit?: string | null
          created_at?: string
          id?: string
          manager_id: string
          required_level: number
          skill_id: string
          updated_at?: string
        }
        Update: {
          applies_to_division?: string | null
          applies_to_unit?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          required_level?: number
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_skill_requirements_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_skill_requirements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          affiliate_type: string | null
          contract_end_date: string | null
          contract_start_date: string | null
          created_at: string
          current_grade: string | null
          department: string | null
          division: string | null
          duty_station: string | null
          email: string
          entry_on_duty_date: string | null
          first_incumbency_date: string | null
          gender: string | null
          id: string
          job_title: string | null
          line_manager: string | null
          name: string
          nationality: string | null
          personnel_type: string | null
          probation_end_date: string | null
          role: Database["public"]["Enums"]["user_role"]
          second_line_manager: string | null
          skills: Json | null
          staff_number: string | null
          unit: string | null
          updated_at: string
          worker_type: string | null
        }
        Insert: {
          affiliate_type?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          current_grade?: string | null
          department?: string | null
          division?: string | null
          duty_station?: string | null
          email: string
          entry_on_duty_date?: string | null
          first_incumbency_date?: string | null
          gender?: string | null
          id: string
          job_title?: string | null
          line_manager?: string | null
          name: string
          nationality?: string | null
          personnel_type?: string | null
          probation_end_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          second_line_manager?: string | null
          skills?: Json | null
          staff_number?: string | null
          unit?: string | null
          updated_at?: string
          worker_type?: string | null
        }
        Update: {
          affiliate_type?: string | null
          contract_end_date?: string | null
          contract_start_date?: string | null
          created_at?: string
          current_grade?: string | null
          department?: string | null
          division?: string | null
          duty_station?: string | null
          email?: string
          entry_on_duty_date?: string | null
          first_incumbency_date?: string | null
          gender?: string | null
          id?: string
          job_title?: string | null
          line_manager?: string | null
          name?: string
          nationality?: string | null
          personnel_type?: string | null
          probation_end_date?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          second_line_manager?: string | null
          skills?: Json | null
          staff_number?: string | null
          unit?: string | null
          updated_at?: string
          worker_type?: string | null
        }
        Relationships: []
      }
      video_answers: {
        Row: {
          application_id: string
          azure_blob_url: string | null
          duration: number | null
          file_size: number | null
          id: string
          processing_status: string | null
          question_id: string
          retry_count: number | null
          taken_at: string
          transcript: string | null
          url: string
          virus_scan_status: string | null
        }
        Insert: {
          application_id: string
          azure_blob_url?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          processing_status?: string | null
          question_id: string
          retry_count?: number | null
          taken_at?: string
          transcript?: string | null
          url: string
          virus_scan_status?: string | null
        }
        Update: {
          application_id?: string
          azure_blob_url?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          processing_status?: string | null
          question_id?: string
          retry_count?: number | null
          taken_at?: string
          transcript?: string | null
          url?: string
          virus_scan_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      video_assignments: {
        Row: {
          application_id: string
          attempts: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          deadline_at: string
          extended_by: string | null
          extension_reason: string | null
          feedback_submitted_at: string | null
          id: string
          last_activity_at: string | null
          opened_at: string | null
          question_set_id: string
          retakes_used_by_question: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["video_assignment_status"]
          token: string
          updated_at: string
        }
        Insert: {
          application_id: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string
          extended_by?: string | null
          extension_reason?: string | null
          feedback_submitted_at?: string | null
          id?: string
          last_activity_at?: string | null
          opened_at?: string | null
          question_set_id: string
          retakes_used_by_question?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["video_assignment_status"]
          token?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          attempts?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string
          extended_by?: string | null
          extension_reason?: string | null
          feedback_submitted_at?: string | null
          id?: string
          last_activity_at?: string | null
          opened_at?: string | null
          question_set_id?: string
          retakes_used_by_question?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["video_assignment_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_video_assignments_application"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_video_assignments_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_video_assignments_extended_by"
            columns: ["extended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_video_assignments_question_set"
            columns: ["question_set_id"]
            isOneToOne: false
            referencedRelation: "video_question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      video_events: {
        Row: {
          assignment_id: string
          at: string
          id: string
          meta: Json | null
          type: Database["public"]["Enums"]["video_event_type"]
        }
        Insert: {
          assignment_id: string
          at?: string
          id?: string
          meta?: Json | null
          type: Database["public"]["Enums"]["video_event_type"]
        }
        Update: {
          assignment_id?: string
          at?: string
          id?: string
          meta?: Json | null
          type?: Database["public"]["Enums"]["video_event_type"]
        }
        Relationships: [
          {
            foreignKeyName: "video_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "video_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      video_question_sets: {
        Row: {
          allow_retakes: boolean | null
          answer_secs: number | null
          created_at: string
          created_by: string | null
          id: string
          job_id: string
          max_retakes: number | null
          name: string
          prep_and_read_secs: number | null
          prep_secs: number | null
          questions: Json | null
          read_secs: number | null
        }
        Insert: {
          allow_retakes?: boolean | null
          answer_secs?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_id: string
          max_retakes?: number | null
          name: string
          prep_and_read_secs?: number | null
          prep_secs?: number | null
          questions?: Json | null
          read_secs?: number | null
        }
        Update: {
          allow_retakes?: boolean | null
          answer_secs?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string
          max_retakes?: number | null
          name?: string
          prep_and_read_secs?: number | null
          prep_secs?: number | null
          questions?: Json | null
          read_secs?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_question_sets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_question_sets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      video_ratings: {
        Row: {
          comments: string | null
          created_at: string
          evaluator_id: string
          id: string
          rating: number | null
          updated_at: string
          video_answer_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          evaluator_id: string
          id?: string
          rating?: number | null
          updated_at?: string
          video_answer_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          evaluator_id?: string
          id?: string
          rating?: number | null
          updated_at?: string
          video_answer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_ratings_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_ratings_video_answer_id_fkey"
            columns: ["video_answer_id"]
            isOneToOne: false
            referencedRelation: "video_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      whed_universities: {
        Row: {
          alternative_names: string[] | null
          country: string
          country_code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          alternative_names?: string[] | null
          country: string
          country_code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          alternative_names?: string[] | null
          country?: string
          country_code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workplan_competencies: {
        Row: {
          competency_name: string
          competency_type: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          staff_comment: string | null
          staff_rating: number | null
          supervisor_comment: string | null
          supervisor_rating: number | null
          updated_at: string
          workplan_id: string
        }
        Insert: {
          competency_name: string
          competency_type: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          staff_comment?: string | null
          staff_rating?: number | null
          supervisor_comment?: string | null
          supervisor_rating?: number | null
          updated_at?: string
          workplan_id: string
        }
        Update: {
          competency_name?: string
          competency_type?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          staff_comment?: string | null
          staff_rating?: number | null
          supervisor_comment?: string | null
          supervisor_rating?: number | null
          updated_at?: string
          workplan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplan_competencies_workplan_id_fkey"
            columns: ["workplan_id"]
            isOneToOne: false
            referencedRelation: "workplans"
            referencedColumns: ["id"]
          },
        ]
      }
      workplan_learning_plans: {
        Row: {
          achievements: string | null
          created_at: string
          description: string | null
          end_year_comment: string | null
          id: string
          learning_areas: Json | null
          learning_methods: Json | null
          learning_reasons: Json | null
          updated_at: string
          workplan_id: string
        }
        Insert: {
          achievements?: string | null
          created_at?: string
          description?: string | null
          end_year_comment?: string | null
          id?: string
          learning_areas?: Json | null
          learning_methods?: Json | null
          learning_reasons?: Json | null
          updated_at?: string
          workplan_id: string
        }
        Update: {
          achievements?: string | null
          created_at?: string
          description?: string | null
          end_year_comment?: string | null
          id?: string
          learning_areas?: Json | null
          learning_methods?: Json | null
          learning_reasons?: Json | null
          updated_at?: string
          workplan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplan_learning_plans_workplan_id_fkey"
            columns: ["workplan_id"]
            isOneToOne: true
            referencedRelation: "workplans"
            referencedColumns: ["id"]
          },
        ]
      }
      workplan_objectives: {
        Row: {
          actual_time_percent: number | null
          created_at: string
          description: string | null
          id: string
          mid_year_progress: string | null
          order_index: number
          output_id: string | null
          planned_time_percent: number | null
          staff_comment: string | null
          staff_rating: number | null
          status: string | null
          supervisor_comment: string | null
          supervisor_rating: number | null
          title: string
          updated_at: string
          workplan_id: string
        }
        Insert: {
          actual_time_percent?: number | null
          created_at?: string
          description?: string | null
          id?: string
          mid_year_progress?: string | null
          order_index?: number
          output_id?: string | null
          planned_time_percent?: number | null
          staff_comment?: string | null
          staff_rating?: number | null
          status?: string | null
          supervisor_comment?: string | null
          supervisor_rating?: number | null
          title: string
          updated_at?: string
          workplan_id: string
        }
        Update: {
          actual_time_percent?: number | null
          created_at?: string
          description?: string | null
          id?: string
          mid_year_progress?: string | null
          order_index?: number
          output_id?: string | null
          planned_time_percent?: number | null
          staff_comment?: string | null
          staff_rating?: number | null
          status?: string | null
          supervisor_comment?: string | null
          supervisor_rating?: number | null
          title?: string
          updated_at?: string
          workplan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplan_objectives_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "budget_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplan_objectives_workplan_id_fkey"
            columns: ["workplan_id"]
            isOneToOne: false
            referencedRelation: "workplans"
            referencedColumns: ["id"]
          },
        ]
      }
      workplan_team_objectives: {
        Row: {
          created_at: string
          description: string | null
          id: string
          individual_contribution: string | null
          objective_type: string
          staff_rating: number | null
          status: string | null
          supervisor_rating: number | null
          title: string
          updated_at: string
          workplan_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          individual_contribution?: string | null
          objective_type: string
          staff_rating?: number | null
          status?: string | null
          supervisor_rating?: number | null
          title: string
          updated_at?: string
          workplan_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          individual_contribution?: string | null
          objective_type?: string
          staff_rating?: number | null
          status?: string | null
          supervisor_rating?: number | null
          title?: string
          updated_at?: string
          workplan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplan_team_objectives_workplan_id_fkey"
            columns: ["workplan_id"]
            isOneToOne: false
            referencedRelation: "workplans"
            referencedColumns: ["id"]
          },
        ]
      }
      workplans: {
        Row: {
          begin_year_discussion_at: string | null
          begin_year_staff_signed_at: string | null
          begin_year_submitted_at: string | null
          begin_year_supervisor1_signed_at: string | null
          begin_year_supervisor2_signed_at: string | null
          created_at: string
          current_phase: string
          cycle_id: string
          end_year_discussion_at: string | null
          end_year_staff_acknowledgment_at: string | null
          end_year_staff_final_signed_at: string | null
          end_year_staff_signed_at: string | null
          end_year_submitted_at: string | null
          end_year_supervisor1_signed_at: string | null
          end_year_supervisor2_signed_at: string | null
          id: string
          is_supervisor_role: boolean | null
          mandatory_training_completed: boolean | null
          mid_year_discussion_at: string | null
          mid_year_staff_signed_at: string | null
          mid_year_submitted_at: string | null
          mid_year_supervisor1_signed_at: string | null
          mid_year_supervisor2_signed_at: string | null
          overall_rating: number | null
          staff_achievements_comment: string | null
          staff_challenges_comment: string | null
          staff_id: string
          staff_support_comment: string | null
          status: string
          supervisor_achievements_comment: string | null
          supervisor_challenges_comment: string | null
          supervisor_support_comment: string | null
          supervisor1_id: string | null
          supervisor2_id: string | null
          updated_at: string
        }
        Insert: {
          begin_year_discussion_at?: string | null
          begin_year_staff_signed_at?: string | null
          begin_year_submitted_at?: string | null
          begin_year_supervisor1_signed_at?: string | null
          begin_year_supervisor2_signed_at?: string | null
          created_at?: string
          current_phase?: string
          cycle_id: string
          end_year_discussion_at?: string | null
          end_year_staff_acknowledgment_at?: string | null
          end_year_staff_final_signed_at?: string | null
          end_year_staff_signed_at?: string | null
          end_year_submitted_at?: string | null
          end_year_supervisor1_signed_at?: string | null
          end_year_supervisor2_signed_at?: string | null
          id?: string
          is_supervisor_role?: boolean | null
          mandatory_training_completed?: boolean | null
          mid_year_discussion_at?: string | null
          mid_year_staff_signed_at?: string | null
          mid_year_submitted_at?: string | null
          mid_year_supervisor1_signed_at?: string | null
          mid_year_supervisor2_signed_at?: string | null
          overall_rating?: number | null
          staff_achievements_comment?: string | null
          staff_challenges_comment?: string | null
          staff_id: string
          staff_support_comment?: string | null
          status?: string
          supervisor_achievements_comment?: string | null
          supervisor_challenges_comment?: string | null
          supervisor_support_comment?: string | null
          supervisor1_id?: string | null
          supervisor2_id?: string | null
          updated_at?: string
        }
        Update: {
          begin_year_discussion_at?: string | null
          begin_year_staff_signed_at?: string | null
          begin_year_submitted_at?: string | null
          begin_year_supervisor1_signed_at?: string | null
          begin_year_supervisor2_signed_at?: string | null
          created_at?: string
          current_phase?: string
          cycle_id?: string
          end_year_discussion_at?: string | null
          end_year_staff_acknowledgment_at?: string | null
          end_year_staff_final_signed_at?: string | null
          end_year_staff_signed_at?: string | null
          end_year_submitted_at?: string | null
          end_year_supervisor1_signed_at?: string | null
          end_year_supervisor2_signed_at?: string | null
          id?: string
          is_supervisor_role?: boolean | null
          mandatory_training_completed?: boolean | null
          mid_year_discussion_at?: string | null
          mid_year_staff_signed_at?: string | null
          mid_year_submitted_at?: string | null
          mid_year_supervisor1_signed_at?: string | null
          mid_year_supervisor2_signed_at?: string | null
          overall_rating?: number | null
          staff_achievements_comment?: string | null
          staff_challenges_comment?: string | null
          staff_id?: string
          staff_support_comment?: string | null
          status?: string
          supervisor_achievements_comment?: string | null
          supervisor_challenges_comment?: string | null
          supervisor_support_comment?: string | null
          supervisor1_id?: string | null
          supervisor2_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workplans_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "performance_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplans_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplans_supervisor1_id_fkey"
            columns: ["supervisor1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workplans_supervisor2_id_fkey"
            columns: ["supervisor2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      written_assessments: {
        Row: {
          assessment_type: Database["public"]["Enums"]["assessment_type"] | null
          availability_window_hours: number | null
          created_at: string
          created_by: string | null
          curveball_trigger_type:
            | Database["public"]["Enums"]["curveball_trigger_type"]
            | null
          curveball_trigger_value: number | null
          description: string | null
          id: string
          instructions: string | null
          reference_document_name: string | null
          reference_document_url: string | null
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_hours: number | null
          time_limit_minutes: number
          title: string
          updated_at: string
        }
        Insert: {
          assessment_type?:
            | Database["public"]["Enums"]["assessment_type"]
            | null
          availability_window_hours?: number | null
          created_at?: string
          created_by?: string | null
          curveball_trigger_type?:
            | Database["public"]["Enums"]["curveball_trigger_type"]
            | null
          curveball_trigger_value?: number | null
          description?: string | null
          id?: string
          instructions?: string | null
          reference_document_name?: string | null
          reference_document_url?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          time_limit_hours?: number | null
          time_limit_minutes?: number
          title: string
          updated_at?: string
        }
        Update: {
          assessment_type?:
            | Database["public"]["Enums"]["assessment_type"]
            | null
          availability_window_hours?: number | null
          created_at?: string
          created_by?: string | null
          curveball_trigger_type?:
            | Database["public"]["Enums"]["curveball_trigger_type"]
            | null
          curveball_trigger_value?: number | null
          description?: string | null
          id?: string
          instructions?: string | null
          reference_document_name?: string | null
          reference_document_url?: string | null
          status?: Database["public"]["Enums"]["assessment_status"]
          time_limit_hours?: number | null
          time_limit_minutes?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "written_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_interview_slot: {
        Args: { p_application_id: string; p_slot_id: string }
        Returns: Json
      }
      can_approve_as_chief: {
        Args: { p_requisition_id: string; p_user_id: string }
        Returns: boolean
      }
      categorize_skill: {
        Args: { skill_name: string }
        Returns: {
          category: string
          skill_type: string
        }[]
      }
      check_signup_rate_limit: {
        Args: { p_email: string; p_ip_address: string }
        Returns: boolean
      }
      generate_candidate_slug: {
        Args: { candidate_id: string; candidate_name: string }
        Returns: string
      }
      generate_position_description_reference: {
        Args: { p_duty_station: string; p_nature_of_position: string }
        Returns: string
      }
      generate_requisition_slug: {
        Args: { req_id: string; title: string }
        Returns: string
      }
      get_all_reports: {
        Args: { p_manager_name: string }
        Returns: {
          depth: number
          division: string
          id: string
          job_title: string
          line_manager: string
          name: string
          unit: string
        }[]
      }
      get_chief_for_division: { Args: { p_division: string }; Returns: string }
      get_current_user_name: { Args: never; Returns: string }
      get_series_parts_with_status: {
        Args: { p_candidate_email: string; p_series_id: string }
        Returns: {
          assessment_id: string
          assessment_title: string
          assessment_type: Database["public"]["Enums"]["assessment_type"]
          is_unlocked: boolean
          part_id: string
          part_number: number
          part_title: string
          slot_id: string
          slot_status: Database["public"]["Enums"]["assessment_slot_status"]
          started_at: string
          submitted_at: string
          time_limit_hours: number
          time_limit_minutes: number
          unlock_after_previous: boolean
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_job_hiring_manager: {
        Args: { job_id: string; user_id: string }
        Returns: boolean
      }
      is_panelist_for_interview: {
        Args: { _interview_id: string; _user_id: string }
        Returns: boolean
      }
      is_review_committee_member: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      log_email_sent: {
        Args: {
          p_actor_id: string
          p_recipient: string
          p_subject: string
          p_template?: string
        }
        Returns: undefined
      }
      mark_curveball_shown: { Args: { p_token: string }; Returns: boolean }
      search_whed_universities: {
        Args: { max_results?: number; search_term: string }
        Returns: {
          alternative_names: string[]
          country: string
          id: string
          name: string
          similarity_score: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_assessment: { Args: { p_token: string }; Returns: boolean }
      submit_assessment: { Args: { p_token: string }; Returns: boolean }
      update_video_assignment_status: {
        Args: {
          assignment_token: string
          event_meta?: Json
          new_status: Database["public"]["Enums"]["video_assignment_status"]
        }
        Returns: boolean
      }
      validate_assessment_token: {
        Args: { p_token: string }
        Returns: {
          assessment_id: string
          candidate_email: string
          candidate_name: string
          curveball_trigger_type: Database["public"]["Enums"]["curveball_trigger_type"]
          curveball_trigger_value: number
          instructions: string
          scheduled_end: string
          scheduled_start: string
          slot_id: string
          started_at: string
          status: Database["public"]["Enums"]["assessment_slot_status"]
          time_limit_minutes: number
          title: string
        }[]
      }
      validate_panel_composition: { Args: { p_job_id: string }; Returns: Json }
      validate_series_token: {
        Args: { p_token: string }
        Returns: {
          candidate_email: string
          candidate_id: string
          candidate_name: string
          series_closes_at: string
          series_description: string
          series_id: string
          series_opens_at: string
          series_status: Database["public"]["Enums"]["assessment_status"]
          series_title: string
        }[]
      }
      validate_video_assignment_token: {
        Args: { assignment_token: string }
        Returns: {
          application_id: string
          assignment_id: string
          deadline_at: string
          question_set_id: string
          questions: Json
          retakes_used_by_question: Json
          status: Database["public"]["Enums"]["video_assignment_status"]
        }[]
      }
    }
    Enums: {
      application_status:
        | "Draft"
        | "Application"
        | "Screening"
        | "Longlist"
        | "Shortlist"
        | "Pre-Recorded Video"
        | "Panel Interview"
        | "Recommended"
        | "Offer"
        | "Roster"
        | "Rejected"
      assessment_slot_status:
        | "scheduled"
        | "in_progress"
        | "completed"
        | "expired"
        | "cancelled"
      assessment_status: "draft" | "active" | "archived"
      assessment_type: "inbox_simulation" | "research_exercise"
      curveball_trigger_type: "time" | "progress"
      email_urgency: "low" | "normal" | "high" | "urgent"
      input_type: "boolean" | "single" | "multi" | "text"
      killer_question_rule: "yes_required" | "no_required" | "custom"
      panel_member_role:
        | "Hiring Manager"
        | "Additional Panel Member"
        | "Subject Matter Expert"
        | "HR Rep"
        | "Observer"
      recommendation: "Yes" | "No" | "Reserve" | "Roster"
      user_role:
        | "Admin"
        | "HR Assistant"
        | "Hiring Manager"
        | "Panel Member"
        | "Candidate"
        | "Chief of HR"
        | "Director"
      video_assignment_status:
        | "NotStarted"
        | "LinkOpened"
        | "InProgress"
        | "Completed"
        | "Expired"
        | "Failed"
      video_event_type:
        | "InviteSent"
        | "LinkOpened"
        | "Started"
        | "AnswerUploaded"
        | "Completed"
        | "Expired"
        | "ReminderSent"
        | "Failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "Draft",
        "Application",
        "Screening",
        "Longlist",
        "Shortlist",
        "Pre-Recorded Video",
        "Panel Interview",
        "Recommended",
        "Offer",
        "Roster",
        "Rejected",
      ],
      assessment_slot_status: [
        "scheduled",
        "in_progress",
        "completed",
        "expired",
        "cancelled",
      ],
      assessment_status: ["draft", "active", "archived"],
      assessment_type: ["inbox_simulation", "research_exercise"],
      curveball_trigger_type: ["time", "progress"],
      email_urgency: ["low", "normal", "high", "urgent"],
      input_type: ["boolean", "single", "multi", "text"],
      killer_question_rule: ["yes_required", "no_required", "custom"],
      panel_member_role: [
        "Hiring Manager",
        "Additional Panel Member",
        "Subject Matter Expert",
        "HR Rep",
        "Observer",
      ],
      recommendation: ["Yes", "No", "Reserve", "Roster"],
      user_role: [
        "Admin",
        "HR Assistant",
        "Hiring Manager",
        "Panel Member",
        "Candidate",
        "Chief of HR",
        "Director",
      ],
      video_assignment_status: [
        "NotStarted",
        "LinkOpened",
        "InProgress",
        "Completed",
        "Expired",
        "Failed",
      ],
      video_event_type: [
        "InviteSent",
        "LinkOpened",
        "Started",
        "AnswerUploaded",
        "Completed",
        "Expired",
        "ReminderSent",
        "Failed",
      ],
    },
  },
} as const
