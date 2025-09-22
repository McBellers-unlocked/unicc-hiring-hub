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
      candidates: {
        Row: {
          availability_status: string | null
          certifications: Json | null
          created_at: string
          current_organization: string | null
          current_position: string | null
          education: Json | null
          email: string
          gender: string | null
          id: string
          languages: Json | null
          linkedin_url: string | null
          location: string | null
          name: string
          notice_period: string | null
          phone: string | null
          portfolio_attachments: Json | null
          preferred_locations: Json | null
          privacy_setting: string | null
          professional_summary: string | null
          profile_completion_percentage: number | null
          profile_photo_url: string | null
          salary_expectation_range: string | null
          security_clearance_level: string | null
          skills: Json | null
          un_experience: boolean | null
          un_organizations_worked: Json | null
          updated_at: string
          willing_to_relocate: boolean | null
          work_auth: string | null
          work_experience: Json | null
          years_of_experience: number | null
        }
        Insert: {
          availability_status?: string | null
          certifications?: Json | null
          created_at?: string
          current_organization?: string | null
          current_position?: string | null
          education?: Json | null
          email: string
          gender?: string | null
          id?: string
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          notice_period?: string | null
          phone?: string | null
          portfolio_attachments?: Json | null
          preferred_locations?: Json | null
          privacy_setting?: string | null
          professional_summary?: string | null
          profile_completion_percentage?: number | null
          profile_photo_url?: string | null
          salary_expectation_range?: string | null
          security_clearance_level?: string | null
          skills?: Json | null
          un_experience?: boolean | null
          un_organizations_worked?: Json | null
          updated_at?: string
          willing_to_relocate?: boolean | null
          work_auth?: string | null
          work_experience?: Json | null
          years_of_experience?: number | null
        }
        Update: {
          availability_status?: string | null
          certifications?: Json | null
          created_at?: string
          current_organization?: string | null
          current_position?: string | null
          education?: Json | null
          email?: string
          gender?: string | null
          id?: string
          languages?: Json | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          notice_period?: string | null
          phone?: string | null
          portfolio_attachments?: Json | null
          preferred_locations?: Json | null
          privacy_setting?: string | null
          professional_summary?: string | null
          profile_completion_percentage?: number | null
          profile_photo_url?: string | null
          salary_expectation_range?: string | null
          security_clearance_level?: string | null
          skills?: Json | null
          un_experience?: boolean | null
          un_organizations_worked?: Json | null
          updated_at?: string
          willing_to_relocate?: boolean | null
          work_auth?: string | null
          work_experience?: Json | null
          years_of_experience?: number | null
        }
        Relationships: []
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
      essential_criteria: {
        Row: {
          created_at: string
          id: string
          job_id: string
          label: string
          must_have: boolean | null
          params: Json | null
          validator: string | null
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          label: string
          must_have?: boolean | null
          params?: Json | null
          validator?: string | null
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          label?: string
          must_have?: boolean | null
          params?: Json | null
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
          created_at: string
          id: string
          name: string
          sections: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sections?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sections?: Json | null
          updated_at?: string
        }
        Relationships: []
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
        }
        Relationships: []
      }
      job_requisitions: {
        Row: {
          chief_of_division_approval: boolean | null
          chief_of_division_approved_at: string | null
          chief_of_division_approved_by: string | null
          chief_of_division_sent_at: string | null
          comments: Json | null
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
          essential_experience: string | null
          finance_controller_approval: boolean | null
          finance_controller_approved_at: string | null
          finance_controller_approved_by: string | null
          global_competencies: Json | null
          grade: string | null
          hiring_manager_confirmed_at: string | null
          hiring_manager_confirmed_hr_changes: boolean | null
          hiring_manager_sent_at: string | null
          hr_change_summary: string | null
          hr_changes: Json | null
          hr_comments: string | null
          hr_original_data: Json | null
          hr_reviewed: boolean | null
          hr_reviewed_at: string | null
          hr_reviewed_by: string | null
          hr_sent_at: string | null
          id: string
          language_requirements: Json | null
          leadership_competencies: Json | null
          main_duties_responsibilities: string | null
          management_competencies: Json | null
          nature_of_position: string | null
          objectives_of_programme: string | null
          pdf_url: string | null
          position_title: string | null
          positions_available: number | null
          purpose_of_position: string | null
          reference_number: string | null
          start_date: string | null
          status: string
          temporary_duration: string | null
          unit_section_division: string | null
          updated_at: string
        }
        Insert: {
          chief_of_division_approval?: boolean | null
          chief_of_division_approved_at?: string | null
          chief_of_division_approved_by?: string | null
          chief_of_division_sent_at?: string | null
          comments?: Json | null
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
          essential_experience?: string | null
          finance_controller_approval?: boolean | null
          finance_controller_approved_at?: string | null
          finance_controller_approved_by?: string | null
          global_competencies?: Json | null
          grade?: string | null
          hiring_manager_confirmed_at?: string | null
          hiring_manager_confirmed_hr_changes?: boolean | null
          hiring_manager_sent_at?: string | null
          hr_change_summary?: string | null
          hr_changes?: Json | null
          hr_comments?: string | null
          hr_original_data?: Json | null
          hr_reviewed?: boolean | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
          hr_sent_at?: string | null
          id?: string
          language_requirements?: Json | null
          leadership_competencies?: Json | null
          main_duties_responsibilities?: string | null
          management_competencies?: Json | null
          nature_of_position?: string | null
          objectives_of_programme?: string | null
          pdf_url?: string | null
          position_title?: string | null
          positions_available?: number | null
          purpose_of_position?: string | null
          reference_number?: string | null
          start_date?: string | null
          status?: string
          temporary_duration?: string | null
          unit_section_division?: string | null
          updated_at?: string
        }
        Update: {
          chief_of_division_approval?: boolean | null
          chief_of_division_approved_at?: string | null
          chief_of_division_approved_by?: string | null
          chief_of_division_sent_at?: string | null
          comments?: Json | null
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
          essential_experience?: string | null
          finance_controller_approval?: boolean | null
          finance_controller_approved_at?: string | null
          finance_controller_approved_by?: string | null
          global_competencies?: Json | null
          grade?: string | null
          hiring_manager_confirmed_at?: string | null
          hiring_manager_confirmed_hr_changes?: boolean | null
          hiring_manager_sent_at?: string | null
          hr_change_summary?: string | null
          hr_changes?: Json | null
          hr_comments?: string | null
          hr_original_data?: Json | null
          hr_reviewed?: boolean | null
          hr_reviewed_at?: string | null
          hr_reviewed_by?: string | null
          hr_sent_at?: string | null
          id?: string
          language_requirements?: Json | null
          leadership_competencies?: Json | null
          main_duties_responsibilities?: string | null
          management_competencies?: Json | null
          nature_of_position?: string | null
          objectives_of_programme?: string | null
          pdf_url?: string | null
          position_title?: string | null
          positions_available?: number | null
          purpose_of_position?: string | null
          reference_number?: string | null
          start_date?: string | null
          status?: string
          temporary_duration?: string | null
          unit_section_division?: string | null
          updated_at?: string
        }
        Relationships: []
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
          grade: string | null
          id: string
          issue_date: string | null
          language_requirements: string | null
          location: string | null
          notice_no: string | null
          org_unit: string | null
          positions: number | null
          privacy_notice_url: string | null
          requirements_md: string | null
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
          grade?: string | null
          id?: string
          issue_date?: string | null
          language_requirements?: string | null
          location?: string | null
          notice_no?: string | null
          org_unit?: string | null
          positions?: number | null
          privacy_notice_url?: string | null
          requirements_md?: string | null
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
          grade?: string | null
          id?: string
          issue_date?: string | null
          language_requirements?: string | null
          location?: string | null
          notice_no?: string | null
          org_unit?: string | null
          positions?: number | null
          privacy_notice_url?: string | null
          requirements_md?: string | null
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
      panel_interview_participants: {
        Row: {
          confirmed: boolean | null
          created_at: string
          id: string
          panel_interview_id: string
          panelist_id: string
          role: string | null
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          id?: string
          panel_interview_id: string
          panelist_id: string
          role?: string | null
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
          id?: string
          panel_interview_id?: string
          panelist_id?: string
          role?: string | null
        }
        Relationships: []
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
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
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
      users: {
        Row: {
          created_at: string
          department: string | null
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
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
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_position_description_reference: {
        Args: { p_duty_station: string; p_nature_of_position: string }
        Returns: string
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
      log_email_sent: {
        Args: {
          p_actor_id: string
          p_recipient: string
          p_subject: string
          p_template?: string
        }
        Returns: undefined
      }
      update_video_assignment_status: {
        Args: {
          assignment_token: string
          event_meta?: Json
          new_status: Database["public"]["Enums"]["video_assignment_status"]
        }
        Returns: boolean
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
        | "Application"
        | "Longlist"
        | "Shortlist"
        | "Pre-Recorded Video"
        | "Panel Interview"
        | "Offer"
        | "Roster"
        | "Rejected"
      input_type: "boolean" | "single" | "multi" | "text"
      killer_question_rule: "yes_required" | "no_required" | "custom"
      recommendation: "Yes" | "No" | "Reserve" | "Roster"
      user_role:
        | "Admin"
        | "HR Assistant"
        | "Hiring Manager"
        | "Panel Member"
        | "Candidate"
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
        "Application",
        "Longlist",
        "Shortlist",
        "Pre-Recorded Video",
        "Panel Interview",
        "Offer",
        "Roster",
        "Rejected",
      ],
      input_type: ["boolean", "single", "multi", "text"],
      killer_question_rule: ["yes_required", "no_required", "custom"],
      recommendation: ["Yes", "No", "Reserve", "Roster"],
      user_role: [
        "Admin",
        "HR Assistant",
        "Hiring Manager",
        "Panel Member",
        "Candidate",
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
