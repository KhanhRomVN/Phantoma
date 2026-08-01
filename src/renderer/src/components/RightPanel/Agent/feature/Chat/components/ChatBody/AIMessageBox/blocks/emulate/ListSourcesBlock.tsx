import React from 'react';

interface ListSourcesBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị cây thư mục source files.
 */
export const ListSourcesBlock: React.FC<ListSourcesBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const lines = content.split('\n');

  // Dòng đầu là summary
  const summaryLine = lines[0] || '';
  const treeLines = lines.slice(1);

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px]">
      {summaryLine && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background">
          {summaryLine.replace(/^\[list_sources\]\s*/, '')}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre leading-relaxed">
          {treeLines.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export default ListSourcesBlock;