import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@renderer/utils/cn';
import { useTruncatedText } from '../../hooks/useTruncatedText';

interface CopyableTextProps {
  value: string;
  monospace?: boolean;
  fontSize?: string;
}

export const CopyableText: React.FC<CopyableTextProps> = ({
  value,
  monospace,
  fontSize: fontSizeProp,
}) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);
  const fontSize = fontSizeProp ?? '11px';
  const fontFamily = monospace ? 'monospace' : 'sans-serif';
  const { containerRef, displayText } = useTruncatedText(value || '', `${fontSize} ${fontFamily}`);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch((err) => console.error('Failed to copy:', err));
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
