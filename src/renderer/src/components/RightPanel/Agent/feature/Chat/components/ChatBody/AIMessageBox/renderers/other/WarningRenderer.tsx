/**
 * ------------------------------------------------------------------
 * WarningRenderer
 * ------------------------------------------------------------------
 * Renderer cho block cảnh báo.
 * Hiển thị thông điệp cảnh báo với hiệu ứng nhấp nháy tùy chọn.
 *
 * Main features:
 * - TagHeader với warning color
 * - WarningBlock với message
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── Utils ──
import { $ } from '@renderer/utils/color';

// ── Components ──
import { TagHeader } from '../../TagHeader';

// ─── Types ──────────────────────────────────────────────────────────────
interface WarningRendererProps {
  label: string;
  message: string;
  warningColor?: string;
  isPulsing?: boolean;
}

interface WarningBlockProps {
  message: string;
  warningColor?: string;
}

/**
 * Renderer cho block cảnh báo
 * Hiển thị thông điệp cảnh báo với hiệu ứng nhấp nháy tùy chọn
 */
export const WarningRenderer: React.FC<WarningRendererProps> = ({
  label,
  message,
  warningColor = $('--warn'),
  isPulsing = false,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <TagHeader
        title={label}
        statusColor={warningColor}
        isPartial={isPulsing}
        statusTooltip="Warning"
      />
      <WarningBlock message={message} warningColor={warningColor} />
    </div>
  );
};

const WarningBlock: React.FC<WarningBlockProps> = ({
  message,
}) => {
  return (
    <div className="relative flex flex-col gap-1.5 pb-0">
      {/* Warning Message Block */}
      {message && (
        <div className="border border-warn/30 bg-warn/5 rounded-md px-4 py-3">
          <span className="text-warn text-[11px] leading-relaxed block">
            {message}
          </span>
        </div>
      )}
    </div>
  );
};
