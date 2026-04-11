import { create } from 'zustand'
import type { Guide, GuideSection } from '@/types'
import { guidesApi, sectionsApi } from '@/lib/api'

interface GuideState {
  guides: Guide[]
  currentGuide: Guide | null
  sections: GuideSection[]
  loading: boolean
  error: string | null
  fetchGuides: () => Promise<void>
  fetchGuide: (id: string) => Promise<void>
  createGuide: (data: Partial<Guide> & { sections?: Partial<GuideSection>[] }) => Promise<Guide>
  updateGuide: (id: string, updates: Partial<Guide>) => Promise<void>
  deleteGuide: (id: string) => Promise<void>
  publishGuide: (id: string) => Promise<void>
}

export const useGuideStore = create<GuideState>((set) => ({
  guides: [],
  currentGuide: null,
  sections: [],
  loading: false,
  error: null,

  fetchGuides: async () => {
    set({ loading: true, error: null })
    try {
      const data = await guidesApi.list()
      set({ guides: data, loading: false })
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to fetch guides', loading: false })
    }
  },

  fetchGuide: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const guide = await guidesApi.getById(id) as Guide & { sections?: GuideSection[] }
      if (!guide) throw new Error('Guide not found')

      const guideSections = Array.isArray(guide.sections)
        ? guide.sections
        : await sectionsApi.list(id)

      const { sections: _unused, ...guideWithoutSections } = guide as Guide & { sections?: GuideSection[] }

      set({ currentGuide: guideWithoutSections, sections: guideSections, loading: false })
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to fetch guide', loading: false })
    }
  },

  createGuide: async (data) => {
    set({ loading: true, error: null })
    try {
      const guide = await guidesApi.create(data) as Guide & { sections?: GuideSection[] }
      const createdSections = Array.isArray(guide.sections)
        ? guide.sections
        : await sectionsApi.list(guide.id)

      const { sections: _unused, ...guideWithoutSections } = guide as Guide & { sections?: GuideSection[] }

      set((state) => ({
        guides: [guideWithoutSections, ...state.guides],
        currentGuide: { ...guideWithoutSections },
        sections: createdSections,
        loading: false,
      }))
      return guideWithoutSections
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to create guide', loading: false })
      throw err
    }
  },

  updateGuide: async (id: string, updates: Partial<Guide>) => {
    set({ loading: true, error: null })
    try {
      const updated = await guidesApi.update(id, updates) as Guide & { sections?: GuideSection[] }
      if (!updated) throw new Error('Guide not found')

      const { sections: _unused, ...guideWithoutSections } = updated as Guide & { sections?: GuideSection[] }

      set((state) => ({
        guides: state.guides.map((g) => (g.id === id ? guideWithoutSections : g)),
        currentGuide: state.currentGuide?.id === id ? guideWithoutSections : state.currentGuide,
        sections: Array.isArray(updated.sections) && updated.sections.length > 0 ? updated.sections : state.sections,
        loading: false,
      }))
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to update guide', loading: false })
    }
  },

  deleteGuide: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await guidesApi.delete(id)
      set((state) => ({
        guides: state.guides.filter((g) => g.id !== id),
        currentGuide: state.currentGuide?.id === id ? null : state.currentGuide,
        loading: false,
      }))
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to delete guide', loading: false })
    }
  },

  publishGuide: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const updated = await guidesApi.update(id, {
        status: 'published',
        published_at: new Date().toISOString(),
      }) as Guide & { sections?: GuideSection[] }

      if (!updated) throw new Error('Guide not found')

      const { sections: _unused, ...guideWithoutSections } = updated as Guide & { sections?: GuideSection[] }

      set((state) => ({
        guides: state.guides.map((g) => (g.id === id ? guideWithoutSections : g)),
        currentGuide: state.currentGuide?.id === id ? guideWithoutSections : state.currentGuide,
        loading: false,
      }))
    } catch (err: any) {
      set({ error: err?.message ?? 'Failed to publish guide', loading: false })
      throw err
    }
  },
}))
