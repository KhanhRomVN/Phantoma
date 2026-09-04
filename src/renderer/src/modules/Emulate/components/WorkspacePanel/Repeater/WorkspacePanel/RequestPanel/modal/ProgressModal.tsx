import { X, Square } from 'lucide-react';

// ── Types ──
import type { RunResult } from '../../../../../../types/repeater.types';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

interface ProgressModalProps {
  isOpen: boolean;
  totalRequests: number;
  results: RunResult[];
  currentProgress: number;
  currentLabel: string;
  onCancel: () => void;
  onClose: () => void;
}

export function ProgressModal({
  isOpen,
  totalRequests,
  results,
  currentProgress,
  currentLabel,
  onCancel,
  onClose,
}: ProgressModalProps) {
  if (!isOpen) return null;

  const progressPercent =
    totalRequests > 0 ? Math.round((currentProgress / totalRequests) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-2xl w-[1000px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-medium text-text-primary">Sending Requests...</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {totalRequests} request{totalRequests > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-dropdown-item-hover"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden p-4">
          <div className="space-y-4 h-full overflow-y-auto">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-secondary">{currentLabel}</span>
                <span className="text-xs text-text-secondary">
                  {currentProgress}/{totalRequests} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 bg-background rounded-full overflow-hidden border border-border">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-primary"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Table */}
            {results.length > 0 && (
              <div className="border border-border rounded overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-table-headerBg border-b border-border">
                    <tr>
                      <th className="w-10 px-3 py-1.5 text-left text-text-secondary font-medium">
                        #
                      </th>
                      <th className="px-3 py-1.5 text-left text-text-secondary font-medium">
                        Payload
                      </th>
                      <th className="px-3 py-1.5 text-left text-text-secondary font-medium">
                        Value
                      </th>
                      <th className="w-16 px-3 py-1.5 text-center text-text-secondary font-medium">
                        Status
                      </th>
                      <th className="w-20 px-3 py-1.5 text-right text-text-secondary font-medium">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr
                        key={`${result.payloadName}-${result.value}-${index}`}
                        className="border-b border-border/40 hover:bg-dropdown-item-hover/30 transition-colors"
                      >
                        <td className="px-3 py-1.5 text-text-secondary">{index + 1}</td>
                        <td className="px-3 py-1.5 text-text-primary font-medium">
                          {result.payloadName}
                        </td>
                        <td className="px-3 py-1.5 text-text-primary font-mono truncate max-w-[250px]">
                          {result.value}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-bold',
                              result.status >= 200 && result.status < 400
                                ? 'bg-success/20 text-success'
                                : 'bg-error/20 text-error',
                            )}
                          >
                            {result.status || 'ERR'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-secondary">
                          {result.duration}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-error/20 text-error hover:bg-error/30 transition-colors"
          >
            <Square className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}