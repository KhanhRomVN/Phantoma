import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface TextSnippetDrawerProps {
  isOpen: boolean;
  content: string;
  title: string;
  onClose: () => void;
  snippetNumber?: number;
  lineCount?: number;
}

const TextSnippetDrawer: React.FC<TextSnippetDrawerProps> = ({
  isOpen,
  content,
  title,
  onClose,
  snippetNumber,
  lineCount,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  const displayTitle =
    snippetNumber && lineCount
      ? `Snippet[${snippetNumber}] (${lineCount} lines)`
      : title;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[99998] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 max-h-[70vh] bg-card-background rounded-t-3xl shadow-[0_-4px_12px_rgba(0,0,0,0.3)] z-[99999] flex flex-col animate-slide-up"
      >
        {/* Drag Handle Area (Optional visual flair from original) */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-500/50 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card-background">
          <div className="flex items-center gap-3">
            {/* Icon Container */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-500/10 border border-border">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-secondary"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>

            <div className="flex flex-col gap-0.5">
              <h3 className="m-0 text-sm font-semibold text-text-primary">
                {displayTitle}
              </h3>
              <div className="text-[11px] text-text-secondary opacity-70">
                Large pasted text content
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="m-0 font-mono text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap break-words">
            {content}
          </pre>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </>
  );

  return createPortal(drawerContent, document.body);
};

export default TextSnippetDrawer;