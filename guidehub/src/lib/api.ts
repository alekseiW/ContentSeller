import type { Guide, GuideSection } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

type AnyRecord = Record<string, unknown>

export interface PaymentCreateResponse {
  orderId: string
  paymentId: string
  confirmation_url: string
  mock?: boolean
}

export interface PaymentStatusResponse {
  id: string
  guideId: string
  buyerId: string | null
  buyerEmail: string
  buyerName: string
  amount: number
  currency: string
  status: 'pending' | 'waiting' | 'completed' | 'canceled'
  paymentId: string
  createdAt: string
  updatedAt: string
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeSection(raw: AnyRecord): GuideSection {
  return {
    id: toString(raw.id),
    guide_id: toString(raw.guide_id ?? raw.guideId),
    title: toString(raw.title),
    content: raw.content ?? {},
    order: toNumber(raw.order ?? raw.section_order ?? raw.sectionOrder),
    hidden_until_payment: Boolean(raw.hidden_until_payment ?? raw.hiddenUntilPayment ?? false),
    created_at: toString(raw.created_at ?? raw.createdAt, new Date().toISOString()),
    updated_at: toString(raw.updated_at ?? raw.updatedAt, new Date().toISOString()),
  }
}

function normalizeGuide(raw: AnyRecord): Guide {
  return {
    id: toString(raw.id),
    author_id: toString(raw.author_id ?? raw.authorId),
    title: toString(raw.title),
    description: toString(raw.description),
    slug: toString(raw.slug),
    cover_image: toString(raw.cover_image ?? raw.coverImage) || undefined,
    accent_color: toString(raw.accent_color ?? raw.accentColor, '#6366f1'),
    template: toString(raw.template, 'minimal'),
    price: toNumber(raw.price),
    show_preview: Boolean(raw.show_preview ?? raw.showPreview ?? true),
    preview_sections: Array.isArray(raw.preview_sections ?? raw.previewSections)
      ? (raw.preview_sections ?? raw.previewSections) as string[]
      : [],
    is_course: Boolean(raw.is_course ?? raw.isCourse ?? false),
    status: (raw.status as Guide['status']) ?? 'draft',
    views: toNumber(raw.views),
    sales: toNumber(raw.sales),
    revenue: toNumber(raw.revenue),
    created_at: toString(raw.created_at ?? raw.createdAt, new Date().toISOString()),
    updated_at: toString(raw.updated_at ?? raw.updatedAt, new Date().toISOString()),
    published_at: toString(raw.published_at ?? raw.publishedAt) || undefined,
  }
}

function normalizeGuideWithSections(raw: AnyRecord): Guide & { sections: GuideSection[] } {
  const sectionsRaw = (raw.sections ?? raw.guide_sections ?? []) as AnyRecord[]
  return {
    ...normalizeGuide(raw),
    sections: Array.isArray(sectionsRaw) ? sectionsRaw.map(normalizeSection) : [],
  }
}

function normalizePublicGuide(raw: AnyRecord): AnyRecord {
  const guide = normalizeGuideWithSections(raw)
  const authorRaw = (raw.author ?? {}) as AnyRecord
  return {
    ...guide,
    hasPurchased: Boolean(raw.hasPurchased ?? false),
    author: {
      name: toString(authorRaw.name ?? authorRaw.full_name ?? authorRaw.fullName, 'Author'),
      username: toString(authorRaw.username),
      bio: toString(authorRaw.bio),
      avatar_url: toString(authorRaw.avatar_url ?? authorRaw.avatarUrl),
      social_links: (authorRaw.social_links ?? authorRaw.socialLinks ?? {}) as Record<string, string>,
    },
  }
}

function normalizePaymentCreate(raw: AnyRecord): PaymentCreateResponse {
  return {
    orderId: toString(raw.orderId ?? raw.order_id),
    paymentId: toString(raw.paymentId ?? raw.payment_id),
    confirmation_url: toString(raw.confirmation_url),
    mock: Boolean(raw.mock ?? false),
  }
}

function normalizePaymentStatus(raw: AnyRecord): PaymentStatusResponse {
  return {
    id: toString(raw.id),
    guideId: toString(raw.guideId ?? raw.guide_id),
    buyerId: raw.buyerId ? toString(raw.buyerId) : raw.buyer_id ? toString(raw.buyer_id) : null,
    buyerEmail: toString(raw.buyerEmail ?? raw.buyer_email),
    buyerName: toString(raw.buyerName ?? raw.buyer_name),
    amount: toNumber(raw.amount),
    currency: toString(raw.currency, 'RUB'),
    status: (raw.status as PaymentStatusResponse['status']) ?? 'pending',
    paymentId: toString(raw.paymentId ?? raw.payment_id),
    createdAt: toString(raw.createdAt ?? raw.created_at),
    updatedAt: toString(raw.updatedAt ?? raw.updated_at),
  }
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

function setToken(token: string): void {
  localStorage.setItem('token', token)
}

function clearToken(): void {
  localStorage.removeItem('token')
}

function getHeaders(attachToken = true): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (attachToken) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `API error: ${res.status}`)
    }
    return res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Network error. Check your connection and try again.')
    }
    throw err
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email: string, password: string, fullName: string, username: string) =>
    request<{ token: string; user: Record<string, unknown> }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, username }),
    }).then((data) => {
      setToken(data.token)
      return data
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then((data) => {
      setToken(data.token)
      return data
    }),

  logout: () => {
    clearToken()
  },

  getMe: () => request<AnyRecord>('/auth/me'),

  updateProfile: (data: Record<string, unknown>) =>
    request<AnyRecord>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ─── Guides ──────────────────────────────────────────────────────────────────

export const guidesApi = {
  list: async () => {
    const data = await request<AnyRecord[]>('/guides')
    return data.map(normalizeGuide)
  },
  create: async (data: unknown) => {
    const created = await request<AnyRecord>('/guides', { method: 'POST', body: JSON.stringify(data) })
    return normalizeGuideWithSections(created)
  },
  getById: async (id: string) => {
    const guide = await request<AnyRecord>(`/guides/${id}`)
    return normalizeGuideWithSections(guide)
  },
  update: async (id: string, data: unknown) => {
    const guide = await request<AnyRecord>(`/guides/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    return normalizeGuideWithSections(guide)
  },
  delete: (id: string) => request(`/guides/${id}`, { method: 'DELETE' }),
  getPublic: async (username: string, slug: string) => {
    const guide = await request<AnyRecord>(`/guides/${username}/${slug}/public`)
    return normalizePublicGuide(guide)
  },
  getCatalog: async (params: { q?: string; sort?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams()
    if (params.q) qs.set('q', params.q)
    if (params.sort) qs.set('sort', params.sort)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    const data = await request<AnyRecord>(`/guides/catalog?${qs.toString()}`)
    return {
      guides: ((data.guides as AnyRecord[]) ?? []).map((g: AnyRecord) => ({
        id: toString(g.id),
        title: toString(g.title),
        slug: toString(g.slug),
        description: toString(g.description),
        coverImage: (g.coverImage ?? g.cover_image) as string | null,
        accentColor: toString(g.accentColor ?? g.accent_color, '#6366f1'),
        template: toString(g.template, 'minimal'),
        isCourse: Boolean(g.isCourse ?? g.is_course ?? false),
        price: toNumber(g.price),
        sales: toNumber(g.sales),
        publishedAt: toString(g.publishedAt ?? g.published_at),
        author: {
          fullName: toString((g.author as AnyRecord)?.fullName ?? (g.author as AnyRecord)?.full_name ?? ''),
          username: toString((g.author as AnyRecord)?.username ?? ''),
          avatarUrl: ((g.author as AnyRecord)?.avatarUrl ?? (g.author as AnyRecord)?.avatar_url) as string | null,
        },
      })),
      pagination: (data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 }) as { page: number; limit: number; total: number; totalPages: number },
    }
  },
  getAuthor: async (username: string) => {
    const data = await request<AnyRecord>(`/guides/author/${encodeURIComponent(username)}`)
    const author = (data.author ?? {}) as AnyRecord
    return {
      author: {
        fullName: toString(author.fullName ?? author.full_name ?? ''),
        username: toString(author.username ?? ''),
        bio: toString(author.bio ?? ''),
        avatarUrl: (author.avatarUrl ?? author.avatar_url) as string | null,
      },
      guides: ((data.guides as AnyRecord[]) ?? []).map((g: AnyRecord) => ({
        id: toString(g.id),
        title: toString(g.title),
        slug: toString(g.slug),
        description: toString(g.description),
        coverImage: (g.coverImage ?? g.cover_image) as string | null,
        accentColor: toString(g.accentColor ?? g.accent_color, '#6366f1'),
        template: toString(g.template, 'minimal'),
        isCourse: Boolean(g.isCourse ?? g.is_course ?? false),
        price: toNumber(g.price),
        sales: toNumber(g.sales),
        publishedAt: toString(g.publishedAt ?? g.published_at),
      })),
    }
  },

}

// ─── AI ──────────────────────────────────────────────────────────────────────

export const aiApi = {
  structure: (text: string) => request('/ai/structure', { method: 'POST', body: JSON.stringify({ text }) }),
  generate: (topic: string) => request('/ai/generate', { method: 'POST', body: JSON.stringify({ topic }) }),
  improve: (text: string, instruction: string) => request('/ai/improve', { method: 'POST', body: JSON.stringify({ text, instruction }) }),
  editSelection: async (text: string, mode: string, instruction?: string) => {
    const data = await request<AnyRecord>('/ai/edit-selection', {
      method: 'POST',
      body: JSON.stringify({ text, mode, instruction }),
    })
    return {
      editedText: toString(data.editedText ?? data.text),
      mode: toString(data.mode, mode),
      mock: Boolean(data.mock ?? false),
      provider: toString(data.provider),
    }
  },
  suggestPrice: async (title: string, description: string, wordCount: number) => {
    const data = await request<AnyRecord>('/ai/suggest-price', {
      method: 'POST',
      body: JSON.stringify({ title, description, wordCount }),
    })
    return {
      min: toNumber(data.min),
      max: toNumber(data.max),
      recommended: toNumber(data.recommended),
      suggested_price: toNumber(data.recommended),
    }
  },
  generateCover: async (prompt: string) => {
    const data = await request<AnyRecord>('/ai/cover', { method: 'POST', body: JSON.stringify({ prompt }) })
    return { url: toString(data.url ?? data.imageUrl), imageUrl: toString(data.imageUrl ?? data.url) }
  },
  generateContent: async (prompt: string, context?: string, maxLength?: number) => {
    const data = await request<AnyRecord>('/ai/generate-content', {
      method: 'POST',
      body: JSON.stringify({ prompt, context, maxLength }),
    })
    return {
      content: toString(data.content ?? ''),
      mock: Boolean(data.mock ?? false),
      provider: toString(data.provider),
    }
  },
}

// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentsApi = {
  create: async (guideId: string, buyerEmail: string, buyerName?: string) => {
    const data = await request<AnyRecord>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ guideId, buyerEmail, buyerName }),
    })
    return normalizePaymentCreate(data)
  },
  getStatus: async (orderId: string) => {
    const data = await request<AnyRecord>(`/payments/order/${orderId}`)
    return normalizePaymentStatus(data)
  },
}

// ─── Sections ────────────────────────────────────────────────────────────────

export const sectionsApi = {
  list: async (guideId: string) => {
    const data = await request<AnyRecord[]>(`/guides/${guideId}/sections`)
    return data.map(normalizeSection)
  },
  create: async (guideId: string, data: unknown) => {
    const section = await request<AnyRecord>(`/guides/${guideId}/sections`, { method: 'POST', body: JSON.stringify(data) })
    return normalizeSection(section)
  },
  update: async (id: string, data: unknown) => {
    const section = await request<AnyRecord>(`/guides/sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
    return normalizeSection(section)
  },
  delete: (id: string) => request(`/guides/sections/${id}`, { method: 'DELETE' }),
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export const analyticsApi = {
  track: (guideId: string, eventType: string, metadata?: Record<string, unknown>) =>
    request('/analytics/track', { method: 'POST', body: JSON.stringify({ guideId, eventType, metadata }) }),
  get: (guideId: string) => request(`/analytics/${guideId}`),
  getAll: (period?: string) => request(`/analytics${period ? `?period=${period}` : ''}`),
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export const uploadApi = {
  upload: async (file: File): Promise<{ url: string; filename: string; size: number }> => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `Upload error: ${res.status}`)
    }

    return res.json()
  },
}

// ─── Export helpers ──────────────────────────────────────────────────────────

export { getToken, setToken, clearToken }
