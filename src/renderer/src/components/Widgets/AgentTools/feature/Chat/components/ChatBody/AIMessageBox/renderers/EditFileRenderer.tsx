import { memo, useState } from 'react'
import type { Message } from '@renderer/components/Widgets/AgentTools/services/conversationStorage'
import type { ToolCall } from '@renderer/components/Widgets/AgentTools/types'
import { getFileIconPath } from '@renderer/utils/file-icon'
import { FilePreviewModal } from '@renderer/components/common/FilePreviewModal'
import { ToolCallFrame, baseName, diffFromTexts, diffStatsOf } from './ToolCallFrame'

export const EditFileRenderer = memo<{ message: Message; call: Extract<ToolCall, { type: 'edit_file' }> }>(
  ({ message, call }) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const stats = diffStatsOf(diffFromTexts(call.old_string, call.new_string))
    const openPreview = (e: React.MouseEvent): void => {
      e.stopPropagation()
      if (call.path) setIsModalOpen(true)
    }
    return (
      <>
        <ToolCallFrame
          message={message}
          toolType="edit_file"
          path={call.path}
          title={
            <div className="flex items-center gap-2 text-xs text-text-primary min-w-0">
              <span className="font-semibold opacity-80 shrink-0 cursor-pointer" onClick={openPreview}>
                REPLACE
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
              {(stats.added > 0 || stats.removed > 0) && (
                <span className="flex gap-1.5 items-center text-[11px] font-medium ml-1.5 shrink-0">
                  <span className="text-success">+{stats.added}</span>
                  <span className="text-error">-{stats.removed}</span>
                </span>
              )}
            </div>
          }
        />
        <FilePreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          filePath={call.path}
          mode="diff"
          oldContent={call.old_string || ''}
          newContent={call.new_string || ''}
          oldContentLabel="Nội dung cũ (old_content)"
          newContentLabel="Nội dung mới (new_content)"
        />
      </>
    )
  }
)
EditFileRenderer.displayName = 'EditFileRenderer'