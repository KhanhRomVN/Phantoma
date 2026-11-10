import { memo, useState } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { getFileIconPath } from '@renderer/utils/file-icon'
import { FilePreviewModal } from '@renderer/components/common/FilePreviewModal'
import { ToolCallFrame, baseName } from './ToolCallFrame'

export const WriteFileRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'write_file' }> }>(
  ({ message, call }) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const linesCount = call.content ? call.content.split('\n').length : 0
    const openPreview = (e: React.MouseEvent): void => {
      e.stopPropagation()
      if (call.path) setIsModalOpen(true)
    }
    return (
      <>
        <ToolCallFrame
          message={message}
          toolType="write_file"
          path={call.path}
          title={
            <div className="flex items-center gap-2 text-xs text-text-primary min-w-0">
              <span className="font-semibold opacity-80 shrink-0 cursor-pointer" onClick={openPreview}>
                WRITE
              </span>
              <span className="flex items-center shrink-0" onClick={openPreview}>
                <img
                  src={getFileIconPath(call.path)}
                  alt=""
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </span>
              <span
                className="font-medium opacity-90 font-mono text-[11px] truncate cursor-pointer"
                onClick={openPreview}
              >
                {baseName(call.path)}
              </span>
              {linesCount > 0 && (
                <span className="opacity-70 text-[11px] ml-1.5 font-medium shrink-0">
                  +{linesCount} {linesCount === 1 ? 'line' : 'lines'}
                </span>
              )}
            </div>
          }
        />
        <FilePreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          filePath={call.path}
          newContent={call.content || ''}
          mode="content"
          newContentLabel="Nội dung write_to_file"
        />
      </>
    )
  }
)
WriteFileRenderer.displayName = 'WriteFileRenderer'