import React from 'react';

interface SendToRepeaterBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị kết quả thêm request vào Repeater.
 */
export const SendToRepeaterBlock: React.FC<SendToRepeaterBlockProps> = ({
  content,
  maxHeight = '200px',
}) => {
  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      <pre
        className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap overflow-auto"
        style={{ maxHeight }}
      >
        {content}
      </pre>
    </div>
  );
};

export default SendToRepeaterBlock;