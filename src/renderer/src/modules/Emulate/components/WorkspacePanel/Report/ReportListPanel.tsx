/**
 * ------------------------------------------------------------------
 * ReportListPanel
 * ------------------------------------------------------------------
 * Panel trái hiển thị danh sách ReportCard cùng nút tạo New Report
 * và thanh search. Click vào card chỉ đánh dấu report được chọn,
 * nội dung hiển thị ở ReportViewPanel.
 *
 * Props:
 * - reports          : Danh sách report
 * - selectedReportId : ID report đang chọn
 * - onSelectReport   : Callback khi click chọn report
 * - targetId         : ID target hiện tại
 * ------------------------------------------------------------------
 */

// ── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState, useMemo } from 'react';

// ── UI ──
import { Plus, Search } from 'lucide-react';

// ── Components ──
import { ReportCard } from './ReportCard';

// ── Stores ──
import { useReportStore } from '../../../stores/reportStore';

// ── Services ──
import { emulateApi } from '../../../services/emulate-api.service';

// ── Types ──
import type { Report } from '../../../stores/reportStore';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Types ──────────────────────────────────────────────────────────────
interface ReportListPanelProps {
  reports: Report[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  targetId: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ReportListPanel: React.FC<ReportListPanelProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  targetId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const createReport = useReportStore((s) => s.createReport);
  const deleteReport = useReportStore((s) => s.deleteReport);

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const q = searchTerm.toLowerCase();
    return reports.filter(
      (r) => r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q),
    );
  }, [reports, searchTerm]);

  /** Tạo title "Untitled <n>" với n nhỏ nhất chưa tồn tại trong danh sách. */
  const generateUntitledTitle = (existingTitles: string[]): string => {
    const existing = new Set(existingTitles);
    let n = 1;
    while (existing.has(`Untitled ${n}`)) n++;
    return `Untitled ${n}`;
  };

  const handleCreateReport = async () => {
    if (!targetId) {
      console.warn('[ReportListPanel] Cannot create report — targetId is null');
      return;
    }

    const title = generateUntitledTitle(reports.map((r) => r.title));
    const content = `# ${title}\n\n## Summary\n\n`;
    try {
      const report = await createReport(targetId, content, title);
      onSelectReport(report.id);
    } catch (error) {
      console.error('[ReportListPanel] Failed to create report:', error);
      alert(
        'Failed to create report: ' + (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (targetId) {
      const res = await emulateApi.deleteReport(targetId, id);
      if (!res.success || !res.data?.deleted) {
        console.error('[ReportListPanel] Failed to delete report:', res.error);
        alert('Failed to delete report: ' + (res.error || 'Unknown error'));
        return;
      }
    }
    deleteReport(id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('report-updated'));
    }
  };

  return (
    <div className="h-full bg-background border-r border-border/50 flex flex-col">
      {/* Search bar */}
      <div className="p-0 border-b border-border shrink-0">
        <div className="relative flex items-center w-full h-9 bg-input-background rounded-md">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-full pl-9 pr-3 bg-transparent text-sm text-foreground placeholder:text-text-secondary outline-none rounded-md"
          />
        </div>
      </div>

      {/* Report list */}
      <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 p-3">
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
              <span className="text-sm font-bold text-foreground/90 leading-tight">New Report</span>
              <span className="text-[10px] text-text-secondary truncate">
                Create a new markdown report
              </span>
            </div>
          </button>

          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isSelected={report.id === selectedReportId}
              onClick={onSelectReport}
              onDelete={handleDeleteReport}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportListPanel;