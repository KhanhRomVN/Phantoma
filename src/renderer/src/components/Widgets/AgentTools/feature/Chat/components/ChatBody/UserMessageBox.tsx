import { memo, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import type { Message } from '../../../../services/conversationStorage'

const UserMessageBox = memo<{ message: Message }>(({ message }) => {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(message.content).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-col gap-0 mb-4 relative z-[1]">
      <div className="flex flex-col gap-1 rounded-md p-3 ml-0 relative bg-input-background border border-border">
        <div className="text-[13px] leading-relaxed text-text-primary whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>

      <div className="w-full flex justify-start items-center gap-2 bg-transparent py-1 px-2">
        <button
          onClick={handleCopy}
          title="Copy content"
          className={cn(
            'bg-transparent border-none cursor-pointer p-1 flex items-center justify-center rounded opacity-70 hover:opacity-100 transition-opacity duration-200',
            isCopied ? 'text-success' : 'text-text-secondary'
          )}
        >
          {isCopied ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
})

UserMessageBox.displayName = 'UserMessageBox'

export default UserMessageBox