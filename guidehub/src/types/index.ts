export interface User {
  id: string
  email: string
  name: string
  username: string
  avatar_url?: string | null
  bio?: string
  social_links: Record<string, string>
  is_self_employed: boolean
  created_at: string
  updated_at: string
}

export interface Guide {
  id: string
  author_id: string
  title: string
  description: string
  slug: string
  cover_image?: string | null
  accent_color: string
  template: string
  price: number
  show_preview: boolean
  preview_sections: string[]
  is_course: boolean
  status: 'draft' | 'published' | 'archived'
  views: number
  sales: number
  revenue: number
  created_at: string
  updated_at: string
  published_at?: string
}

export interface GuideSection {
  id: string
  guide_id: string
  title: string
  content: unknown
  order: number
  hidden_until_payment: boolean
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  guide_id: string
  buyer_email: string
  buyer_name?: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'refunded' | 'failed'
  payment_method: string
  payment_id?: string
  created_at: string
  updated_at: string
}

export interface AnalyticsEvent {
  id: string
  guide_id: string
  event_type: 'view' | 'preview' | 'checkout_start' | 'purchase'
  metadata: Record<string, unknown>
  created_at: string
}

export interface CreateGuidePayload {
  title: string
  description: string
  price: number
  cover_image?: string
  accent_color: string
  template: string
  show_preview: boolean
  preview_sections: string[]
  is_course: boolean
  sections?: Array<{ title: string; content: unknown; hidden_until_payment: boolean }>
}
