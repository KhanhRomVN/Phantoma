import React from 'react';
import { cn } from '@renderer/shared/lib/utils';

/**
 * ContinuingIndicatorBox displays a pulsing indicator when the AI response
 * is being continued after an interruption. This is a standalone component
 * used in ChatBody to show that content is being fetched.
 */
export const ContinuingIndicatorBox: React.FC = () => {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        'pb-1 mb-0.5'
      )}
    >
      {/* Header with pulsing status indicator */}
      <div
        className={cn(
          'pt-1 flex items-start justify-between w-full'
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-nowrap">
            {/* Pulsing status indicator */}
            <div
              className={cn(
                'relative w-4 h-4 shrink-0',
                'flex items-center justify-center mt-0.5'
              )}
              title="CONTINUING RESPONSE"
            >
              {/* Spinning ring */}
              <div
                className={cn(
                  'absolute w-4 h-4 rounded-full border-2',
                  'border-r-warn border-b-warn border-l-warn border-t-transparent',
                  'animate-[continuing-indicator-spin_1s_linear_infinite]',
                  'opacity-80'
                )}
              />
              {/* Center dot */}
              <div className="w-2 h-2 rounded-full bg-warn" />
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5 mt-0.5">
              <span
                className={cn(
                  'text-[11px] font-semibold tracking-[0.5px] uppercase text-warn'
                )}
              >
                CONTINUING RESPONSE
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Message block */}
      <div
        className={cn(
          'py-3 px-4 rounded-md ml-6',
          'border border-warn/30 bg-warn/5'
        )}
      >
        <span
          className={cn(
            'text-[11px] leading-relaxed block text-warn'
          )}
        >
          AI response was interrupted. Fetching the remaining content…
        </span>
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes continuing-indicator-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContinuingIndicatorBox;
