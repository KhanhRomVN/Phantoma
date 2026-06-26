// ─── Chat Storage ────────────────────────────────────────────────────────────

import { Message, ChatSession, STORAGE_KEYS } from '../types'

/**
 * Save messages to localStorage for a conversation
 */
export function saveMessages(conversationId: string, messages: Message[]): void {
  try {
    const key = `agent-conversation-${conversationId}`
    localStorage.setItem(key, JSON.stringify(messages))
  } catch (e) {
    console.warn('Failed to save messages:', e)
  }
}

/**
 * Load messages from localStorage for a conversation
 */
export function loadMessages(conversationId: string): Message[] {
  try {
    const key = `agent-conversation-${conversationId}`
    const data = localStorage.getItem(key)
    if (!data) return []
    return JSON.parse(data)
  } catch (e) {
    console.warn('Failed to load messages:', e)
    return []
  }
}

/**
 * Delete a conversation from localStorage
 */
export function deleteConversation(conversationId: string): void {
  try {
    const key = `agent-conversation-${conversationId}`
    localStorage.removeItem(key)
  } catch (e) {
    console.warn('Failed to delete conversation:', e)
  }
}

/**
 * Get all conversation IDs from localStorage
 */
export function getAllConversationIds(): string[] {
  try {
    const keys = Object.keys(localStorage)
    return keys
      .filter((k) => k.startsWith('agent-conversation-'))
      .map((k) => k.replace('agent-conversation-', ''))
  } catch (e) {
    return []
  }
}

/**
 * Save sessions list
 */
export function saveSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions))
  } catch (e) {
    console.warn('Failed to save sessions:', e)
  }
}

/**
 * Load sessions list
 */
export function loadSessions(): ChatSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS)
    if (!data) return []
    return JSON.parse(data)
  } catch (e) {
    return []
  }
}

/**
 * Create a new session
 */
export function createSession(title: string): ChatSession {
  return {
    id: `session-${Date.now()}`,
    title: title || `Chat ${new Date().toLocaleString()}`,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/**
 * Update a session's messages
 */
export function updateSessionMessages(sessionId: string, messages: Message[]): void {
  const sessions = loadSessions()
  const index = sessions.findIndex((s) => s.id === sessionId)
  if (index === -1) return

  sessions[index].messages = messages
  sessions[index].updatedAt = Date.now()
  saveSessions(sessions)
  saveMessages(sessionId, messages)
}

/**
 * Get or create a session
 */
export function getOrCreateSession(sessionId: string | null, title?: string): ChatSession {
  if (sessionId) {
    const sessions = loadSessions()
    const existing = sessions.find((s) => s.id === sessionId)
    if (existing) return existing
  }

  const newSession = createSession(title || 'New Chat')
  const sessions = loadSessions()
  sessions.push(newSession)
  saveSessions(sessions)
  return newSession
}