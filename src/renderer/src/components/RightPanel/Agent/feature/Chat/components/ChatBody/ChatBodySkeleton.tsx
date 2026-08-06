import React from 'react';
import { cn } from '@renderer/shared/utils/cn';

const ChatBodySkeleton: React.FC = () => {
  return (
    <div
      className={cn('flex-1 overflow-hidden flex flex-col gap-4 text-sm', 'p-6 pl-3 pb-[200px]')}
    >
      {/* User Message Skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <React.Fragment key={i}>
          {/* User Message */}
          <div
            className="flex flex-col gap-2 animate-[skeleton-pulse_1.5s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="h-[60px] bg-input-background rounded-lg border border-border" />
          </div>

          {/* Assistant Message */}
          <div
            className="flex flex-col gap-2 animate-[skeleton-pulse_1.5s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.1 + 0.15}s` }}
          >
            {/* Message Header */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-4 bg-input-background rounded" />
              <div className="w-[120px] h-4 bg-input-background rounded" />
            </div>

            {/* Message Content Lines */}
            <div className="flex flex-col gap-1.5 p-3 bg-card-background rounded-lg border border-border">
              <div className="w-full h-3.5 bg-input-background rounded" />
              <div className="w-[95%] h-3.5 bg-input-background rounded" />
              <div className="w-[85%] h-3.5 bg-input-background rounded" />
              <div className="w-[90%] h-3.5 bg-input-background rounded" />
            </div>

            {/* Tool Action Skeleton */}
            {i === 2 && (
              <div className="flex gap-2 p-3 bg-card-background rounded-lg border border-border">
                <div className="w-6 h-6 bg-input-background rounded" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="w-[150px] h-3.5 bg-input-background rounded" />
                  <div className="w-4/5 h-3 bg-input-background rounded" />
                </div>
              </div>
            )}
          </div>
        </React.Fragment>
      ))}

      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ChatBodySkeleton;
