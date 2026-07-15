import React, { useEffect, useRef } from 'react';
import { $ } from '@renderer/utils/color';

interface ProcessingIndicatorProps {
  isResponding?: boolean;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ isResponding }) => {
  const startTimeRef = useRef<number | null>(null);
  const timerDisplayRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isResponding) {
      // Record start time
      startTimeRef.current = Date.now();

      // Update display using requestAnimationFrame (smoother, no re-renders!)
      const updateDisplay = () => {
        if (timerDisplayRef.current && startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          timerDisplayRef.current.textContent = `Processing (${elapsed}s)`;
        }
        animationFrameRef.current = requestAnimationFrame(updateDisplay);
      };

      animationFrameRef.current = requestAnimationFrame(updateDisplay);
    } else {
      // Cleanup when not responding
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isResponding]);

  // isResponding = true means waiting (should show)
  // isResponding = false means has content (should hide)
  if (!isResponding) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: $('--spacing-xs'),
        padding: '0 ' + $('--spacing-sm'),
        marginTop: '-' + $('--spacing-sm'),
        color: $('--secondary-text'),
        fontSize: $('--font-size-md'),
        marginBottom: $('--spacing-md'),
      }}
    >
      <span ref={timerDisplayRef} className="processing-text">
        Processing (0s)
      </span>
      <style>
        {`
        .processing-text {
          background: linear-gradient(
            to right,
            var(--secondary-text) 0%,
            var(--secondary-text) 40%,
            var(--vscode-editor-foreground, #ffffff) 50%,
            var(--secondary-text) 60%,
            var(--secondary-text) 100%
          );
          background-size: 200% auto;
          color: transparent;
          background-clip: text;
          -webkit-background-clip: text;
          animation: gradient-move 2.5s linear infinite;
          display: inline-block;
          font-weight: 500;
        }

        @keyframes gradient-move {
          0% { background-position: -100% center; }
          100% { background-position: 100% center; }
        }
      `}
      </style>
    </div>
  );
};

export default ProcessingIndicator;
