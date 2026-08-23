import React from 'react';

interface DeleteRepeaterBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị kết quả xóa request khỏi Repeater.
 */
export const DeleteRepeaterBlock: React.FC<DeleteRepeaterBlockProps> = ({
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

export default DeleteRepeaterBlock;