import { create } from 'zustand'
import {
  ToolEntry,
  ToolFilter,
  ToolGrouping,
  DiscoveryResult,
  CatalogFailure,
  PermissionRequest,
  AgentConfig
} from '../types'

interface AgentToolState {
  // Tool entries
  tools: ToolEntry[]
  activeToolId: string | null
  expandedToolIds: Set<string>

  // Discovery state
  discovery: DiscoveryResult | null
  discoveryLoading: boolean
  discoveryError: CatalogFailure | null
  lastDiscovery: number | null

  // Filter & Grouping
  filter: ToolFilter
  grouping: ToolGrouping

  // Permission requests
  pendingPermissions: PermissionRequest[]

  // Agent config
  agentConfig: AgentConfig | null

  // Selected provider & model for MessageInput
  selectedProvider: { id: string; name: string; url?: string } | null
  selectedModel: string | null

  // Actions - Tool Management
  addTool: (tool: ToolEntry) => void
  updateTool: (id: string, updates: Partial<ToolEntry>) => void
  removeTool: (id: string) => void
  clearTools: () => void
  setActiveTool: (id: string | null) => void
  toggleToolExpanded: (id: string) => void

  // Actions - Discovery
  startDiscovery: () => Promise<void>
  setDiscovery: (result: DiscoveryResult) => void
  setDiscoveryError: (error: CatalogFailure) => void

  // Actions - Filter & Grouping
  setFilter: (filter: Partial<ToolFilter>) => void
  resetFilter: () => void
  setGrouping: (grouping: ToolGrouping) => void

  // Actions - Permissions
  addPermissionRequest: (request: PermissionRequest) => void
  resolvePermission: (id: string, approved: boolean) => void
  clearPermissions: () => void

  // Actions - Config
  setAgentConfig: (config: AgentConfig) => void

  // Actions - Provider & Model
  setSelectedProvider: (provider: { id: string; name: string; url?: string } | null) => void
  setSelectedModel: (model: string | null) => void
}

const initialFilter: ToolFilter = {
  status: undefined,
  type: undefined,
  search: undefined
}

const initialGrouping: ToolGrouping = {
  mode: 'by_status'
}

export const useAgentToolStore = create<AgentToolState>((set, get) => ({
  // Initial state
  tools: [],
  activeToolId: null,
  expandedToolIds: new Set(),

  discovery: null,
  discoveryLoading: false,
  discoveryError: null,
  lastDiscovery: null,

  filter: initialFilter,
  grouping: initialGrouping,

  pendingPermissions: [],

  agentConfig: null,

  selectedProvider: null,
  selectedModel: null,

  // Tool Management
  addTool: (tool) => {
    set((state) => ({
      tools: [...state.tools, tool]
    }))
  },

  updateTool: (id, updates) => {
    set((state) => ({
      tools: state.tools.map((tool) => (tool.id === id ? { ...tool, ...updates } : tool))
    }))
  },

  removeTool: (id) => {
    set((state) => ({
      tools: state.tools.filter((tool) => tool.id !== id),
      activeToolId: state.activeToolId === id ? null : state.activeToolId
    }))
  },

  clearTools: () => {
    set({ tools: [], activeToolId: null, expandedToolIds: new Set() })
  },

  setActiveTool: (id) => {
    set({ activeToolId: id })
  },

  toggleToolExpanded: (id) => {
    set((state) => {
      const newExpanded = new Set(state.expandedToolIds)
      if (newExpanded.has(id)) {
        newExpanded.delete(id)
      } else {
        newExpanded.add(id)
      }
      return { expandedToolIds: newExpanded }
    })
  },

  // Discovery
  startDiscovery: async () => {
    const { agentConfig } = get()
    if (!agentConfig) {
      set({
        discoveryError: {
          code: 'failed',
          message: 'No agent configured'
        }
      })
      return
    }

    set({ discoveryLoading: true, discoveryError: null })

    try {
      // Call IPC to discover tools (implement in main process)
      const result = await window.api.agentTool.discover(agentConfig)
      set({
        discovery: result,
        discoveryLoading: false,
        lastDiscovery: Date.now()
      })
    } catch (error) {
      set({
        discoveryError: {
          code: 'failed',
          message: error instanceof Error ? error.message : 'Discovery failed'
        },
        discoveryLoading: false
      })
    }
  },

  setDiscovery: (result) => {
    set({
      discovery: result,
      lastDiscovery: Date.now(),
      discoveryError: null
    })
  },

  setDiscoveryError: (error) => {
    set({ discoveryError: error, discoveryLoading: false })
  },

  // Filter & Grouping
  setFilter: (filter) => {
    set((state) => ({
      filter: { ...state.filter, ...filter }
    }))
  },

  resetFilter: () => {
    set({ filter: initialFilter })
  },

  setGrouping: (grouping) => {
    set({ grouping })
  },

  // Permissions
  addPermissionRequest: (request) => {
    set((state) => ({
      pendingPermissions: [...state.pendingPermissions, request]
    }))
  },

  resolvePermission: (id, approved) => {
    const request = get().pendingPermissions.find((r) => r.id === id)
    if (request) {
      // Send approval to IPC
      window.api.agentTool.resolvePermission(id, approved)
      set((state) => ({
        pendingPermissions: state.pendingPermissions.filter((r) => r.id !== id)
      }))
    }
  },

  clearPermissions: () => {
    set({ pendingPermissions: [] })
  },

  // Config
  setAgentConfig: (config) => {
    set({ agentConfig: config })
  },

  // Provider & Model
  setSelectedProvider: (provider) => {
    set({ selectedProvider: provider })
  },

  setSelectedModel: (model) => {
    set({ selectedModel: model })
  }
}))