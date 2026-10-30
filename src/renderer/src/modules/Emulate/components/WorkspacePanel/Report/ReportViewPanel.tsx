/**
 * ------------------------------------------------------------------
 * ReportViewPanel
 * ------------------------------------------------------------------
 * Panel phải hiển thị nội dung markdown của report đã chọn bằng
 * MarkdownBlock. Hỗ trợ toggle giữa chế độ view (MarkdownBlock) và
 * edit (CodeBlock raw markdown). Khi edit, thay đổi được lưu xuống
 * backend.
 *
 * Props:
 * - report   : Report đang chọn (null nếu chưa chọn)
 * - targetId : ID target hiện tại
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import React, { useState } from 'react';

// ── UI ──
import { FileText, Eye, Pencil } from 'lucide-react';

// ── Components ──
import MarkdownBlock from '@renderer/components/common/MarkdownBlock';
import CodeBlock from '@renderer/components/common/CodeBlock';

// ── Types ──
import type { Report } from '../../../stores/reportStore';

// ── Stores ──
import { useReportStore } from '../../../stores/reportStore';

// ── Services ──
import { emulateApi } from '../../../services/emulate-api.service';

// ─── Types ──────────────────────────────────────────────────────────────
interface ReportViewPanelProps {
  report: Report | null;
  targetId?: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────
export const ReportViewPanel: React.FC<ReportViewPanelProps> = ({ report, targetId = null }) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const updateReport = useReportStore((s) => s.updateReport);

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
          <p className="text-sm">Select a report to view content</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="h-[37px] px-3 border-b border-divider flex items-center justify-between shrink-0 bg-muted/10">
        <span className="text-xs font-medium text-text-primary truncate min-w-0 flex-1">
          {report.title}
        </span>
        <button
          onClick={() => setMode(mode === 'view' ? 'edit' : 'view')}
          className="p-1 ml-2 shrink-0 rounded hover:bg-card-hover text-text-secondary hover:text-text-primary transition-colors"
          title={mode === 'view' ? 'Edit markdown' : 'View markdown'}
        >
          {mode === 'view' ? (
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
          ) : (
            <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'edit' ? (
          <CodeBlock
            code={report.content}
            language="markdown"
            showLineNumbers={true}
            onChange={(value) => {
              updateReport(report.id, value);
              if (targetId) {
                emulateApi.updateReport(targetId, report.id, { content: value }).catch((err) => {
                  console.error('[ReportViewPanel] Failed to update report:', err);
                });
              }
            }}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4 [&_.markdown-content-inline>:first-child]:!mt-0">
            <MarkdownBlock content={report.content} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportViewPanel;
