export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      zoom_credentials: {
        Row: {
          access_token: string | null
          account_id: string
          client_id: string
          client_secret: string
          created_at: string
          id: string
          is_verified: boolean
          last_verified_at: string | null
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_token?: string | null
          account_id: string
          client_id: string
          client_secret: string
          created_at?: string
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_credentials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_sync_history: {
        Row: {
          created_at: string
          id: string
          items_synced: number
          message: string | null
          pages_processed: number | null
          status: string
          sync_details: Json | null
          sync_type: string
          total_expected: number | null
          total_retrieved: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          items_synced?: number
          message?: string | null
          pages_processed?: number | null
          status: string
          sync_details?: Json | null
          sync_type: string
          total_expected?: number | null
          total_retrieved?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          items_synced?: number
          message?: string | null
          pages_processed?: number | null
          status?: string
          sync_details?: Json | null
          sync_type?: string
          total_expected?: number | null
          total_retrieved?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_sync_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_chat: {
        Row: {
          created_at: string
          id: string
          instance_id: string | null
          message: string
          message_time: string | null
          raw_data: Json
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string | null
          sender_email: string | null
          sender_id: string | null
          sender_name: string | null
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id?: string | null
          message: string
          message_time?: string | null
          raw_data: Json
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string | null
          message?: string
          message_time?: string | null
          raw_data?: Json
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_chat_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_engagement: {
        Row: {
          attention_score: number | null
          attentiveness: number | null
          chat_messages_sent: number | null
          created_at: string
          email: string | null
          engagement_duration: number | null
          id: string
          instance_id: string | null
          join_time: string | null
          leave_time: string | null
          name: string | null
          participant_id: string | null
          polls_answered: number | null
          questions_asked: number | null
          raw_data: Json
          time_engaged: number | null
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          attention_score?: number | null
          attentiveness?: number | null
          chat_messages_sent?: number | null
          created_at?: string
          email?: string | null
          engagement_duration?: number | null
          id?: string
          instance_id?: string | null
          join_time?: string | null
          leave_time?: string | null
          name?: string | null
          participant_id?: string | null
          polls_answered?: number | null
          questions_asked?: number | null
          raw_data: Json
          time_engaged?: number | null
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          attention_score?: number | null
          attentiveness?: number | null
          chat_messages_sent?: number | null
          created_at?: string
          email?: string | null
          engagement_duration?: number | null
          id?: string
          instance_id?: string | null
          join_time?: string | null
          leave_time?: string | null
          name?: string | null
          participant_id?: string | null
          polls_answered?: number | null
          questions_asked?: number | null
          raw_data?: Json
          time_engaged?: number | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_engagement_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_instance_participants: {
        Row: {
          created_at: string
          duration: number | null
          email: string | null
          id: string
          instance_id: string
          join_time: string | null
          leave_time: string | null
          name: string | null
          participant_id: string | null
          participant_type: string
          raw_data: Json
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          email?: string | null
          id?: string
          instance_id: string
          join_time?: string | null
          leave_time?: string | null
          name?: string | null
          participant_id?: string | null
          participant_type: string
          raw_data: Json
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          email?: string | null
          id?: string
          instance_id?: string
          join_time?: string | null
          leave_time?: string | null
          name?: string | null
          participant_id?: string | null
          participant_type?: string
          raw_data?: Json
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_instance_participants_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinar_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoom_webinar_instance_participants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_instances: {
        Row: {
          created_at: string
          duration: number | null
          end_time: string | null
          id: string
          instance_id: string
          participants_count: number | null
          raw_data: Json
          registrants_count: number | null
          start_time: string | null
          status: string | null
          topic: string
          updated_at: string
          user_id: string
          webinar_id: string
          webinar_uuid: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          instance_id: string
          participants_count?: number | null
          raw_data: Json
          registrants_count?: number | null
          start_time?: string | null
          status?: string | null
          topic: string
          updated_at?: string
          user_id: string
          webinar_id: string
          webinar_uuid: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          end_time?: string | null
          id?: string
          instance_id?: string
          participants_count?: number | null
          raw_data?: Json
          registrants_count?: number | null
          start_time?: string | null
          status?: string | null
          topic?: string
          updated_at?: string
          user_id?: string
          webinar_id?: string
          webinar_uuid?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_occurrences: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          occurrence_id: string
          raw_data: Json
          start_time: string | null
          status: string | null
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          occurrence_id: string
          raw_data?: Json
          start_time?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          occurrence_id?: string
          raw_data?: Json
          start_time?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      zoom_webinar_participants: {
        Row: {
          created_at: string
          duration: number | null
          email: string | null
          id: string
          join_time: string | null
          leave_time: string | null
          name: string | null
          participant_id: string | null
          participant_type: string
          raw_data: Json
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          email?: string | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          name?: string | null
          participant_id?: string | null
          participant_type: string
          raw_data: Json
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          email?: string | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          name?: string | null
          participant_id?: string | null
          participant_type?: string
          raw_data?: Json
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_participants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_poll_responses: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          poll_id: string
          raw_data: Json
          response_time: string | null
          responses: Json
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          poll_id: string
          raw_data: Json
          response_time?: string | null
          responses: Json
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          poll_id?: string
          raw_data?: Json
          response_time?: string | null
          responses?: Json
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinar_polls"
            referencedColumns: ["poll_id"]
          },
          {
            foreignKeyName: "zoom_webinar_poll_responses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_polls: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          instance_id: string | null
          poll_id: string
          questions: Json | null
          raw_data: Json
          start_time: string | null
          status: string | null
          title: string
          total_participants: number | null
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          instance_id?: string | null
          poll_id: string
          questions?: Json | null
          raw_data: Json
          start_time?: string | null
          status?: string | null
          title: string
          total_participants?: number | null
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          instance_id?: string | null
          poll_id?: string
          questions?: Json | null
          raw_data?: Json
          start_time?: string | null
          status?: string | null
          title?: string
          total_participants?: number | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_polls_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_questions: {
        Row: {
          answer: string | null
          answer_time: string | null
          answered: boolean | null
          answered_by: string | null
          created_at: string
          email: string | null
          id: string
          instance_id: string | null
          name: string | null
          question: string
          question_id: string
          question_time: string | null
          raw_data: Json
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          answer?: string | null
          answer_time?: string | null
          answered?: boolean | null
          answered_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instance_id?: string | null
          name?: string | null
          question: string
          question_id: string
          question_time?: string | null
          raw_data: Json
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          answer?: string | null
          answer_time?: string | null
          answered?: boolean | null
          answered_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          instance_id?: string | null
          name?: string | null
          question?: string
          question_id?: string
          question_time?: string | null
          raw_data?: Json
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_questions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_recordings: {
        Row: {
          created_at: string
          download_url: string | null
          duration: number | null
          file_size: number | null
          file_type: string | null
          id: string
          instance_id: string | null
          password: string | null
          play_url: string | null
          raw_data: Json
          recording_end: string | null
          recording_id: string
          recording_start: string | null
          recording_type: string
          status: string | null
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          download_url?: string | null
          duration?: number | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          instance_id?: string | null
          password?: string | null
          play_url?: string | null
          raw_data: Json
          recording_end?: string | null
          recording_id: string
          recording_start?: string | null
          recording_type: string
          status?: string | null
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          download_url?: string | null
          duration?: number | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          instance_id?: string | null
          password?: string | null
          play_url?: string | null
          raw_data?: Json
          recording_end?: string | null
          recording_id?: string
          recording_start?: string | null
          recording_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_recordings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_webinar_recurrence: {
        Row: {
          created_at: string
          end_date_time: string | null
          end_times: number | null
          id: string
          monthly_day: number | null
          monthly_week: number | null
          monthly_week_day: number | null
          raw_data: Json
          recurrence_type: number | null
          repeat_interval: number | null
          updated_at: string
          user_id: string
          webinar_id: string
          weekly_days: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          end_date_time?: string | null
          end_times?: number | null
          id?: string
          monthly_day?: number | null
          monthly_week?: number | null
          monthly_week_day?: number | null
          raw_data?: Json
          recurrence_type?: number | null
          repeat_interval?: number | null
          updated_at?: string
          user_id: string
          webinar_id: string
          weekly_days?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          end_date_time?: string | null
          end_times?: number | null
          id?: string
          monthly_day?: number | null
          monthly_week?: number | null
          monthly_week_day?: number | null
          raw_data?: Json
          recurrence_type?: number | null
          repeat_interval?: number | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          weekly_days?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      zoom_webinar_tracking_fields: {
        Row: {
          created_at: string
          field_name: string
          field_value: string | null
          id: string
          is_required: boolean | null
          is_visible: boolean | null
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          field_value?: string | null
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          field_value?: string | null
          id?: string
          is_required?: boolean | null
          is_visible?: boolean | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      zoom_webinars: {
        Row: {
          agenda: string | null
          approval_type: number | null
          audio_type: string | null
          auto_recording_type: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          duration: number | null
          enforce_login: boolean | null
          hd_video: boolean | null
          host_email: string | null
          host_id: string | null
          host_video: boolean | null
          id: string
          is_simulive: boolean | null
          join_url: string | null
          language: string | null
          last_synced_at: string | null
          on_demand: boolean | null
          panelists_video: boolean | null
          password: string | null
          practice_session: boolean | null
          raw_data: Json
          registration_type: number | null
          registration_url: string | null
          start_time: string | null
          start_url: string | null
          status: string | null
          timezone: string | null
          topic: string
          type: number | null
          updated_at: string
          user_id: string
          webinar_created_at: string | null
          webinar_id: string
          webinar_uuid: string
          workspace_id: string | null
        }
        Insert: {
          agenda?: string | null
          approval_type?: number | null
          audio_type?: string | null
          auto_recording_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          duration?: number | null
          enforce_login?: boolean | null
          hd_video?: boolean | null
          host_email?: string | null
          host_id?: string | null
          host_video?: boolean | null
          id?: string
          is_simulive?: boolean | null
          join_url?: string | null
          language?: string | null
          last_synced_at?: string | null
          on_demand?: boolean | null
          panelists_video?: boolean | null
          password?: string | null
          practice_session?: boolean | null
          raw_data: Json
          registration_type?: number | null
          registration_url?: string | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          timezone?: string | null
          topic: string
          type?: number | null
          updated_at?: string
          user_id: string
          webinar_created_at?: string | null
          webinar_id: string
          webinar_uuid: string
          workspace_id?: string | null
        }
        Update: {
          agenda?: string | null
          approval_type?: number | null
          audio_type?: string | null
          auto_recording_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          duration?: number | null
          enforce_login?: boolean | null
          hd_video?: boolean | null
          host_email?: string | null
          host_id?: string | null
          host_video?: boolean | null
          id?: string
          is_simulive?: boolean | null
          join_url?: string | null
          language?: string | null
          last_synced_at?: string | null
          on_demand?: boolean | null
          panelists_video?: boolean | null
          password?: string | null
          practice_session?: boolean | null
          raw_data?: Json
          registration_type?: number | null
          registration_url?: string | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          timezone?: string | null
          topic?: string
          type?: number | null
          updated_at?: string
          user_id?: string
          webinar_created_at?: string | null
          webinar_id?: string
          webinar_uuid?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinars_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_column_exists_in_table: {
        Args: { p_table_name: string; p_column_name: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          check_user_id: string
          check_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { workspace_id: string; check_role?: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "host" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "host", "viewer"],
    },
  },
} as const
