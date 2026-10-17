/**
 * ------------------------------------------------------------------
 * ThinkingBlock
 * ------------------------------------------------------------------
 * Hiển thị nội dung thinking/reasoning của AI.
 * - Mặc định thu gọn: chỉ hiển thị "Thinking for Xs"
 * - Tự động mở rộng khi đang streaming
 * - Click để toggle mở/đóng
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Icons ──
import { Cpu } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────
interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isStreaming = false }) => {
  const [isManuallyExpanded, setIsManuallyExpanded] = React.useState(false);

  const isExpanded = isStreaming || isManuallyExpanded;

  const { cleanContent, elapsedTime } = React.useMemo(() => {
    let cleaned = content.replace(/<thinking>/gi, '').replace(/<\/thinking>/gi, '');

    let elapsedMatch = cleaned.match(/<thinking_elapsed>([\d.]+)<\/thinking_elapsed>/i);
    let elapsed = elapsedMatch ? parseFloat(elapsedMatch[1]) : null;

    if (!elapsed) {
      elapsedMatch = cleaned.match(/<!--\s*thinking_elapsed:\s*([\d.]+)s\s*-->/);
      elapsed = elapsedMatch ? parseFloat(elapsedMatch[1]) : null;
    }

    cleaned = cleaned
      .replace(/<thinking_elapsed>.*?<\/thinking_elapsed>/gi, '')
      .replace(/<!--.*?-->/gs, '')
      .trim();

    return { cleanContent: cleaned, elapsedTime: elapsed };
  }, [content]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isStreaming) {
      setIsManuallyExpanded(!isManuallyExpanded);
    }
  };

  const thinkingLabel = elapsedTime ? `Thinking for ${elapsedTime}s` : 'Thinking';

  return (
    <div className="mt-1 mb-1">
      <div
        onClick={handleToggle}
        className={`flex items-center gap-2 ${isStreaming ? 'cursor-default' : 'cursor-pointer'} select-none`}
      >
        <span className="text-info inline-flex items-center">
          <Cpu size={14} />
        </span>

        <span className="flex-1 text-[12px] font-semibold text-text-secondary tracking-[0.3px]">
          {thinkingLabel}
          {isStreaming && (
            <span className="ml-2 text-[10px] font-normal italic">(streaming...)</span>
          )}
        </span>
      </div>

      {isExpanded && cleanContent && (
        <div className="mt-2 pl-[22px] text-[12px] leading-relaxed text-text-secondary font-mono whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
          {cleanContent}
        </div>
      )}

      {isExpanded && !cleanContent && (
        <div className="mt-2 pl-[22px] text-[11px] text-text-secondary italic">Thinking...</div>
      )}
    </div>
  );
};

export default ThinkingBlock;