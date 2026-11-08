import { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import type { Message } from '../../../services/conversationStorage'
import { describeToolCall } from '../../../shared/toolCallSummary'
import type { ToolCall } from '../../../types'

export const ToolCallBubble = memo<{ message: Message }>(({ message }) => {
  const { toolCall, toolResult } = message
  const status = toolResult ? (toolResult.error ? 'failed' : 'completed') : 'running'
  const summary = describeToolCall(toolCall as ToolCall | undefined)
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex-none w-8 h-8 rounded-full bg-card-background flex items-center justify-center">
        <svg
          className="w-4 h-4 text-text-secondary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>

      <div className="max-w-[80%] px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-blue-500">Tool Call</span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              status === 'running' && 'bg-blue-500/20 text-blue-500',
              status === 'completed' && 'bg-green-500/20 text-green-500',
              status === 'failed' && 'bg-red-500/20 text-red-500'
            )}
          >
            {status}
          </span>
        </div>
        <p className="text-sm text-text-primary">{summary?.label ?? message.content}</p>
        {summary?.detail && (
          <p className="text-xs text-text-secondary font-mono break-all">{summary.detail}</p>
        )}
        {toolResult && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-xs text-text-secondary">
              {toolResult.error || JSON.stringify(toolResult, null, 2)}
            </p>
          </div>
        )}
        <p className="text-xs text-text-faint mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
})

ToolCallBubble.displayName = 'ToolCallBubble'