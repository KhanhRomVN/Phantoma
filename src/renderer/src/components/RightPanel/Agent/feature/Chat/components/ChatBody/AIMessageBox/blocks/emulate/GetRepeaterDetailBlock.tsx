import React from 'react';

interface GetRepeaterDetailBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị chi tiết repeater request dạng JSON.
 */
export const GetRepeaterDetailBlock: React.FC<GetRepeaterDetailBlockProps> = ({
  content,
  maxHeight = '400px',
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

export default GetRepeaterDetailBlock;