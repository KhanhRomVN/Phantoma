import React, { useRef, useEffect } from 'react';
import { $ } from '@renderer/utils/color';

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
  className = '',
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
        className={`file-streaming-block overflow-y-auto overflow-x-hidden bg-background border border-border !border-t-0 rounded-b-[4px] my-1 mx-3 mb-3 ml-[29px] px-2.5 py-1.5 font-mono text-[11px] leading-[1.5] text-text-primary whitespace-pre break-all opacity-85 relative shadow-[inset_0_8px_8px_-8px_rgba(0,0,0,0.3)] ${className}`}
        style={{
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
        }}
      >
        <pre className="m-0 p-0 font-[inherit] text-[inherit] leading-[inherit] whitespace-pre-wrap break-all bg-transparent border-none">
          <code className="bg-transparent p-0 font-[inherit] text-[inherit]">{content}</code>
        </pre>
      </div>
    </>
  );
};

export default FileStreamingBlock;
