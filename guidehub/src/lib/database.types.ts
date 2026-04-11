export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          username: string
          avatar_url: string | null
          bio: string | null
          social_links: Record<string, string>
          is_self_employed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          username: string
          avatar_url?: string | null
          bio?: string | null
          social_links?: Record<string, string>
          is_self_employed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          username?: string
          avatar_url?: string | null
          bio?: string | null
          social_links?: Record<string, string>
          is_self_employed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      guides: {
        Row: {
          id: string
          author_id: string
          title: string
          description: string
          slug: string
          cover_image: string | null
          accent_color: string
          template: string
          price: number
          show_preview: boolean
          preview_sections: string[]
          is_course: boolean
          status: string
          views: number
          sales: number
          revenue: number
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          description: string
          slug: string
          cover_image?: string | null
          accent_color?: string
          template?: string
          price?: number
          show_preview?: boolean
          preview_sections?: string[]
          is_course?: boolean
          status?: string
          views?: number
          sales?: number
          revenue?: number
          created_at?: string
          updated_at?: string
          published_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['guides']['Insert']>
      }
      guide_sections: {
        Row: {
          id: string
          guide_id: string
          title: string
          content: Record<string, unknown>
          order: number
          hidden_until_payment: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guide_id: string
          title: string
          content: Record<string, unknown>
          order: number
          hidden_until_payment?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['guide_sections']['Insert']>
      }
      orders: {
        Row: {
          id: string
          guide_id: string
          buyer_email: string
          buyer_name: string | null
          amount: number
          currency: string
          status: string
          payment_method: string
          payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guide_id: string
          buyer_email: string
          buyer_name?: string | null
          amount: number
          currency?: string
          status?: string
          payment_method: string
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      analytics_events: {
        Row: {
          id: string
          guide_id: string
          event_type: string
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          guide_id: string
          event_type: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['analytics_events']['Insert']>
      }
    }
  }
}
