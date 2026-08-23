import React from 'react';

interface ListHttpsBlockProps {
  /** Raw text output từ list_https (dạng list) */
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị danh sách HTTPS requests dạng list.
 * Mỗi dòng: index | method | status | host | path | size
 */
export const ListHttpsBlock: React.FC<ListHttpsBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  const lines = content.split('\n').filter(Boolean);

  // Dòng đầu là summary: "[list_https] Total: X, Filtered: Y, Showing: Z"
  const summaryLine = lines[0] || '';
  const dataLines = lines.filter((line) => line.trim().startsWith('-'));

  // Fallback: nếu không parse được, hiển thị nguyên bản
  if (dataLines.length === 0) {
    return (
      <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
        <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap overflow-auto" style={{ maxHeight }}>
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden">
      {/* Summary line */}
      {summaryLine && !summaryLine.startsWith('-') && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background">
          {summaryLine.replace(/^\[list_https\]\s*/, '')}
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

export default ListHttpsBlock;