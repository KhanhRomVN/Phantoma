import React from 'react';

interface ListHttpsBlockProps {
  /** Raw text output từ list_https (dạng table markdown) */
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị bảng danh sách HTTPS requests.
 * Parse text table và render dạng bảng HTML đơn giản.
 */
export const ListHttpsBlock: React.FC<ListHttpsBlockProps> = ({
  content,
  maxHeight = '400px',
}) => {
  // Parse text table: tách dòng header, separator, rows
  const lines = content.split('\n').filter(Boolean);

  // Dòng đầu là summary: "[list_https] Total: X, Filtered: Y, Showing: Z"
  const summaryLine = lines[0] || '';

  // Tìm dòng separator (|-----|...) để xác định ranh giới header/rows
  let headerIndex = -1;
  let separatorIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.includes('---')) {
      separatorIndex = i;
      headerIndex = i - 1;
      break;
    }
  }

  const headerCells =
    headerIndex >= 0
      ? lines[headerIndex]
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
      : ['stt', 'method', 'status', 'host', 'path'];

  const dataRows: string[][] = [];
  if (separatorIndex >= 0) {
    for (let i = separatorIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && !line.includes('---')) {
        const cells = line
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);
        if (cells.length > 0) {
          dataRows.push(cells);
        }
      }
    }
  }

  // Fallback: nếu không parse được, hiển thị nguyên bản
  if (dataRows.length === 0) {
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
      {summaryLine && !summaryLine.startsWith('|') && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background">
          {summaryLine.replace(/^\[list_https\]\s*/, '')}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-[12px] font-mono">
          <thead className="bg-card-background sticky top-0">
            <tr>
              {headerCells.map((cell, i) => (
                <th
                  key={i}
                  className="px-3 py-1.5 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider border-b border-border"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-dropdown-item-hover transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-3 py-1 text-text-primary border-b border-border/50 truncate max-w-[200px]"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListHttpsBlock;