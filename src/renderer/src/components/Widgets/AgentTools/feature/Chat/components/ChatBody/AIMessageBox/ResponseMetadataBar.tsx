import { memo } from 'react'
import type { Message } from '../../../../../services/conversationStorage'

interface ResponseMetadataBarProps {
  responseNumber: number
  message: Message
}

const iconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: 'shrink-0'
}

// ASSUMED: AgentTools không lưu raw request/response và không hỗ trợ retry/revert nên bar chỉ hiển thị token + số phản hồi
const ResponseMetadataBar = memo<ResponseMetadataBarProps>(({ responseNumber, message }) => {
  if (!message.usage) return null
  const { inputTokens, outputTokens } = message.usage

  return (
    <div className="relative py-1.5 text-[12px] font-mono leading-[1.6] flex justify-end items-center gap-3 select-none flex-wrap">
      <div className="inline-flex items-center gap-1.5 opacity-80">
        <span className="text-success inline-flex items-center">
          <svg {...iconProps}>
            <path d="M12 3v12" />
            <path d="m17 8-5-5-5 5" />
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          </svg>
        </span>
        <span className="text-text-primary font-semibold">{inputTokens.toLocaleString()}</span>
      </div>
      <div className="inline-flex items-center gap-1.5 opacity-80">
        <span className="text-error inline-flex items-center">
          <svg {...iconProps}>
            <path d="M12 15V3" />
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
          </svg>
        </span>
        <span className="text-text-primary font-semibold">{outputTokens.toLocaleString()}</span>
      </div>
      <span className="text-text-secondary text-[12px] font-semibold">[{responseNumber}]</span>
    </div>
  )
})

ResponseMetadataBar.displayName = 'ResponseMetadataBar'

export default ResponseMetadataBar