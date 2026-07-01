import React, { useRef, useEffect } from "react";

export interface FileStreamingBlockProps {
  content: string;
  maxHeight?: number | string;
  className?: string;
}

/**
 * FileStreamingBlock - Hiển thị nội dung file đang được streaming.
 * - Không có border-top
 * - Có shadow-top (bóng mờ phía trên) để báo hiệu có thể scroll
 * - Auto-scroll xuống cuối khi có nội dung mới
 */
const FileStreamingBlock: React.FC<FileStreamingBlockProps> = ({
  content,
  maxHeight = 200,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever content changes (streaming)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <>
      <div
        ref={containerRef}
        className={`file-streaming-block overflow-y-auto overflow-x-hidden bg-[var(--background,var(--background))] border border-[var(--border,rgba(255,255,255,0.08))] !border-t-0 rounded-b-[4px] my-1 mx-3 mb-3 ml-[29px] px-2.5 py-1.5 font-mono text-[11px] leading-[1.5] text-[var(--primary-text)] whitespace-pre break-all opacity-85 relative shadow-[inset_0_8px_8px_-8px_rgba(0,0,0,0.3)] ${className}`}
        style={{
          maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
        }}
      >
        <pre className="m-0 p-0 font-[inherit] text-[inherit] leading-[inherit] whitespace-pre-wrap break-all bg-transparent border-none">
          <code className="bg-transparent p-0 font-[inherit] text-[inherit]">{content}</code>
        </pre>
      </div>

      <style>{`
        .file-streaming-block::-webkit-scrollbar {
          width: 4px;
        }
        .file-streaming-block::-webkit-scrollbar-track {
          background: transparent;
        }
        .file-streaming-block::-webkit-scrollbar-thumb {
          background: rgba(128,128,128,0.4) rgba(121, 121, 121, 0.3));
          border-radius: 4px;
        }
        .file-streaming-block::-webkit-scrollbar-thumb:hover {
          background: rgba(128,128,128,0.6) rgba(100, 100, 100, 0.5));
        }

        .streaming-cursor {
          display: inline-block;
          width: 6px;
          height: 12px;
          background: var(--primary-text);
          margin-left: 1px;
          vertical-align: middle;
          animation: zen-cursor-blink 0.6s step-end infinite;
        }

        @keyframes zen-cursor-blink {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default FileStreamingBlock;