import React from 'react';

interface ListRepeatersBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị danh sách request trong Repeater.
 * Mỗi dòng: repeater_N | method | host | path
 */
export const ListRepeatersBlock: React.FC<ListRepeatersBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const lines = content.split('\n').filter(Boolean);
  const summaryLine = lines[0] || '';
  const dataLines = lines.filter((line) => line.trim().startsWith('-'));

  if (dataLines.length === 0) {
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
  }

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      {summaryLine && !summaryLine.startsWith('-') && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background">
          {summaryLine.replace(/^\[list_repeaters\]\s*/, '')}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        {dataLines.map((line, idx) => (
          <div
            key={idx}
            className="px-3 py-1 text-[12px] font-mono text-text-primary border-b border-border/50 hover:bg-dropdown-item-hover transition-colors whitespace-pre-wrap"
          >
            {line.trim().replace(/^-\s*/, '')}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListRepeatersBlock;