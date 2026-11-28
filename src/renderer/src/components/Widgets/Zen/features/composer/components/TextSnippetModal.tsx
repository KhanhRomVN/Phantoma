import React from 'react';
import { X } from 'lucide-react';
import ResponsiveModal from '../../../shared/components/ResponsiveModal';

interface TextSnippetModalProps {
  isOpen: boolean;
  content: string;
  title: string;
  onClose: () => void;
  snippetNumber?: number;
  lineCount?: number;
}

const TextSnippetModal: React.FC<TextSnippetModalProps> = ({
  isOpen,
  content,
  title,
  onClose,
  snippetNumber,
  lineCount,
}) => {
  const displayTitle =
    snippetNumber && lineCount ? `Snippet[${snippetNumber}] (${lineCount} lines)` : title;

  return (
    <ResponsiveModal isOpen={isOpen} onClose={onClose} sheetHeight="70%">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
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
            <h3 className="m-0 text-sm font-semibold text-text-primary">{displayTitle}</h3>
            <div className="text-[11px] text-text-secondary opacity-70">Large pasted text content</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-text-secondary hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <pre className="m-0 font-mono text-[11px] leading-relaxed text-text-primary whitespace-pre-wrap break-words">
          {content}
        </pre>
      </div>
    </ResponsiveModal>
  );
};

export default TextSnippetModal;