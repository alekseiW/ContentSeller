export const APP_NAME = 'GuideHub'
export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173'
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'grok'] as const
export type AIProvider = typeof AI_PROVIDERS[number]

export const TEMPLATES = [
  { id: 'minimal', name: 'Minimal', preview: '⬜' },
  { id: 'magazine', name: 'Magazine', preview: '📰' },
  { id: 'travel', name: 'Travel', preview: '✈️' },
  { id: 'course', name: 'Course', preview: '🎓' },
  { id: 'checklist', name: 'Checklist', preview: '✅' },
  { id: 'portfolio', name: 'Portfolio', preview: '💼' },
  { id: 'blog', name: 'Blog', preview: '📝' },
  { id: 'tech', name: 'Tech', preview: '💻' },
]

export const ACCENT_COLORS = [
  { id: 'indigo', value: '#6366f1' },
  { id: 'violet', value: '#8b5cf6' },
  { id: 'blue', value: '#3b82f6' },
  { id: 'emerald', value: '#10b981' },
  { id: 'amber', value: '#f59e0b' },
  { id: 'rose', value: '#f43f5e' },
  { id: 'slate', value: '#475569' },
  { id: 'cyan', value: '#06b6d4' },
]
