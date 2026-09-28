import React from 'react';

/**
 * ------------------------------------------------------------------
 * ReportProblems
 * ------------------------------------------------------------------
 * LSP/Diagnostics system removed — component kept as empty placeholder
 * to avoid breaking Emulate module imports.
 * ------------------------------------------------------------------
 */

interface ReportProblemsProps {
  reportFileUris?: string[];
}

export const ReportProblems: React.FC<ReportProblemsProps> = () => {
  return (
    <div className="flex-1 flex items-center justify-center text-text-secondary">
      <div className="text-center text-xs">
        Diagnostics unavailable (LSP removed)
      </div>
    </div>
  );
};

export default ReportProblems;