/**
 * Conversation Storage Service
 * Handles persistence of chat messages and conversations
 */

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  toolCall?: any
  toolResult?: any
  isError?: boolean
  thinking?: string
  usage?: { inputTokens: number; outputTokens: number }
}

export interface Conversation {
  id: string
  title: string
  provider: string
  model: string
  nativeSessionId?: string
  contextTokens?: number
  contextWindow?: number
  totalTokens?: number
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY_PREFIX = 'agent-tools'
const CONVERSATIONS_KEY = `${STORAGE_KEY_PREFIX}:conversations`
const ACTIVE_CONVERSATION_KEY = `${STORAGE_KEY_PREFIX}:active-conversation`

/**
 * Get all conversations
 */
export function getAllConversations(): Conversation[] {
  try {
    const data = localStorage.getItem(CONVERSATIONS_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load conversations:', error)
    return []
  }
}

/**
 * Get conversation by ID
 */
export function getConversation(id: string): Conversation | null {
  const conversations = getAllConversations()
  return conversations.find((c) => c.id === id) || null
}

/**
 * Save conversation
 */
export function saveConversation(conversation: Conversation): void {
  try {
    const conversations = getAllConversations()
    const index = conversations.findIndex((c) => c.id === conversation.id)

    if (index >= 0) {
      // Update existing
      conversations[index] = {
        ...conversation,
        updatedAt: Date.now()
      }
    } else {
      // Add new
      conversations.push({
        ...conversation,
        createdAt: conversation.createdAt || Date.now(),
        updatedAt: Date.now()
      })
    }

    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
  } catch (error) {
    console.error('Failed to save conversation:', error)
  }
}

/**
 * Delete conversation
 */
export function deleteConversation(id: string): void {
  try {
    const conversations = getAllConversations()
    const filtered = conversations.filter((c) => c.id !== id)
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered))

    // Clear active if it was deleted
    if (getActiveConversationId() === id) {
      clearActiveConversation()
    }
  } catch (error) {
    console.error('Failed to delete conversation:', error)
  }
}

/**
 * Get active conversation ID
 */
export function getActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONVERSATION_KEY)
  } catch (error) {
    return null
  }
}

/**
 * Set active conversation ID
 */
export function setActiveConversationId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, id)
  } catch (error) {
    console.error('Failed to set active conversation:', error)
  }
}

/**
 * Clear active conversation
 */
export function clearActiveConversation(): void {
  try {
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY)
  } catch (error) {
    console.error('Failed to clear active conversation:', error)
  }
}

/**
 * Create new conversation
 */
export function createConversation(
  provider: string,
  model: string,
  title?: string
): Conversation {
  const now = Date.now()
  return {
    id: `conv_${now}_${Math.random().toString(36).slice(2, 9)}`,
    title: title || 'New conversation',
    provider,
    model,
    messages: [],
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Add message to conversation
 */
export function addMessage(conversationId: string, message: Omit<Message, 'id'>): Message {
  const conversation = getConversation(conversationId)
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`)
  }

  const newMessage: Message = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  conversation.messages.push(newMessage)

  // Auto-generate title from first user message
  if (conversation.messages.length === 1 && message.role === 'user') {
    conversation.title = generateTitle(message.content)
  }

  saveConversation(conversation)
  return newMessage
}

/**
 * Update message in conversation
 */
export function updateMessage(
  conversationId: string,
  messageId: string,
  updates: Partial<Message>
): void {
  const conversation = getConversation(conversationId)
  if (!conversation) return

  const messageIndex = conversation.messages.findIndex((m) => m.id === messageId)
  if (messageIndex < 0) return

  conversation.messages[messageIndex] = {
    ...conversation.messages[messageIndex],
    ...updates
  }

  saveConversation(conversation)
}

/**
 * Generate title from first message
 */
function generateTitle(content: string): string {
  // Take first 50 chars
  const trimmed = content.trim().slice(0, 50)
  return trimmed.length < content.trim().length ? `${trimmed}...` : trimmed
}

/**
 * Export conversation as JSON
 */
export function exportConversation(id: string): string {
  const conversation = getConversation(id)
  if (!conversation) {
    throw new Error(`Conversation ${id} not found`)
  }
  return JSON.stringify(conversation, null, 2)
}

/**
 * Import conversation from JSON
 */
export function importConversation(json: string): Conversation {
  try {
    const conversation = JSON.parse(json) as Conversation
    // Generate new ID to avoid conflicts
    conversation.id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    saveConversation(conversation)
    return conversation
  } catch (error) {
    throw new Error(`Failed to import conversation: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
  }
}

/**
 * Clear all conversations
 */
export function clearAllConversations(): void {
  try {
    localStorage.removeItem(CONVERSATIONS_KEY)
    localStorage.removeItem(ACTIVE_CONVERSATION_KEY)
  } catch (error) {
    console.error('Failed to clear conversations:', error)
  }
}