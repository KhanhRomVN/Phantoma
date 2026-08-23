import React from 'react';

interface UpdateRepeaterContentBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị kết quả cập nhật repeater content.
 */
export const UpdateRepeaterContentBlock: React.FC<UpdateRepeaterContentBlockProps> = ({
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

export default UpdateRepeaterContentBlock;