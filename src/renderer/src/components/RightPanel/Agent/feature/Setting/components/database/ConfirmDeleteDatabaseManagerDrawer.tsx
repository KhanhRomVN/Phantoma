/**
 * ------------------------------------------------------------------
 * ConfirmDeleteDatabaseManagerDrawer
 * ------------------------------------------------------------------
 * Bottom-sheet drawer xác nhận xóa một database manager.
 * Tham khảo UI của ConfirmDeleteAccountDrawer.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { $ } from '@renderer/utils/color';

interface ConfirmDeleteDatabaseManagerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  /** Tên manager sẽ xóa, hiển thị trong nội dung xác nhận */
  managerName?: string;
}

const ConfirmDeleteDatabaseManagerDrawer: React.FC<
  ConfirmDeleteDatabaseManagerDrawerProps
> = ({ open, onOpenChange, onConfirm, loading, managerName }) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[200] animate-fadeIn"
        onClick={() => !loading && onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-tertiary-bg border-t border-border rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.25)] z-[201] animate-slideUp p-0"
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-2.5 pb-1.5"
        >
          <div
            className="w-8 h-[3px] rounded-sm bg-border"
          />
        </div>

        {/* Content */}
        <div
          className="px-4 py-3 pb-4 flex flex-col items-center gap-2.5"
        >
          {/* Badge icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${$('--error')} 10%, transparent)` }}
          >
            <Trash2 size={20} color={$('--error')} />
          </div>

          {/* Title */}
          <div
            className="text-[15px] font-bold text-text-primary text-center"
          >
            Delete Database Manager?
          </div>

          {/* Info */}
          <div
            className="text-xs text-text-secondary opacity-80 text-center leading-normal"
          >
            Do you want to permanently delete{' '}
            {managerName && (
              <strong
                className="text-text-primary font-semibold"
              >
                {managerName}
              </strong>
            )}
            ? This action cannot be undone.
          </div>

          {/* Buttons */}
          <div
            className="flex gap-2 w-full mt-1"
          >
            <button
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-gray-500/8 border-none text-text-secondary text-xs font-medium cursor-pointer whitespace-nowrap hover:bg-gray-500/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-red-500/12 border-none text-red-500 text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap hover:bg-red-500/20 transition-colors disabled:opacity-70 disabled:cursor-wait"
            >
              {loading && (
                <Loader2
                  size={12}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
              )}
              {loading ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slideUp { animation: slideUp 0.22s ease; }
        .animate-fadeIn { animation: fadeIn 0.15s ease; }
      `}</style>
    </>
  );
};

export default ConfirmDeleteDatabaseManagerDrawer;