/**
 * ------------------------------------------------------------------
 * ReportPanel
 * ------------------------------------------------------------------
 * Panel chính hiển thị danh sách report (trái) và nội dung markdown
 * hoặc code file (phải). Dùng ResizableSplit để có thể kéo thay đổi
 * kích thước.
 *
 * Dữ liệu được load từ backend API thông qua useReportStore.
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useEffect, useCallback, useState } from 'react';

// ── UI ──
import { ResizableSplit } from '@renderer/components/ui/ResizableSplit/ResizableSplit';

// ── Components ──
import { ReportListPanel } from './ReportListPanel';
import { ReportViewPanel } from './ReportViewPanel';

// ── Stores ──
import { useReportStore } from '../../../stores/reportStore';

// ── Services ──
import { reportFileService } from '../../../services/report-file.service';

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

  const [fileContent, setFileContent] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);

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

  useEffect(() => {
    setFileContent(null);
    setActiveFileName(null);
  }, [selectedReportId]);

  const selectedReport = reports.find((r) => r.id === selectedReportId) || null;

  const handleSelectFile = async (fileName: string) => {
    if (fileName === 'report.md') {
      setFileContent(null);
      setActiveFileName('report.md');
      return;
    }
    if (!targetId || !selectedReportId) return;
    try {
      const content = await reportFileService.readFile(targetId, selectedReportId, fileName);
      setFileContent(content);
      setActiveFileName(fileName);
    } catch (error) {
      console.error('[ReportPanel] Failed to read file:', error);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <ResizableSplit direction="horizontal" initialSize={30} minSize={15} maxSize={50}>
        <ReportListPanel
          reports={reports}
          selectedReportId={selectedReportId}
          onSelectReport={setSelectedReportId}
          targetId={targetId}
          onSelectFile={handleSelectFile}
        />
        <ReportViewPanel
          report={selectedReport}
          fileContent={fileContent}
          fileName={activeFileName}
          targetId={targetId}
        />
      </ResizableSplit>
    </div>
  );
};

export default ReportPanel;