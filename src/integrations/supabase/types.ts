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
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: Json | null
          id: string
          job_type: string
          metadata: Json | null
          processed_items: number | null
          progress: number
          results: Json | null
          started_at: string | null
          status: string
          total_items: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          job_type?: string
          metadata?: Json | null
          processed_items?: number | null
          progress?: number
          results?: Json | null
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          job_type?: string
          metadata?: Json | null
          processed_items?: number | null
          progress?: number
          results?: Json | null
          started_at?: string | null
          status?: string
          total_items?: number | null
          updated_at?: string
          user_id?: string
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
      zoom_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string | null
          message: string
          raw_data: Json | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          updated_at: string | null
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          message: string
          raw_data?: Json | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          updated_at?: string | null
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string | null
          message?: string
          raw_data?: Json | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          updated_at?: string | null
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
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
      zoom_panelists: {
        Row: {
          created_at: string | null
          id: string
          join_url: string | null
          name: string | null
          panelist_email: string | null
          panelist_id: string | null
          raw_data: Json | null
          updated_at: string | null
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          join_url?: string | null
          name?: string | null
          panelist_email?: string | null
          panelist_id?: string | null
          raw_data?: Json | null
          updated_at?: string | null
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          join_url?: string | null
          name?: string | null
          panelist_email?: string | null
          panelist_id?: string | null
          raw_data?: Json | null
          updated_at?: string | null
          user_id?: string
          webinar_id?: string
          workspace_id?: string | null
        }
        Relationships: []
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
          actual_duration: number | null
          actual_start_time: string | null
          created_at: string
          data_source: string | null
          duration: number | null
          end_time: string | null
          id: string
          instance_id: string
          is_historical: boolean | null
          participants_count: number | null
          raw_data: Json
          registrants_count: number | null
          start_time: string | null
          status: string | null
          topic: string | null
          updated_at: string
          user_id: string
          webinar_id: string
          webinar_uuid: string
          workspace_id: string | null
        }
        Insert: {
          actual_duration?: number | null
          actual_start_time?: string | null
          created_at?: string
          data_source?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          instance_id: string
          is_historical?: boolean | null
          participants_count?: number | null
          raw_data: Json
          registrants_count?: number | null
          start_time?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
          webinar_id: string
          webinar_uuid: string
          workspace_id?: string | null
        }
        Update: {
          actual_duration?: number | null
          actual_start_time?: string | null
          created_at?: string
          data_source?: string | null
          duration?: number | null
          end_time?: string | null
          id?: string
          instance_id?: string
          is_historical?: boolean | null
          participants_count?: number | null
          raw_data?: Json
          registrants_count?: number | null
          start_time?: string | null
          status?: string | null
          topic?: string | null
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
          connection_type: string | null
          created_at: string
          data_center: string | null
          domain: string | null
          duration: number | null
          email: string | null
          harddisk_id: string | null
          id: string
          join_time: string | null
          leave_time: string | null
          mac_addr: string | null
          name: string | null
          participant_id: string | null
          participant_type: string
          pc_name: string | null
          raw_data: Json
          recording_consent: boolean | null
          updated_at: string
          user_id: string
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          connection_type?: string | null
          created_at?: string
          data_center?: string | null
          domain?: string | null
          duration?: number | null
          email?: string | null
          harddisk_id?: string | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          mac_addr?: string | null
          name?: string | null
          participant_id?: string | null
          participant_type: string
          pc_name?: string | null
          raw_data: Json
          recording_consent?: boolean | null
          updated_at?: string
          user_id: string
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          connection_type?: string | null
          created_at?: string
          data_center?: string | null
          domain?: string | null
          duration?: number | null
          email?: string | null
          harddisk_id?: string | null
          id?: string
          join_time?: string | null
          leave_time?: string | null
          mac_addr?: string | null
          name?: string | null
          participant_id?: string | null
          participant_type?: string
          pc_name?: string | null
          raw_data?: Json
          recording_consent?: boolean | null
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
      zoom_webinar_registrants: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: number
          industry: string | null
          job_title: string | null
          join_url: string | null
          language: string | null
          last_name: string | null
          no_of_employees: string | null
          org: string | null
          purchasing_time_frame: string | null
          raw_data: Json | null
          registrant_id: string | null
          registration_time: string | null
          role_in_purchase_process: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          webinar_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: number
          industry?: string | null
          job_title?: string | null
          join_url?: string | null
          language?: string | null
          last_name?: string | null
          no_of_employees?: string | null
          org?: string | null
          purchasing_time_frame?: string | null
          raw_data?: Json | null
          registrant_id?: string | null
          registration_time?: string | null
          role_in_purchase_process?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          webinar_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: number
          industry?: string | null
          job_title?: string | null
          join_url?: string | null
          language?: string | null
          last_name?: string | null
          no_of_employees?: string | null
          org?: string | null
          purchasing_time_frame?: string | null
          raw_data?: Json | null
          registrant_id?: string | null
          registration_time?: string | null
          role_in_purchase_process?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          webinar_id?: string
        }
        Relationships: []
      }
      zoom_webinar_registration_questions: {
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
      zoom_webinar_settings: {
        Row: {
          breakout_room: Json | null
          created_at: string | null
          language_interpretation: Json | null
          question_and_answer: Json | null
          raw_settings: Json | null
          sign_language_interpretation: Json | null
          updated_at: string | null
          user_id: string
          webinar_id: string
        }
        Insert: {
          breakout_room?: Json | null
          created_at?: string | null
          language_interpretation?: Json | null
          question_and_answer?: Json | null
          raw_settings?: Json | null
          sign_language_interpretation?: Json | null
          updated_at?: string | null
          user_id: string
          webinar_id: string
        }
        Update: {
          breakout_room?: Json | null
          created_at?: string | null
          language_interpretation?: Json | null
          question_and_answer?: Json | null
          raw_settings?: Json | null
          sign_language_interpretation?: Json | null
          updated_at?: string | null
          user_id?: string
          webinar_id?: string
        }
        Relationships: []
      }
      zoom_webinar_tracking: {
        Row: {
          created_at: string | null
          id: string
          raw_data: Json | null
          registration_count: number | null
          source_name: string | null
          tracking_url: string | null
          updated_at: string | null
          user_id: string
          visitor_count: number | null
          webinar_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          registration_count?: number | null
          source_name?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id: string
          visitor_count?: number | null
          webinar_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          raw_data?: Json | null
          registration_count?: number | null
          source_name?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id?: string
          visitor_count?: number | null
          webinar_id?: string
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
          actual_duration: number | null
          actual_end_time: string | null
          actual_start_time: string | null
          agenda: string | null
          approval_type: number | null
          audio_type: string | null
          auto_recording_type: string | null
          breakout_rooms_enabled: boolean | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          data_source: string | null
          duration: number | null
          encrypted_password: string | null
          end_time: string | null
          enforce_login: boolean | null
          h323_password: string | null
          hd_video: boolean | null
          host_email: string | null
          host_first_name: string | null
          host_id: string | null
          host_last_name: string | null
          host_name: string | null
          host_video: boolean | null
          id: string
          is_historical: boolean | null
          is_recurring: boolean | null
          is_simulive: boolean | null
          join_url: string | null
          language: string | null
          language_interpretation_enabled: boolean | null
          last_synced_at: string | null
          max_concurrent_views: number | null
          meeting_authentication: boolean | null
          occurrences: Json | null
          on_demand: boolean | null
          panelists_video: boolean | null
          participants_count: number | null
          password: string | null
          polls_enabled: boolean | null
          practice_session: boolean | null
          pstn_password: string | null
          qa_enabled: boolean | null
          raw_data: Json
          recording_authentication: boolean | null
          recording_authenticator: string | null
          recurrence: Json | null
          recurrence_type: number | null
          registrants_count: number | null
          registration_type: number | null
          registration_url: string | null
          settings: Json | null
          sign_language_enabled: boolean | null
          start_time: string | null
          start_url: string | null
          status: string | null
          survey_enabled: boolean | null
          template_id: string | null
          timezone: string | null
          topic: string
          tracking_fields: Json | null
          type: number | null
          updated_at: string
          user_id: string
          webinar_authenticator: string | null
          webinar_created_at: string | null
          webinar_id: string
          webinar_uuid: string
          workspace_id: string | null
        }
        Insert: {
          actual_duration?: number | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          agenda?: string | null
          approval_type?: number | null
          audio_type?: string | null
          auto_recording_type?: string | null
          breakout_rooms_enabled?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          data_source?: string | null
          duration?: number | null
          encrypted_password?: string | null
          end_time?: string | null
          enforce_login?: boolean | null
          h323_password?: string | null
          hd_video?: boolean | null
          host_email?: string | null
          host_first_name?: string | null
          host_id?: string | null
          host_last_name?: string | null
          host_name?: string | null
          host_video?: boolean | null
          id?: string
          is_historical?: boolean | null
          is_recurring?: boolean | null
          is_simulive?: boolean | null
          join_url?: string | null
          language?: string | null
          language_interpretation_enabled?: boolean | null
          last_synced_at?: string | null
          max_concurrent_views?: number | null
          meeting_authentication?: boolean | null
          occurrences?: Json | null
          on_demand?: boolean | null
          panelists_video?: boolean | null
          participants_count?: number | null
          password?: string | null
          polls_enabled?: boolean | null
          practice_session?: boolean | null
          pstn_password?: string | null
          qa_enabled?: boolean | null
          raw_data: Json
          recording_authentication?: boolean | null
          recording_authenticator?: string | null
          recurrence?: Json | null
          recurrence_type?: number | null
          registrants_count?: number | null
          registration_type?: number | null
          registration_url?: string | null
          settings?: Json | null
          sign_language_enabled?: boolean | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          survey_enabled?: boolean | null
          template_id?: string | null
          timezone?: string | null
          topic: string
          tracking_fields?: Json | null
          type?: number | null
          updated_at?: string
          user_id: string
          webinar_authenticator?: string | null
          webinar_created_at?: string | null
          webinar_id: string
          webinar_uuid: string
          workspace_id?: string | null
        }
        Update: {
          actual_duration?: number | null
          actual_end_time?: string | null
          actual_start_time?: string | null
          agenda?: string | null
          approval_type?: number | null
          audio_type?: string | null
          auto_recording_type?: string | null
          breakout_rooms_enabled?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          data_source?: string | null
          duration?: number | null
          encrypted_password?: string | null
          end_time?: string | null
          enforce_login?: boolean | null
          h323_password?: string | null
          hd_video?: boolean | null
          host_email?: string | null
          host_first_name?: string | null
          host_id?: string | null
          host_last_name?: string | null
          host_name?: string | null
          host_video?: boolean | null
          id?: string
          is_historical?: boolean | null
          is_recurring?: boolean | null
          is_simulive?: boolean | null
          join_url?: string | null
          language?: string | null
          language_interpretation_enabled?: boolean | null
          last_synced_at?: string | null
          max_concurrent_views?: number | null
          meeting_authentication?: boolean | null
          occurrences?: Json | null
          on_demand?: boolean | null
          panelists_video?: boolean | null
          participants_count?: number | null
          password?: string | null
          polls_enabled?: boolean | null
          practice_session?: boolean | null
          pstn_password?: string | null
          qa_enabled?: boolean | null
          raw_data?: Json
          recording_authentication?: boolean | null
          recording_authenticator?: string | null
          recurrence?: Json | null
          recurrence_type?: number | null
          registrants_count?: number | null
          registration_type?: number | null
          registration_url?: string | null
          settings?: Json | null
          sign_language_enabled?: boolean | null
          start_time?: string | null
          start_url?: string | null
          status?: string | null
          survey_enabled?: boolean | null
          template_id?: string | null
          timezone?: string | null
          topic?: string
          tracking_fields?: Json | null
          type?: number | null
          updated_at?: string
          user_id?: string
          webinar_authenticator?: string | null
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
      get_zoom_api_settings: {
        Args: { org_id: string }
        Returns: {
          id: string
          account_id: string
          client_id: string
          client_secret: string
          redirect_uri: string
        }[]
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
      mark_webinar_changes: {
        Args: { webinar_id: string; changed_fields_json: Json }
        Returns: undefined
      }
      upsert_zoom_api_settings: {
        Args: {
          p_account_id: string
          p_client_id: string
          p_client_secret: string
          p_organization_id: string
        }
        Returns: string
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
