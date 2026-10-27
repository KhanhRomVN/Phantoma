/**
 * ------------------------------------------------------------------
 * ReportCard
 * ------------------------------------------------------------------
 * Card hiển thị một report (file markdown) trong danh sách panel trái.
 * Hiển thị title và thời gian cập nhật. Click chỉ đánh dấu selected.
 * Right-click mở menu Copy / Delete.
 *
 * Props:
 * - report        : Dữ liệu report
 * - isSelected    : Trạng thái selected
 * - onClick       : Callback khi click chọn
 * - onDelete      : Callback khi xóa
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React from 'react';

// ── UI ──
import { Trash2, Copy } from 'lucide-react';

// ── UI Components ──
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';

// ── Types ──
import type { Report } from '../../../stores/reportStore';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────
interface ReportCardProps {
  report: Report;
  isSelected: boolean;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  isSelected,
  onClick,
  onDelete,
}) => {
  // ASSUMED: Report chưa có field mô tả riêng — lấy dòng nội dung đầu tiên sau title làm descText
  const descText =
    report.content
      .split('\n')
      .slice(1)
      .map((line) => line.replace(/^\s*(#{1,6}|[-*>]|\d+\.)\s*/, '').trim())
      .find((line) => line.length > 0) || '';

  return (
    <div className="flex flex-col gap-1 min-w-0" onContextMenu={(e) => e.stopPropagation()}>
      <Dropdown trigger="contextmenu">
        <DropdownTrigger asChild>
          <button
            onClick={() => onClick(report.id)}
            className={cn(
              'flex flex-col gap-1 w-full px-3 py-2.5 text-left rounded-md transition-colors border border-transparent',
              isSelected
                ? 'bg-card-hover border-border text-text-primary'
                : 'hover:bg-card-hover hover:text-text-primary text-text-secondary',
            )}
          >
            <span className="text-[13px] font-medium truncate">{report.title}</span>
            {descText && (
              <span className="text-[11px] text-text-secondary opacity-60 leading-snug truncate">
                {descText}
              </span>
            )}
          </button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem
            onClick={() => {
              navigator.clipboard.writeText(report.content).catch(() => {});
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </DropdownItem>
          {onDelete && (
            <DropdownItem
              className="text-error focus:text-error focus:bg-error/10"
              onClick={() => onDelete(report.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownItem>
          )}
        </DropdownContent>
      </Dropdown>
    </div>
  );
};

export default ReportCard;