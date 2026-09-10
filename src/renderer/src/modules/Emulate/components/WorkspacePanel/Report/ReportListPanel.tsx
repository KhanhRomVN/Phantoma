/**
 * ------------------------------------------------------------------
 * ReportListPanel
 * ------------------------------------------------------------------
 * Panel trái hiển thị 2 view độc lập:
 * 1. List report: danh sách ReportCard + nút tạo New Report.
 * 2. File list: khi đang chọn một report, hiển thị mục report.md
 *    ở đầu danh sách cùng các file code của report.
 *
 * File-view có search bar, right-click vùng trống mở menu New File,
 * right-click lên file mở menu Copy/Cut/Rename/Delete.
 * Left-click file sẽ mở nội dung code ở ReportViewPanel.
 *
 * Props:
 * - reports        : Danh sách report
 * - selectedReportId : ID report đang chọn
 * - onSelectReport : Callback khi click chọn report
 * - onSelectFile   : Callback khi click chọn file code
 * ------------------------------------------------------------------
 */

// ── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useMemo, useEffect } from 'react';

// ── UI ──
import {
  FileText,
  Plus,
  Search,
  ArrowLeft,
  Copy,
  Scissors,
  Pencil,
  Trash2,
} from 'lucide-react';

// ── UI Components ──
import { Kbd } from '@renderer/components/ui/Kbd';

// ── Components ──
import { ReportCard } from './ReportCard';

// ── Stores ──
import { useReportStore } from '../../../stores/reportStore';

// ── Services ──
import { emulateApi } from '../../../services/emulate-api.service';
import { reportFileService, getReportCodeDir } from '../../../services/report-file.service';

// ── Types ──
import type { Report } from '../../../stores/reportStore';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';
import { logger } from '@renderer/utils/logger';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';

// ─── Types ──────────────────────────────────────────────────────────────
interface ReportListPanelProps {
  reports: Report[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  targetId: string | null;
  onSelectFile?: (fileName: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ReportListPanel: React.FC<ReportListPanelProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  targetId,
  onSelectFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileSearchTerm, setFileSearchTerm] = useState('');
  const createReport = useReportStore((s) => s.createReport);
  const deleteReport = useReportStore((s) => s.deleteReport);
  const setSelectedReportId = useReportStore((s) => s.setSelectedReportId);

  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [isCreatingCodeFile, setIsCreatingCodeFile] = useState(false);
  const [newCodeFileName, setNewCodeFileName] = useState('');
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [fileItemMenu, setFileItemMenu] = useState<{
    x: number;
    y: number;
    fileName: string;
  } | null>(null);

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const q = searchTerm.toLowerCase();
    return reports.filter(
      (r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q),
    );
  }, [reports, searchTerm]);

  const activeReport = selectedReportId
    ? reports.find((r) => r.id === selectedReportId) || null
    : null;
  const visibleReports = activeReport ? [] : filteredReports;

  const loadActiveFiles = async () => {
    if (!activeReport || !targetId) {
      setActiveFiles([]);
      return;
    }
    try {
      const entries = await reportFileService.listFiles(targetId, activeReport.id);
      setActiveFiles(entries.map((e) => e.name));
    } catch {
      setActiveFiles([]);
    }
  };

  useEffect(() => {
    loadActiveFiles();
  }, [activeReport, targetId]);

  const filteredActiveFiles = useMemo(() => {
    const allFiles = ['report.md', ...activeFiles];
    if (!fileSearchTerm.trim()) return allFiles;
    const q = fileSearchTerm.toLowerCase();
    return allFiles.filter((f) => f.toLowerCase().includes(q));
  }, [activeFiles, fileSearchTerm]);

  const handleFileContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setFileContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeFileContextMenu = () => setFileContextMenu(null);

  const handleFileItemContextMenu = (e: React.MouseEvent, fileName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFileItemMenu({ x: e.clientX, y: e.clientY, fileName });
  };

  const closeFileItemMenu = () => setFileItemMenu(null);

  /** Tạo title "Untitled <n>" với n nhỏ nhất chưa tồn tại trong danh sách. */
  const generateUntitledTitle = (existingTitles: string[]): string => {
    const existing = new Set(existingTitles);
    let n = 1;
    while (existing.has(`Untitled ${n}`)) n++;
    return `Untitled ${n}`;
  };

  const handleCreateReport = async () => {
    if (!targetId) {
      logger.warn('[ReportListPanel] Cannot create report — targetId is null');
      return;
    }

    const title = generateUntitledTitle(reports.map((r) => r.title));
    const content = `# ${title}\n\n## Summary\n\n`;
    try {
      await createReport(targetId, content, title);
    } catch (error) {
      logger.error('[ReportListPanel] Failed to create report:', error);
      alert('Failed to create report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const submitNewCodeFile = async () => {
    if (!activeReport || !targetId) {
      setIsCreatingCodeFile(false);
      setNewCodeFileName('');
      return;
    }
    const name = newCodeFileName.trim();
    if (!name) {
      setIsCreatingCodeFile(false);
      setNewCodeFileName('');
      return;
    }

    try {
      await reportFileService.writeFile(targetId, activeReport.id, name, '');
      await loadActiveFiles();
    } catch (error) {
      logger.error('[ReportListPanel] Failed to create code file:', error);
      alert('Failed to create file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreatingCodeFile(false);
      setNewCodeFileName('');
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (targetId) {
      const res = await emulateApi.deleteReport(targetId, id);
      if (!res.success || !res.data?.deleted) {
        logger.error('[ReportListPanel] Failed to delete report:', res.error);
        alert('Failed to delete report: ' + (res.error || 'Unknown error'));
        return;
      }
    }
    deleteReport(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('report-updated'));
    }
  };

  const handleCopyFileName = () => {
    if (fileItemMenu) {
      navigator.clipboard.writeText(fileItemMenu.fileName).catch(() => {});
    }
    closeFileItemMenu();
  };

  const handleCutFileName = () => {
    if (fileItemMenu) {
      navigator.clipboard.writeText(fileItemMenu.fileName).catch(() => {});
    }
    closeFileItemMenu();
  };

  const handleRenameFile = async () => {
    if (!fileItemMenu || !activeReport || !targetId) return;
    const newName = window.prompt('Tên mới:', fileItemMenu.fileName);
    if (!newName || newName === fileItemMenu.fileName) {
      closeFileItemMenu();
      return;
    }
    try {
      const dir = await getReportCodeDir(targetId, activeReport.id);
      const oldPath = `${dir}/${fileItemMenu.fileName}`;
      const newPath = `${dir}/${newName}`;
      await window.api.invoke('fs:rename', { oldPath, newPath });
      await loadActiveFiles();
    } catch (error) {
      logger.error('[ReportListPanel] Failed to rename file:', error);
      alert('Failed to rename file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      closeFileItemMenu();
    }
  };

  const handleDeleteFile = async () => {
    if (!fileItemMenu || !activeReport || !targetId) return;
    try {
      await reportFileService.deleteFile(targetId, activeReport.id, fileItemMenu.fileName);
      await loadActiveFiles();
    } catch (error) {
      logger.error('[ReportListPanel] Failed to delete file:', error);
      alert('Failed to delete file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      closeFileItemMenu();
    }
  };

  return (
    <div className="h-full bg-background border-r border-border/50 flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between h-10 px-2 border-b border-divider flex-shrink-0 bg-sidebar-background">
        <div className="flex items-center gap-2 min-w-0">
          {activeReport ? (
            <button
              onClick={() => setSelectedReportId(null)}
              className="p-0.5 rounded hover:bg-card-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
              aria-label="Back to reports"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
          ) : (
            <FileText className="w-4 h-4 shrink-0 text-text-secondary" strokeWidth={1.5} />
          )}
          <span className="text-[13px] text-text-secondary truncate">
            {activeReport ? activeReport.title : 'Reports'}
          </span>
        </div>
      </div>

      {/* Search bar — hiển thị ở cả hai view */}
      <div className="p-0 border-b border-border shrink-0">
        <div className="relative flex items-center w-full h-9 bg-input-background rounded-md">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search files..."
            value={activeReport ? fileSearchTerm : searchTerm}
            onChange={(e) => {
              if (activeReport) {
                setFileSearchTerm(e.target.value);
              } else {
                setSearchTerm(e.target.value);
              }
            }}
            className="w-full h-full pl-9 pr-3 bg-transparent text-sm text-foreground placeholder:text-text-secondary outline-none rounded-md"
          />
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar"
        onContextMenu={activeReport ? handleFileContextMenu : undefined}
      >
        {activeReport ? (
          /* View 2: report.md + file list */
          <div className="flex flex-col gap-0.5">
            {isCreatingCodeFile && (
              <div className="flex items-center gap-2 bg-card-background border border-dashed border-primary/30 rounded-md px-3 py-2">
                <FileText className="w-4 h-4 shrink-0 text-text-secondary" strokeWidth={1.5} />
                <input
                  autoFocus
                  value={newCodeFileName}
                  onChange={(e) => setNewCodeFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewCodeFile();
                    if (e.key === 'Escape') {
                      setIsCreatingCodeFile(false);
                      setNewCodeFileName('');
                    }
                  }}
                  onBlur={submitNewCodeFile}
                  placeholder="Tên file (html/css/js)..."
                  className="flex-1 bg-input-background text-[13px] text-text-primary outline-none border border-primary/50 rounded px-1.5 py-0.5"
                />
              </div>
            )}

            {filteredActiveFiles.map((fileName) => (
              <div
                key={fileName}
                className="flex items-center gap-2 text-sm text-text-primary hover:bg-card-hover pl-3 pr-2 py-1.5 transition-colors cursor-pointer"
                onClick={() => onSelectFile?.(fileName)}
                onContextMenu={
                  fileName === 'report.md'
                    ? undefined
                    : (e) => handleFileItemContextMenu(e, fileName)
                }
              >
                <img
                  src={getFileIconPath(fileName)}
                  alt=""
                  className="w-4 h-4 shrink-0"
                />
                <span className="truncate">{fileName}</span>
              </div>
            ))}
          </div>
        ) : (
          /* View 1: list-report + New Report */
          <div className="grid grid-cols-1 gap-3 p-3">
            <button
              onClick={() => handleCreateReport()}
              className={cn(
                'group relative bg-card-background border border-dashed p-3 transition-all duration-300 cursor-pointer flex items-center gap-3',
                'border-primary/30 hover:border-primary/60',
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm font-bold text-foreground/90 leading-tight">
                  New Report
                </span>
                <span className="text-[10px] text-text-secondary truncate">
                  Create a new markdown report
                </span>
              </div>
            </button>

            {visibleReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isSelected={report.id === selectedReportId}
                onClick={onSelectReport}
                onDelete={handleDeleteReport}
                targetId={targetId}
              />
            ))}
          </div>
        )}
      </div>

      {/* File-view blank context menu */}
      {fileContextMenu && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeFileContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeFileContextMenu();
            }}
          />
          <div
            className="fixed z-[9999] bg-background border border-border rounded-lg shadow-primary min-w-[200px] overflow-hidden"
            style={{ top: fileContextMenu.y, left: fileContextMenu.x }}
          >
            <button
              onClick={() => {
                closeFileContextMenu();
                setIsCreatingCodeFile(true);
                setNewCodeFileName('');
              }}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-[13px] text-text-primary hover:bg-card-hover transition-colors text-left"
            >
              <Plus className="w-3.5 h-3.5" />
              New File
            </button>
          </div>
        </>
      )}

      {/* File item context menu */}
      {fileItemMenu && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeFileItemMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeFileItemMenu();
            }}
          />
          <div
            className="fixed z-[9999] bg-background border border-border rounded-lg shadow-primary min-w-[200px] overflow-hidden"
            style={{ top: fileItemMenu.y, left: fileItemMenu.x }}
          >
            <button
              onClick={handleCopyFileName}
              className="flex items-center justify-between gap-4 w-full px-3 py-1.5 text-[13px] text-text-primary hover:bg-card-hover transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Copy className="w-3.5 h-3.5" />
                Copy
              </span>
              <Kbd>Ctrl+C</Kbd>
            </button>
            <button
              onClick={handleCutFileName}
              className="flex items-center justify-between gap-4 w-full px-3 py-1.5 text-[13px] text-text-primary hover:bg-card-hover transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Scissors className="w-3.5 h-3.5" />
                Cut
              </span>
              <Kbd>Ctrl+X</Kbd>
            </button>
            <button
              onClick={handleRenameFile}
              className="flex items-center justify-between gap-4 w-full px-3 py-1.5 text-[13px] text-text-primary hover:bg-card-hover transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </span>
              <Kbd>F2</Kbd>
            </button>
            <button
              onClick={handleDeleteFile}
              className="flex items-center justify-between gap-4 w-full px-3 py-1.5 text-[13px] text-error hover:bg-error/10 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </span>
              <Kbd>Del</Kbd>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportListPanel;