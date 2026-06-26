// ─── AIWeb2API Client ───────────────────────────────────────────────────────

import { ChatRequest, ChatStreamChunk, Provider, Account, Model } from '../types'
import { MOCK_PROVIDERS, MOCK_ACCOUNTS } from '../constants'

export class AgentAPI {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8888') {
    this.baseUrl = baseUrl
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url
  }

  /**
   * Check if the server is online
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Fetch all providers and their models
   */
  async getProviders(): Promise<Provider[]> {
    try {
      const response = await fetch(`${this.baseUrl}/providers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch providers: ${response.status}`)
      }

      const data = await response.json()
      return data.providers || []
    } catch (error) {
      console.warn('Failed to fetch providers, using mock data:', error)
      // Fallback to mock data for development
      return MOCK_PROVIDERS
    }
  }

  /**
   * Fetch all accounts
   */
  async getAccounts(): Promise<Account[]> {
    try {
      const response = await fetch(`${this.baseUrl}/accounts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`)
      }

      const data = await response.json()
      return data.accounts || []
    } catch (error) {
      console.warn('Failed to fetch accounts, using mock data:', error)
      return MOCK_ACCOUNTS
    }
  }

  /**
   * Add a new account
   */
  async addAccount(providerId: string, email: string, credential?: string): Promise<Account> {
    const response = await fetch(`${this.baseUrl}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId, email, credential }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to add account: ${error}`)
    }

    return response.json()
  }

  /**
   * Delete an account
   */
  async deleteAccount(accountId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/accounts/${accountId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete account: ${error}`)
    }
  }

  /**
   * Stream a chat completion using Server-Sent Events
   */
  async streamChat(
    request: ChatRequest,
    onChunk: (chunk: ChatStreamChunk) => void,
    onError: (error: string) => void,
    onDone: () => void,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
        signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        onError(`Server error: ${response.status} - ${errorText}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        onError('No response body')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onDone()
              return
            }

            try {
              const chunk = JSON.parse(data) as ChatStreamChunk
              onChunk(chunk)
            } catch {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }

      onDone()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        onError('Stream aborted')
        return
      }
      onError(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chat(request: ChatRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Chat failed: ${error}`)
    }

    const data = await response.json()
    return data.content || data.response || ''
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, params: Record<string, unknown>): Promise<{ output: string; isError: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const error = await response.text()
        return { output: error, isError: true }
      }

      const data = await response.json()
      return { output: data.output || JSON.stringify(data), isError: false }
    } catch (error) {
      return {
        output: error instanceof Error ? error.message : 'Tool execution failed',
        isError: true,
      }
    }
  }
}

// Singleton instance
let apiInstance: AgentAPI | null = null

export function getAgentAPI(baseUrl?: string): AgentAPI {
  if (!apiInstance) {
    apiInstance = new AgentAPI(baseUrl)
  } else if (baseUrl) {
    apiInstance.setBaseUrl(baseUrl)
  }
  return apiInstance
}