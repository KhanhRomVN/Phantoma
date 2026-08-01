import React from 'react';

interface GetSourceDetailBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị source code của một file.
 * Hiển thị metadata ở header và code trong pre block.
 */
export const GetSourceDetailBlock: React.FC<GetSourceDetailBlockProps> = ({
  content,
  maxHeight = '500px',
}) => {
  const lines = content.split('\n');

  // Tách metadata (các dòng bắt đầu bằng "File:", "URL:", "Size:", "Source:", "Note:")
  const metadataLines: string[] = [];
  let codeStartIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.startsWith('File:') ||
      line.startsWith('URL:') ||
      line.startsWith('Size:') ||
      line.startsWith('Source:') ||
      line.startsWith('Note:') ||
      line.startsWith('[get_source_detail]')
    ) {
      metadataLines.push(line);
      codeStartIndex = i + 1;
    } else if (line.trim() === '' && i === codeStartIndex) {
      // Bỏ qua dòng trống giữa metadata và code
      codeStartIndex = i + 1;
    } else if (line.trim() !== '') {
      break;
    }
  }

  const codeLines = lines.slice(codeStartIndex).join('\n');

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px]">
      {/* Metadata header */}
      {metadataLines.length > 0 && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background flex flex-wrap gap-x-4 gap-y-1">
          {metadataLines.map((line, i) => {
            const cleaned = line.replace(/^\[get_source_detail\]\s*/, '');
            if (cleaned.startsWith('Note:')) {
              return (
                <span key={i} className="text-warn italic">
                  {cleaned}
                </span>
              );
            }
            return (
              <span key={i} className="opacity-80">
                {cleaned}
              </span>
            );
          })}
        </div>
      )}
      {/* Code block */}
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre-wrap break-all">
          {codeLines || 'No source code available.'}
        </pre>
      </div>
    </div>
  );
};

export default GetSourceDetailBlock;