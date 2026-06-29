import React from 'react';
import { Loader2 } from 'lucide-react';

interface ConfirmDeleteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  title: string;
  count: number;
}

const ConfirmDeleteDrawer: React.FC<ConfirmDeleteDrawerProps> = ({
  open,
  onOpenChange,
  onConfirm,
  loading,
  title,
  count,
}) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] animate-[cdFadeIn_0.15s_ease]"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={() => !loading && onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 rounded-t-2xl z-[201] animate-[cdSlideUp_0.22s_ease]"
        style={{
          backgroundColor: 'var(--tertiary-bg)',
          borderTop: '1px solid var(--border-color)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
          padding: '0 0 max(20px, env(safe-area-inset-bottom)) 0',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1.5">
          <div
            className="w-8 h-[3px] rounded-[2px]"
            style={{ backgroundColor: 'var(--border-color)' }}
          />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 pt-1">
          {/* Icon + text row */}
          <div className="flex items-center gap-3 mb-3.5">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
              style={{
                backgroundColor:
                  'var(--vscode-inputValidation-errorBackground, rgba(239,68,68,0.1))',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--vscode-errorForeground)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-semibold mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: 'var(--primary-text)' }}
              >
                {title}
              </div>
              <div className="text-[11px] opacity-75" style={{ color: 'var(--secondary-text)' }}>
                {count > 1
                  ? `${count} accounts will be permanently removed.`
                  : 'This account will be permanently removed.'}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-opacity duration-150"
              style={{
                backgroundColor: 'rgba(128,128,128,0.1)',
                border: 'none',
                color: 'var(--secondary-text)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(128,128,128,0.1)';
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity duration-150"
              style={{
                backgroundColor:
                  'var(--vscode-inputValidation-errorBackground, rgba(239,68,68,0.15))',
                border: 'none',
                color: 'var(--vscode-errorForeground)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = loading ? '0.7' : '1';
              }}
            >
              {loading && <Loader2 size={12} style={{ animation: 'cdSpin 1s linear infinite' }} />}
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cdSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes cdFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cdSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default ConfirmDeleteDrawer;
