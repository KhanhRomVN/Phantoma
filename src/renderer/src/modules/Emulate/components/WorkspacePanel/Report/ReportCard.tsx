/**
 * ------------------------------------------------------------------
 * ReportCard
 * ------------------------------------------------------------------
 * Card hiển thị một report trong danh sách panel trái.
 * Title lấy từ dòng đầu tiên của nội dung markdown, dòng thứ hai
 * hiển thị tổng số file và danh sách icon theo loại file.
 *
 * Props:
 * - report        : Dữ liệu report
 * - isSelected    : Trạng thái selected
 * - onClick       : Callback khi click chọn
 * - onDelete      : Callback khi xóa
 * - targetId      : ID của target hiện tại
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useEffect } from 'react';

// ── UI ──
import { Trash2, Copy, FileCode, FolderOpen } from 'lucide-react';

// ── UI Components ──
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
} from '@renderer/components/ui/Dropdown';

// ── Types ──
import type { Report } from '../../../stores/reportStore';

// ── Services ──
import { reportFileService } from '../../../services/report-file.service';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ─── Types ──────────────────────────────────────────────────────────────
interface ReportCardProps {
  report: Report;
  isSelected: boolean;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
  targetId: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ReportCard: React.FC<ReportCardProps> = ({
  report,
  isSelected,
  onClick,
  onDelete,
  targetId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    setExpanded(isSelected);
  }, [isSelected]);

  useEffect(() => {
    if (!targetId) {
      setFiles([]);
      return;
    }
    reportFileService
      .listFiles(targetId, report.id)
      .then((entries) => setFiles(entries.map((e) => e.name)))
      .catch(() => setFiles([]));
  }, [report.id, targetId]);

  const uniqueIcons = [...new Set(files.map((fileName) => getFileIconPath(fileName)))];

  return (
    <div
      className="flex flex-col gap-1"
      onContextMenu={(e) => e.stopPropagation()}
    >
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
            {/* Title */}
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium truncate flex-1">{report.title}</span>
            </div>

            {/* File count + icons */}
            {!expanded && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-text-secondary opacity-60 leading-snug">
                  {files.length} files
                </span>
                <span className="text-text-secondary opacity-60">|</span>
                <div className="flex items-center gap-0.5">
                  {uniqueIcons.map((iconSrc, idx) => (
                    <img key={idx} src={iconSrc} alt="" className="w-3.5 h-3.5 shrink-0" />
                  ))}
                </div>
              </div>
            )}
          </button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem
            onClick={() => {
              if (targetId) {
                reportFileService.openFolder(targetId, report.id).catch(() => {});
              }
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open folder
          </DropdownItem>
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

      {/* Expanded file list */}
      {expanded && (
        <div className="pl-8 pr-2 pb-1 flex flex-col gap-0.5">
          {files.length === 0 ? (
            <span className="text-[11px] text-text-secondary opacity-50 italic">
              No code files
            </span>
          ) : (
            files.map((fileName) => (
              <div
                key={fileName}
                className="flex items-center gap-2 text-[11px] text-text-secondary hover:text-text-primary cursor-default"
              >
                <FileCode className="w-3 h-3 opacity-50" strokeWidth={1.5} />
                <span className="truncate">{fileName}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ReportCard;