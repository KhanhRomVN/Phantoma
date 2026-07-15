import React, { useState } from 'react';
import { cn } from '@renderer/shared/lib/utils';
import { useTruncatedText } from './truncateText';

interface CopyableTextProps {
  value: string;
  monospace?: boolean;
}

export const CopyableText: React.FC<CopyableTextProps> = ({ value, monospace }) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const fontSize = '11px';
  const fontFamily = monospace ? 'monospace' : 'sans-serif';
  const { containerRef, displayText } = useTruncatedText(value || '', `${fontSize} ${fontFamily}`);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={copied ? 'Copied!' : value ? `Click to copy: ${value}` : 'N/A'}
      className={cn(
        'overflow-hidden whitespace-nowrap w-full transition-colors duration-150',
        copied ? 'text-success' : hovered ? 'text-primary' : 'text-text-primary',
        value ? 'cursor-pointer' : 'cursor-default',
      )}
      style={{
        fontSize,
        fontFamily,
      }}
    >
      {copied ? '✓ copied' : displayText || 'N/A'}
    </div>
  );
};
