/**
 * ------------------------------------------------------------------
 * ReportPanel
 * ------------------------------------------------------------------
 * Panel chính hiển thị danh sách report (trái) và nội dung markdown
 * của report đang chọn (phải). Mỗi report chỉ là một file markdown.
 * Dùng ResizableSplit để có thể kéo thay đổi kích thước.
 *
 * Dữ liệu được load từ backend API thông qua useReportStore.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useEffect, useCallback } from 'react';

// ── UI ──
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit/ResizableSplit';

// ── Components ──
import { ReportListPanel } from './ReportListPanel';
import { ReportViewPanel } from './ReportViewPanel';

// ── Stores ──
import { useReportStore } from '../../../stores/reportStore';

// ─── Types ──────────────────────────────────────────────────────────────
interface ReportPanelProps {
  targetId: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ReportPanel: React.FC<ReportPanelProps> = ({ targetId }) => {
  const reports = useReportStore((s) => s.reports);
  const selectedReportId = useReportStore((s) => s.selectedReportId);
  const setSelectedReportId = useReportStore((s) => s.setSelectedReportId);
  const loadReports = useReportStore((s) => s.loadReports);

  const reload = useCallback(() => {
    if (targetId) {
      loadReports(targetId);
    }
  }, [targetId, loadReports]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const handleReportUpdated = () => reload();
    window.addEventListener('report-updated', handleReportUpdated);
    return () => window.removeEventListener('report-updated', handleReportUpdated);
  }, [reload]);

  const selectedReport = reports.find((r) => r.id === selectedReportId) || null;

  return (
    <div className="flex h-full w-full flex-col">
      <ResizableSplit direction="horizontal" initialSize={30} minSize={15} maxSize={50}>
        <ReportListPanel
          reports={reports}
          selectedReportId={selectedReportId}
          onSelectReport={setSelectedReportId}
          targetId={targetId}
        />
        <ReportViewPanel report={selectedReport} targetId={targetId} />
      </ResizableSplit>
    </div>
  );
};

export default ReportPanel;