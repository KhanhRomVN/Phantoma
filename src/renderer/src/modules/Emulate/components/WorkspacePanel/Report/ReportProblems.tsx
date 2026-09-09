import React, { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { useDiagnostics } from '@renderer/shared/lsp/hooks/useDiagnostics';

/**
 * ------------------------------------------------------------------
 * ReportProblems
 * ------------------------------------------------------------------
 * Tab hiển thị diagnostics từ shared LSP cho các report files.
 * Nhóm theo severity (Errors, Warnings, Infos, Hints) và hiển thị
 * danh sách diagnostics tương ứng.
 * ------------------------------------------------------------------
 */

interface ReportProblemsProps {
  /** Các URI của report files đang mở — dùng để lọc diagnostics */
  reportFileUris?: string[];
}

const SEV_CONFIG = [
  { level: 1, label: 'Errors', icon: AlertCircle, textColor: 'text-error', bgColor: 'bg-error/10' },
  { level: 2, label: 'Warnings', icon: AlertTriangle, textColor: 'text-warn', bgColor: 'bg-warn/10' },
  { level: 3, label: 'Infos', icon: Info, textColor: 'text-info', bgColor: 'bg-info/10' },
  { level: 4, label: 'Hints', icon: Lightbulb, textColor: 'text-text-secondary', bgColor: 'bg-text-secondary/10' },
];

function getFileName(uri: string): string {
  try {
    const url = new URL(uri);
    return url.pathname.split('/').pop() || uri;
  } catch {
    return uri.split('/').pop() || uri;
  }
}

export const ReportProblems: React.FC<ReportProblemsProps> = ({ reportFileUris }) => {
  const { allDiagnostics } = useDiagnostics();

  const filteredDiagnostics = useMemo(() => {
    if (!reportFileUris || reportFileUris.length === 0) return allDiagnostics || [];
    const uriSet = new Set(reportFileUris);
    return (allDiagnostics || []).filter((d) => uriSet.has(d.uri));
  }, [allDiagnostics, reportFileUris]);

  if (filteredDiagnostics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <div className="text-center text-xs">
          Không có vấn đề nào cho report files
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {SEV_CONFIG.map((sevCfg) => {
        const items = filteredDiagnostics.filter((d) => d.severity === sevCfg.level);
        if (items.length === 0) return null;

        const Icon = sevCfg.icon;
        return (
          <div key={sevCfg.level} className="border-b border-border">
            <div className={cn('flex items-center gap-2 px-3 py-1.5 text-xs font-semibold', sevCfg.textColor)}>
              <Icon className="w-3.5 h-3.5" strokeWidth={2} />
              <span>{items.length}</span>
              <span>{sevCfg.label}</span>
            </div>
            {items.map((d, idx) => (
              <div key={idx} className="flex items-start gap-2 px-4 py-1.5 hover:bg-sidebar-item-hover cursor-pointer">
                <span className="text-[11px] text-text-primary flex-1 min-w-0 truncate">
                  {d.message}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-text-secondary">
                  {getFileName(d.uri)}:{d.range.start.line + 1}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default ReportProblems;