import { useMemo } from 'react';
import { cn } from '../../../../shared/lib/utils';

interface HexViewerProps {
  data: string;
  className?: string;
  maxLines?: number;
}

export function HexViewer({ data, className, maxLines }: HexViewerProps) {
  const { hexLines, asciiLines, totalBytes, truncated } = useMemo(() => {
    let buffer: Uint8Array;
    try {
      // Try base64 decode
      buffer = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    } catch {
      // Fallback to UTF-8 encoding
      buffer = new TextEncoder().encode(data);
    }

    const hex: string[] = [];
    const ascii: string[] = [];
    const chunkSize = 16;
    const maxDisplay = maxLines ? maxLines * chunkSize : buffer.length;
    const displayBytes = buffer.slice(0, maxDisplay);

    for (let i = 0; i < displayBytes.length; i += chunkSize) {
      const chunk = displayBytes.slice(i, i + chunkSize);

      const hexLine = Array.from(chunk)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      const padding = '   '.repeat(chunkSize - chunk.length);
      hex.push(hexLine + padding);

      const asciiLine = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('');
      ascii.push(asciiLine);
    }

    return {
      hexLines: hex,
      asciiLines: ascii,
      totalBytes: buffer.length,
      truncated: buffer.length > maxDisplay,
    };
  }, [data, maxLines]);

  return (
    <div className={cn('font-mono text-xs overflow-auto h-full bg-background p-4 select-text', className)}>
      <div className="flex">
        {/* Offset Column */}
        <div className="flex flex-col text-text-secondary select-none mr-4 border-r border-border pr-2 text-right shrink-0">
          {hexLines.map((_, i) => (
            <div key={i}>{(i * 16).toString(16).padStart(8, '0').toUpperCase()}</div>
          ))}
          {truncated && (
            <div className="text-text-secondary text-[10px] mt-2 italic">
              ... truncated
            </div>
          )}
        </div>

        {/* Hex Column */}
        <div className="flex flex-col text-text-primary mr-4 whitespace-pre font-mono">
          {hexLines.map((line, i) => (
            <div key={i} className="leading-relaxed">
              {line}
            </div>
          ))}
          {truncated && (
            <div className="text-text-secondary text-[10px] mt-2 italic">
              ... {totalBytes - hexLines.length * 16} more bytes
            </div>
          )}
        </div>

        {/* ASCII Column */}
        <div className="flex flex-col text-success border-l border-divider pl-4 whitespace-pre font-mono">
          {asciiLines.map((line, i) => (
            <div key={i} className="leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HexViewer;