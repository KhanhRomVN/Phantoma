// ─── AI Response Parser ─────────────────────────────────────────────────────

import { ParsedMessage, ToolAction } from '../types'

/**
 * Parse AI response content into thinking, display text, and tool actions
 * 
 * Format expected:
 * [THINKING]
 * The reasoning process here...
 * [/THINKING]
 * 
 * The visible response content here with markdown.
 * 
 * <tool_name>
 * {"param": "value"}
 * </tool_name>
 * 
 * <another_tool>
 * {"param2": "value2"}
 * </another_tool>
 */
export function parseAIResponse(content: string): ParsedMessage {
  let thinking: string | null = null
  let displayText = content
  const actions: ToolAction[] = []

  // 1. Extract thinking block
  const thinkingMatch = content.match(/\[THINKING\]([\s\S]*?)\[\/THINKING\]/)
  if (thinkingMatch) {
    thinking = thinkingMatch[1].trim()
    displayText = displayText.replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/, '').trim()
  }

  // 2. Extract tool actions (XML-like tags)
  const toolRegex = /<([a-zA-Z_][a-zA-Z0-9_\-]*)>\s*([\s\S]*?)\s*<\/\1>/g
  let match: RegExpExecArray | null

  while ((match = toolRegex.exec(content)) !== null) {
    const [, toolName, paramsStr] = match
    let params: Record<string, unknown> = {}

    try {
      params = JSON.parse(paramsStr.trim())
    } catch {
      // If JSON parsing fails, treat as plain text
      params = { raw: paramsStr.trim() }
    }

    actions.push({
      type: toolName,
      rawXml: match[0],
      params,
    })

    // Remove tool XML from display text
    displayText = displayText.replace(match[0], '').trim()
  }

  return {
    thinking,
    displayText: displayText.trim() || '',
    actions,
  }
}

/**
 * Extract tool calls from a message for API consumption
 */
export function extractToolCalls(content: string): Array<{ name: string; params: Record<string, unknown> }> {
  const result: Array<{ name: string; params: Record<string, unknown> }> = []
  const toolRegex = /<([a-zA-Z_][a-zA-Z0-9_\-]*)>\s*([\s\S]*?)\s*<\/\1>/g
  let match: RegExpExecArray | null

  while ((match = toolRegex.exec(content)) !== null) {
    const [, toolName, paramsStr] = match
    let params: Record<string, unknown> = {}

    try {
      params = JSON.parse(paramsStr.trim())
    } catch {
      params = { raw: paramsStr.trim() }
    }

    result.push({ name: toolName, params })
  }

  return result
}

/**
 * Check if content contains any tool calls
 */
export function hasToolCalls(content: string): boolean {
  return /<([a-zA-Z_][a-zA-Z0-9_\-]*)>\s*([\s\S]*?)\s*<\/\1>/g.test(content)
}

/**
 * Clean content of all tool XML tags
 */
export function stripToolCalls(content: string): string {
  return content.replace(/<([a-zA-Z_][a-zA-Z0-9_\-]*)>\s*([\s\S]*?)\s*<\/\1>/g, '').trim()
}

/**
 * Extract thinking block from content
 */
export function extractThinking(content: string): string | null {
  const match = content.match(/\[THINKING\]([\s\S]*?)\[\/THINKING\]/)
  return match ? match[1].trim() : null
}

/**
 * Generate a message ID
 */
export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Get current timestamp as ISO string
 */
export function getTimestamp(): number {
  return Date.now()
}