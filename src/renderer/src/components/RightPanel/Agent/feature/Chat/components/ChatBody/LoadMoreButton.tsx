import React from 'react';

interface LoadMoreButtonProps {
  hiddenCount: number;
  onLoadMore: () => void;
  onLoadAll: () => void;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  hiddenCount,
  onLoadMore,
  onLoadAll,
}) => {
  if (hiddenCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-5 border-b border-border mb-4">
      <div className="text-xs text-text-secondary text-center">
        {hiddenCount} earlier message{hiddenCount > 1 ? 's' : ''} hidden
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={onLoadMore}
          className="bg-primary text-white border-none py-1.5 px-3.5 rounded cursor-pointer text-xs font-medium flex items-center gap-1.5 transition-all duration-200"
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3L8 13M8 3L4 7M8 3L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Load More (10)
        </button>

        {hiddenCount > 10 && (
          <button
            onClick={onLoadAll}
            className="bg-transparent text-primary border border-primary py-1.5 px-3.5 rounded cursor-pointer text-xs font-medium flex items-center gap-1.5 transition-all duration-200"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, rgb(10, 132, 255) 10%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2L8 14M8 2L4 6M8 2L12 6M4 10L8 14M12 10L8 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Load All ({hiddenCount})
          </button>
        )}
      </div>
    </div>
  );
};