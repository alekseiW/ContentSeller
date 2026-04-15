import { create } from 'zustand'
import { authApi, getToken, clearToken } from '@/lib/api'

interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  bio: string
  is_self_employed: boolean
}

interface AuthState {
  user: { id: string; email: string } | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, username: string, isSelfEmployed?: boolean) => Promise<void>
  signOut: () => void
  updateProfile: (updates: Partial<{ full_name: string; bio: string; avatar_url: string }>) => Promise<void>
  fetchMe: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    try {
      const { user } = await authApi.login(email, password)
      set({
        user: { id: user.id as string, email: user.email as string },
        profile: {
          id: user.id as string,
          username: user.username as string,
          full_name: (user.fullName || user.full_name || '') as string,
          avatar_url: (user.avatarUrl || user.avatar_url) as string | null,
          bio: (user.bio || '') as string,
          is_self_employed: Boolean(user.isSelfEmployed ?? user.is_self_employed ?? false),
        },
        loading: false,
        initialized: true,
      })
    } catch (err: any) {
      set({ loading: false })
      throw new Error(err?.message ?? 'Sign in failed')
    }
  },

  signUp: async (email: string, password: string, fullName: string, username: string, _isSelfEmployed = false) => {
    set({ loading: true })
    try {
      const { user } = await authApi.register(email, password, fullName, username)
      set({
        user: { id: user.id as string, email: user.email as string },
        profile: {
          id: user.id as string,
          username: user.username as string,
          full_name: (user.fullName || user.full_name || fullName) as string,
          avatar_url: null,
          bio: '',
          is_self_employed: false,
        },
        loading: false,
        initialized: true,
      })
    } catch (err: any) {
      set({ loading: false })
      throw new Error(err?.message ?? 'Sign up failed')
    }
  },

  signOut: () => {
    authApi.logout()
    set({ user: null, profile: null, initialized: true, loading: false })
  },

  updateProfile: async (updates) => {
    try {
      const updated = await authApi.updateProfile({
        fullName: updates.full_name,
        bio: updates.bio,
        avatarUrl: updates.avatar_url,
      })
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              full_name: (updated.fullName ?? updated.full_name ?? state.profile.full_name) as string,
              bio: (updated.bio ?? state.profile.bio) as string,
              avatar_url: (updated.avatarUrl ?? updated.avatar_url ?? state.profile.avatar_url) as string | null,
            }
          : null,
      }))
    } catch (err) {
      console.error('Failed to update profile:', err)
      throw err
    }
  },

  fetchMe: async () => {
    const token = getToken()
    if (!token) {
      set({ initialized: true })
      return
    }
    try {
      const profile = await authApi.getMe()
      set({
        user: { id: profile.id as string, email: profile.email as string },
        profile: {
          id: profile.id as string,
          username: profile.username as string,
          full_name: (profile.fullName || profile.full_name || '') as string,
          avatar_url: (profile.avatarUrl || profile.avatar_url) as string | null,
          bio: (profile.bio || '') as string,
          is_self_employed: Boolean(profile.isSelfEmployed ?? profile.is_self_employed ?? false),
        },
        loading: false,
        initialized: true,
      })
    } catch {
      clearToken()
      set({ loading: false, initialized: true, user: null, profile: null })
    }
  },

  init: async () => {
    const token = getToken()
    if (!token) {
      set({ initialized: true })
      return
    }
    await get().fetchMe()
  },
}))
