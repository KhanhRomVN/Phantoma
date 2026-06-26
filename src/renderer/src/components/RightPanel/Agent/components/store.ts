// ─── Agent Store (Zustand) ────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '../types'

interface AgentState {
  // Settings
  apiUrl: string
  language: string
  aiLanguage: string

  // Active selections
  activeModelId: string | null
  activeAccountId: string | null

  // Server status
  serverStatus: 'online' | 'offline' | 'unknown'

  // UI state
  activeTab: 'chat' | 'models' | 'accounts' | 'settings'
  isLoading: boolean

  // Actions
  setApiUrl: (url: string) => void
  setLanguage: (lang: string) => void
  setAiLanguage: (lang: string) => void
  setActiveModelId: (id: string | null) => void
  setActiveAccountId: (id: string | null) => void
  setServerStatus: (status: 'online' | 'offline' | 'unknown') => void
  setActiveTab: (tab: 'chat' | 'models' | 'accounts' | 'settings') => void
  setIsLoading: (loading: boolean) => void

  // Reset
  reset: () => void
}

const DEFAULT_STATE = {
  apiUrl: 'http://localhost:8888',
  language: 'en',
  aiLanguage: 'English',
  activeModelId: null,
  activeAccountId: null,
  serverStatus: 'unknown' as const,
  activeTab: 'chat' as const,
  isLoading: false,
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setApiUrl: (url) => set({ apiUrl: url }),
      setLanguage: (lang) => set({ language: lang }),
      setAiLanguage: (lang) => set({ aiLanguage: lang }),
      setActiveModelId: (id) => set({ activeModelId: id }),
      setActiveAccountId: (id) => set({ activeAccountId: id }),
      setServerStatus: (status) => set({ serverStatus: status }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setIsLoading: (loading) => set({ isLoading: loading }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'agent-store',
      partialize: (state) => ({
        apiUrl: state.apiUrl,
        language: state.language,
        aiLanguage: state.aiLanguage,
        activeModelId: state.activeModelId,
        activeAccountId: state.activeAccountId,
      }),
    }
  )
)