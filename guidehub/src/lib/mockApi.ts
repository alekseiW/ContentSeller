// GuideHub Mock Data & Storage Layer
// Works without Supabase — uses localStorage for demo/prototype

import type { Guide, GuideSection, User, Order, AnalyticsEvent } from '@/types'

// ─── Mock Helpers ────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  user: 'mock-user',
  guides: 'mock-guides',
  sections: 'mock-sections',
  orders: 'mock-orders',
  analytics: 'mock-analytics',
}

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function genId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function now(): string {
  return new Date().toISOString()
}

// ─── Seed Demo Data ──────────────────────────────────────────────────────────

function seedIfEmpty() {
  const guides = get<Guide[]>(STORAGE_KEYS.guides)
  if (guides && guides.length > 0) return

  const demoGuides: Guide[] = [
    {
      id: 'demo-istanbul',
      author_id: 'demo-user',
      title: 'Istanbul in 3 Days',
      description: 'Complete travel guide with food spots, routes, and budget tips',
      slug: 'istanbul-3-days',
      cover_image: null,
      accent_color: '#6366f1',
      template: 'travel',
      price: 490,
      show_preview: true,
      preview_sections: ['intro'],
      is_course: false,
      status: 'published',
      views: 142,
      sales: 12,
      revenue: 5880,
      created_at: '2026-03-20T10:00:00Z',
      updated_at: '2026-04-01T15:30:00Z',
      published_at: '2026-03-25T09:00:00Z',
    },
    {
      id: 'demo-telegram',
      author_id: 'demo-user',
      title: 'Telegram Bot for Business',
      description: 'How to build an automated sales funnel in Telegram',
      slug: 'telegram-bot-business',
      cover_image: null,
      accent_color: '#3b82f6',
      template: 'tech',
      price: 990,
      show_preview: true,
      preview_sections: ['intro'],
      is_course: true,
      status: 'published',
      views: 89,
      sales: 6,
      revenue: 5940,
      created_at: '2026-03-10T08:00:00Z',
      updated_at: '2026-03-28T12:00:00Z',
      published_at: '2026-03-15T10:00:00Z',
    },
    {
      id: 'demo-draft',
      author_id: 'demo-user',
      title: 'Photography Basics',
      description: '',
      slug: 'photography-basics',
      cover_image: null,
      accent_color: '#10b981',
      template: 'minimal',
      price: 390,
      show_preview: false,
      preview_sections: [],
      is_course: false,
      status: 'draft',
      views: 0,
      sales: 0,
      revenue: 0,
      created_at: '2026-04-05T14:00:00Z',
      updated_at: '2026-04-05T14:00:00Z',
    },
  ]

  const demoSections: GuideSection[] = [
    {
      id: 'sec-1',
      guide_id: 'demo-istanbul',
      title: 'Introduction',
      content: { type: 'paragraph', text: 'Istanbul is a city that bridges two continents, both literally and culturally. This guide covers everything you need for a perfect 3-day trip.' },
      order: 0,
      hidden_until_payment: false,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 'sec-2',
      guide_id: 'demo-istanbul',
      title: 'Day 1: Sultanahmet',
      content: { type: 'paragraph', text: 'Start your morning at the Blue Mosque, then walk to Hagia Sophia. Lunch at Sultanahmet Koftecisi.' },
      order: 1,
      hidden_until_payment: false,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 'sec-3',
      guide_id: 'demo-istanbul',
      title: 'Budget Breakdown',
      content: { type: 'paragraph', text: 'Expected daily budget: 3000-5000 RUB including food, transport, and entry fees.' },
      order: 2,
      hidden_until_payment: true,
      created_at: now(),
      updated_at: now(),
    },
  ]

  set(STORAGE_KEYS.guides, demoGuides)
  set(STORAGE_KEYS.sections, demoSections)
}

// Seed on first import
seedIfEmpty()

// ─── Mock API ────────────────────────────────────────────────────────────────

export const mockApi = {
  // Auth
  auth: {
    login: async (email: string, _password: string) => {
      const user: User = {
        id: 'demo-user',
        email,
        name: email.split('@')[0],
        username: email.split('@')[0].toLowerCase(),
        avatar_url: null,
        bio: 'Content creator',
        social_links: {},
        is_self_employed: true,
        created_at: now(),
        updated_at: now(),
      }
      set(STORAGE_KEYS.user, user)
      return user
    },
    register: async (email: string, _password: string, name: string, username: string, isSelfEmployed: boolean) => {
      const user: User = {
        id: 'demo-user',
        email,
        name,
        username,
        avatar_url: null,
        bio: '',
        social_links: {},
        is_self_employed: isSelfEmployed,
        created_at: now(),
        updated_at: now(),
      }
      set(STORAGE_KEYS.user, user)
      return user
    },
    getUser: (): User | null => get(STORAGE_KEYS.user),
    logout: () => {
      localStorage.removeItem(STORAGE_KEYS.user)
      localStorage.removeItem('sb-token')
    },
  },

  // Guides
  guides: {
    list: async (): Promise<Guide[]> => {
      const guides = get<Guide[]>(STORAGE_KEYS.guides) || []
      return guides.filter(g => g.author_id === 'demo-user')
    },
    getById: async (id: string): Promise<Guide | null> => {
      const guides = get<Guide[]>(STORAGE_KEYS.guides) || []
      return guides.find(g => g.id === id) || null
    },
    create: async (data: Partial<Guide>): Promise<Guide> => {
      const guides = get<Guide[]>(STORAGE_KEYS.guides) || []
      const guide: Guide = {
        id: genId(),
        author_id: 'demo-user',
        title: data.title || 'Untitled',
        description: data.description || '',
        slug: data.slug || genId(),
        cover_image: data.cover_image || null,
        accent_color: data.accent_color || '#6366f1',
        template: data.template || 'minimal',
        price: data.price || 0,
        show_preview: data.show_preview ?? true,
        preview_sections: data.preview_sections || [],
        is_course: data.is_course ?? false,
        status: data.status || 'draft',
        views: 0,
        sales: 0,
        revenue: 0,
        created_at: now(),
        updated_at: now(),
        published_at: data.status === 'published' ? now() : undefined,
      }
      guides.unshift(guide)
      set(STORAGE_KEYS.guides, guides)
      return guide
    },
    update: async (id: string, updates: Partial<Guide>): Promise<Guide | null> => {
      const guides = get<Guide[]>(STORAGE_KEYS.guides) || []
      const idx = guides.findIndex(g => g.id === id)
      if (idx === -1) return null
      guides[idx] = { ...guides[idx], ...updates, updated_at: now() }
      set(STORAGE_KEYS.guides, guides)
      return guides[idx]
    },
    delete: async (id: string): Promise<boolean> => {
      const guides = get<Guide[]>(STORAGE_KEYS.guides) || []
      const filtered = guides.filter(g => g.id !== id)
      if (filtered.length === guides.length) return false
      set(STORAGE_KEYS.guides, filtered)
      // Also delete sections
      const sections = get<GuideSection[]>(STORAGE_KEYS.sections) || []
      set(STORAGE_KEYS.sections, sections.filter(s => s.guide_id !== id))
      return true
    },
    publish: async (id: string): Promise<Guide | null> => {
      return mockApi.guides.update(id, { status: 'published', published_at: now() })
    },
    getPublic: async (_username: string, slug: string): Promise<{ guide: Guide | null; sections: GuideSection[] }> => {
      const guides = get<Guide[]>(STORAGE_KEYS.guides) || []
      const guide = guides.find(g => g.slug === slug && g.status === 'published') || null
      if (!guide) return { guide: null, sections: [] }
      const sections = get<GuideSection[]>(STORAGE_KEYS.sections) || []
      return { guide, sections: sections.filter(s => s.guide_id === guide!.id).sort((a, b) => a.order - b.order) }
    },
  },

  // Sections
  sections: {
    list: async (guideId: string): Promise<GuideSection[]> => {
      const sections = get<GuideSection[]>(STORAGE_KEYS.sections) || []
      return sections.filter(s => s.guide_id === guideId).sort((a, b) => a.order - b.order)
    },
    create: async (data: Omit<GuideSection, 'id' | 'created_at' | 'updated_at'>): Promise<GuideSection> => {
      const sections = get<GuideSection[]>(STORAGE_KEYS.sections) || []
      const section: GuideSection = {
        id: genId(),
        ...data,
        created_at: now(),
        updated_at: now(),
      }
      sections.push(section)
      set(STORAGE_KEYS.sections, sections)
      return section
    },
    update: async (id: string, updates: Partial<GuideSection>): Promise<GuideSection | null> => {
      const sections = get<GuideSection[]>(STORAGE_KEYS.sections) || []
      const idx = sections.findIndex(s => s.id === id)
      if (idx === -1) return null
      sections[idx] = { ...sections[idx], ...updates, updated_at: now() }
      set(STORAGE_KEYS.sections, sections)
      return sections[idx]
    },
    delete: async (id: string): Promise<boolean> => {
      const sections = get<GuideSection[]>(STORAGE_KEYS.sections) || []
      const filtered = sections.filter(s => s.id !== id)
      if (filtered.length === sections.length) return false
      set(STORAGE_KEYS.sections, filtered)
      return true
    },
  },

  // Analytics
  analytics: {
    track: async (guideId: string, eventType: string, _metadata?: Record<string, unknown>): Promise<void> => {
      const events = get<AnalyticsEvent[]>(STORAGE_KEYS.analytics) || []
      events.push({
        id: genId(),
        guide_id: guideId,
        event_type: eventType as AnalyticsEvent['event_type'],
        metadata: {},
        created_at: now(),
      })
      set(STORAGE_KEYS.analytics, events)
    },
    get: async (guideId: string): Promise<{ views: number; purchases: number; revenue: number }> => {
      const events = get<AnalyticsEvent[]>(STORAGE_KEYS.analytics) || []
      const guideEvents = events.filter(e => e.guide_id === guideId)
      return {
        views: guideEvents.filter(e => e.event_type === 'view').length,
        purchases: guideEvents.filter(e => e.event_type === 'purchase').length,
        revenue: guideEvents.filter(e => e.event_type === 'purchase').length * 490,
      }
    },
  },

  // AI (mock responses)
  ai: {
    structure: async (text: string) => {
      // Simple mock: split by double newlines into sections
      const paragraphs = text.split(/\n\s*\n/).filter(Boolean)
      const sections = paragraphs.map((p, i) => ({
        title: i === 0 ? 'Introduction' : `Section ${i}`,
        content: p.trim(),
      }))
      if (sections.length === 0) {
        sections.push({ title: 'Content', content: text })
      }
      return { sections }
    },
    generate: async (topic: string) => {
      return {
        sections: [
          { title: 'Introduction', content: `This comprehensive guide covers everything about ${topic}.` },
          { title: 'Getting Started', content: 'Before we dive in, here are the basics you need to know.' },
          { title: 'Main Content', content: 'Here is the detailed information organized by topic.' },
          { title: 'Practical Tips', content: 'Actionable advice and real-world examples.' },
          { title: 'Conclusion', content: 'Summary and next steps.' },
        ],
      }
    },
    improve: async (text: string, _instruction: string) => {
      return text // Mock: return as-is
    },
    suggestPrice: async (_title: string, _description: string, wordCount: number) => {
      return {
        min: Math.max(99, Math.round(wordCount * 0.5)),
        max: Math.max(299, Math.round(wordCount * 2)),
        recommended: Math.max(199, Math.round(wordCount * 1.2)),
      }
    },
    generateCover: async (prompt: string) => {
      // Generate a colored SVG placeholder
      const seed = Math.abs(hashCode(prompt)) % 360
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${seed},70%,55%)"/>
          <stop offset="100%" style="stop-color:hsl(${(seed+120)%360},70%,55%)"/>
        </linearGradient></defs>
        <rect width="1024" height="512" fill="url(#g)"/>
        <text x="512" y="270" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-family="system-ui" font-size="32">${escapeXml(prompt.slice(0, 50))}</text>
      </svg>`
      return `data:image/svg+xml;base64,${btoa(svg)}`
    },
  },

  // Payments (mock)
  payments: {
    create: async (_guideId: string, _buyerEmail: string, _buyerName?: string) => {
      return { confirmation_url: '#', id: genId() }
    },
    getStatus: async (_orderId: string) => {
      return { status: 'succeeded' }
    },
  },
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
