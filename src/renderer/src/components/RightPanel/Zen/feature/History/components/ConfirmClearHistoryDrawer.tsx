/**
 * ------------------------------------------------------------------
 * ConfirmClearHistoryDrawer
 * ------------------------------------------------------------------
 * Bottom-sheet drawer xác nhận xóa toàn bộ lịch sử hội thoại.
 * Mapped from Zen to Phantoma (Tailwind + CSS Vars).
 * ------------------------------------------------------------------
 */

import React from "react";
import { Trash2 } from "lucide-react";
import { $ } from '@renderer/utils/color';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface ConfirmClearHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  totalCount?: number;
}

// ─── Component ──────────────────────────────────────────────────────────
const ConfirmClearHistoryDrawer: React.FC<ConfirmClearHistoryDrawerProps> = ({
  open,
  onOpenChange,
  onConfirm,
  totalCount,
}) => {
  if (!open) return null;

  const errorColor = $('--error');
  const secondaryText = $('--text-secondary');
  const primaryText = $('--text-primary');
  const cardBg = $('--card-background');
  const borderColor = $('--border');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[200] animate-fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[201] rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.25)] border-t animate-slide-up"
        style={{
          backgroundColor: cardBg,
          borderColor: borderColor,
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2.5">
          <div
            className="w-8 h-[3px] rounded-full"
            style={{ backgroundColor: borderColor }}
          />
        </div>

        {/* Content */}
        <div className="p-4 pb-6 flex flex-col items-center gap-2.5">
          {/* Badge icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${errorColor} 10%, transparent)` }}
          >
            <Trash2 size={20} color={errorColor} />
          </div>

          {/* Title */}
          <div
            className="text-[15px] font-bold text-center"
            style={{ color: primaryText }}
          >
            Clear All History?
          </div>

          {/* Description */}
          <div
            className="text-xs opacity-80 text-center leading-relaxed max-w-[280px]"
            style={{ color: secondaryText }}
          >
            {totalCount !== undefined && totalCount > 0 ? (
              <span>
                This will permanently delete{" "}
                <strong style={{ color: primaryText }}>
                  {totalCount} conversation{totalCount > 1 ? "s" : ""}
                </strong>
                . This action cannot be undone.
              </span>
            ) : (
              <span>
                This will permanently delete all saved conversations. This action cannot be undone.
              </span>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 w-full mt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 py-2.5 px-4 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:brightness-110"
              style={{
                backgroundColor: `color-mix(in srgb, ${secondaryText} 8%, transparent)`,
                color: secondaryText,
                border: 'none'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-colors hover:brightness-110 flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: `color-mix(in srgb, ${errorColor} 12%, transparent)`,
                color: errorColor,
                border: 'none'
              }}
            >
              <Trash2 size={12} />
              Delete All
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.22s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.15s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default ConfirmClearHistoryDrawer;