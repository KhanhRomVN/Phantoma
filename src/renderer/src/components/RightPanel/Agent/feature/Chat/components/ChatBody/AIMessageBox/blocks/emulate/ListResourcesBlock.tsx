import React from 'react';

interface ListResourcesBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị danh sách resources (images, videos, fonts, etc.).
 */
export const ListResourcesBlock: React.FC<ListResourcesBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const lines = content.split('\n');

  // Dòng đầu là summary
  const summaryLine = lines[0] || '';
  const tableLines = lines.slice(1);

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px]">
      {summaryLine && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background">
          {summaryLine.replace(/^\[list_resources\]\s*/, '')}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre leading-relaxed">
          {tableLines.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export default ListResourcesBlock;
