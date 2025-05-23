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
      zoom_credentials: {
        Row: {
          account_id: string
          client_id: string
          client_secret: string
          created_at: string
          id: string
          is_verified: boolean
          last_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          client_id: string
          client_secret: string
          created_at?: string
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          client_id?: string
          client_secret?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          last_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoom_sync_history: {
        Row: {
          created_at: string
          id: string
          items_synced: number
          message: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_synced?: number
          message?: string | null
          status: string
          sync_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items_synced?: number
          message?: string | null
          status?: string
          sync_type?: string
          user_id?: string
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_instance_participants_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinar_instances"
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
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "zoom_webinar_poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "zoom_webinar_polls"
            referencedColumns: ["poll_id"]
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
        }
        Relationships: []
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
        }
        Relationships: []
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
        }
        Relationships: []
      }
      zoom_webinars: {
        Row: {
          agenda: string | null
          created_at: string
          duration: number | null
          host_email: string | null
          id: string
          raw_data: Json
          start_time: string | null
          status: string | null
          timezone: string | null
          topic: string
          type: number | null
          updated_at: string
          user_id: string
          webinar_id: string
          webinar_uuid: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          duration?: number | null
          host_email?: string | null
          id?: string
          raw_data: Json
          start_time?: string | null
          status?: string | null
          timezone?: string | null
          topic: string
          type?: number | null
          updated_at?: string
          user_id: string
          webinar_id: string
          webinar_uuid: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          duration?: number | null
          host_email?: string | null
          id?: string
          raw_data?: Json
          start_time?: string | null
          status?: string | null
          timezone?: string | null
          topic?: string
          type?: number | null
          updated_at?: string
          user_id?: string
          webinar_id?: string
          webinar_uuid?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          check_user_id: string
          check_role: Database["public"]["Enums"]["user_role"]
        }
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
