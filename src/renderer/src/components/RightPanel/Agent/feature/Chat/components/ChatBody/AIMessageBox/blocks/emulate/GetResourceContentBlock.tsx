import React from 'react';

interface GetResourceContentBlockProps {
  content: string;
  maxHeight?: string;
}

/**
 * Block hiển thị nội dung file resource với optional line range.
 */
export const GetResourceContentBlock: React.FC<GetResourceContentBlockProps> = ({
  content,
  maxHeight = '500px',
}) => {
  const lines = content.split('\n');

  // Extract metadata (first few lines before empty line)
  const emptyLineIndex = lines.findIndex((line) => line.trim() === '');
  const metadataLines = emptyLineIndex > 0 ? lines.slice(0, emptyLineIndex) : [];
  const contentLines = emptyLineIndex > 0 ? lines.slice(emptyLineIndex + 1) : lines;

  return (
    <div className="mt-1 bg-background border rounded-[4px] overflow-hidden ml-[29px]">
      {metadataLines.length > 0 && (
        <div className="px-3 py-2 text-[11px] text-text-secondary border-b border-border bg-card-background space-y-0.5">
          {metadataLines.map((line, i) => (
            <div key={i}>{line.replace(/^\[get_resource_content\]\s*/, '')}</div>
          ))}
        </div>
      )}
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="p-3 text-[12px] font-mono text-text-primary whitespace-pre leading-relaxed">
          {contentLines.join('\n')}
        </pre>
      </div>
    </div>
  );
};

export default GetResourceContentBlock;
