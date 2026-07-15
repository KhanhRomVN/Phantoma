import React from 'react';

const ChatBodySkeleton: React.FC = () => {
  return (
    <div className="chat-body-skeleton-scroll flex-1 overflow-y-hidden overflow-x-hidden flex flex-col p-6 pl-3 pb-[200px] gap-4 text-sm bg-secondary-bg">
      {[1, 2, 3, 4, 5].map((i) => (
        <React.Fragment key={i}>
          {/* User Message */}
          <div
            className="flex flex-col gap-2"
            style={{
              animation: 'skeleton-pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <div className="h-[60px] bg-input-background rounded-lg border border-border" />
          </div>

          {/* Assistant Message */}
          <div
            className="flex flex-col gap-2"
            style={{
              animation: 'skeleton-pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.1 + 0.15}s`,
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-20 h-4 bg-input-background rounded" />
              <div className="w-30 h-4 bg-input-background rounded" />
            </div>

            <div className="flex flex-col gap-1.5 p-3 bg-card-background rounded-lg border border-border">
              <div className="w-full h-3.5 bg-input-background rounded" />
              <div className="w-[95%] h-3.5 bg-input-background rounded" />
              <div className="w-[85%] h-3.5 bg-input-background rounded" />
              <div className="w-[90%] h-3.5 bg-input-background rounded" />
            </div>

            {i === 2 && (
              <div className="flex gap-2 p-3 bg-card-background rounded-lg border border-border">
                <div className="w-6 h-6 bg-input-background rounded" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="w-[150px] h-3.5 bg-input-background rounded" />
                  <div className="w-[80%] h-3 bg-input-background rounded" />
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