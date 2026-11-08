import { useCallback, useEffect, useRef, useState } from 'react'
import { startAgentRun, interruptAgentRun } from '../../../services/agentApi'
import {
  type Conversation,
  getActiveConversationId,
  setActiveConversationId,
  getConversation,
  createConversation,
  addMessage,
  updateMessage,
  saveConversation
} from '../../../services/conversationStorage'
import type { AgentKind } from '../../../types'

export interface SendProvider {
  id: string
  name: string
  url?: string
  models: string[]
}

export function useAgentChat() {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const runIdRef = useRef<string | null>(null)

  useEffect(() => {
    const activeId = getActiveConversationId()
    if (!activeId) return
    const existing = getConversation(activeId)
    if (existing) setConversation(existing)
  }, [])

  const send = useCallback(
    async (message: string, provider: SendProvider, model: string) => {
      let conv = conversation
      if (!conv) {
        conv = createConversation(provider.id, model)
        saveConversation(conv)
        setActiveConversationId(conv.id)
      }

      const convId = conv.id
      const refresh = (): void => {
        const latest = getConversation(convId)
        if (latest) setConversation({ ...latest })
      }

      setIsStreaming(true)
      addMessage(convId, { role: 'user', content: message, timestamp: Date.now() })
      refresh()

      const toolMessageIds = new Map<string, string>()
      let currentAssistantId: string | null = null
      let currentText = ''

      try {
        const run = startAgentRun({
          kind: provider.id as AgentKind,
          prompt: message,
          model,
          resume: getConversation(convId)?.nativeSessionId
        })
        runIdRef.current = run.runId

        for await (const agentEvent of run.events) {
          switch (agentEvent.type) {
            case 'session_started': {
              const latest = getConversation(convId)
              if (latest) saveConversation({ ...latest, nativeSessionId: agentEvent.sessionId })
              break
            }
            case 'text_delta': {
              currentText += agentEvent.text
              if (!currentAssistantId) {
                currentAssistantId = addMessage(convId, {
                  role: 'assistant',
                  content: currentText,
                  timestamp: Date.now()
                }).id
                setStreamingMessageId(currentAssistantId)
              } else {
                updateMessage(convId, currentAssistantId, { content: currentText })
              }
              refresh()
              break
            }
            case 'message_completed': {
              currentAssistantId = null
              currentText = ''
              setStreamingMessageId(null)
              break
            }
            case 'tool_call': {
              const toolMessage = addMessage(convId, {
                role: 'tool',
                content: '',
                timestamp: Date.now(),
                toolCall: agentEvent.call
              })
              toolMessageIds.set(agentEvent.id, toolMessage.id)
              refresh()
              break
            }
            case 'tool_result': {
              const toolMessageId = toolMessageIds.get(agentEvent.id)
              if (toolMessageId) {
                updateMessage(convId, toolMessageId, {
                  toolResult: agentEvent.isError
                    ? { error: agentEvent.output || 'Tool failed' }
                    : { output: agentEvent.output }
                })
                refresh()
              }
              break
            }
            case 'error': {
              addMessage(convId, {
                role: 'assistant',
                content: agentEvent.message,
                timestamp: Date.now(),
                isError: true
              })
              refresh()
              break
            }
            case 'done': {
              if (agentEvent.status === 'errored' && agentEvent.error) {
                addMessage(convId, {
                  role: 'assistant',
                  content: agentEvent.error,
                  timestamp: Date.now(),
                  isError: true
                })
                refresh()
              }
              break
            }
          }
        }
      } catch (error) {
        console.error('Failed to send message:', error)
        addMessage(convId, {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
          timestamp: Date.now(),
          isError: true
        })
        refresh()
      } finally {
        setIsStreaming(false)
        setStreamingMessageId(null)
        runIdRef.current = null
      }
    },
    [conversation]
  )

  const stop = useCallback(() => {
    if (runIdRef.current) void interruptAgentRun(runIdRef.current)
  }, [])

  return {
    messages: conversation?.messages ?? [],
    isStreaming,
    streamingMessageId,
    send,
    stop
  }
}