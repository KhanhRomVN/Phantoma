import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Square, Play } from 'lucide-react';

// Types
import type { PayloadItem, RunResult } from '../../../../../../types/repeater.types';

// Utils
import { cn } from '@renderer/shared/utils/cn';

interface RunModalProps {
  isOpen: boolean;
  totalRequests: number;
  enabledPayloads: PayloadItem[];
  onRun: (
    onProgress: (item: RunResult) => void,
    cancelledRef: React.MutableRefObject<boolean>,
  ) => Promise<RunResult[]>;
  onClose: () => void;
  onViewResults: (results: RunResult[]) => void;
}

export function RunModal({
  isOpen,
  totalRequests,
  enabledPayloads,
  onRun,
  onClose,
  onViewResults,
}: RunModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<RunResult[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentLabel, setCurrentLabel] = useState('');
  const cancelledRef = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsRunning(false);
      setIsCompleted(false);
      setResults([]);
      setCurrentProgress(0);
      setCurrentLabel('');
      cancelledRef.current = false;
    }
  }, [isOpen]);

  const hasPayload = enabledPayloads.length > 0;

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    cancelledRef.current = false;
    setResults([]);
    setCurrentProgress(0);

    const onProgress = (item: RunResult) => {
      setResults((prev) => [...prev, item]);
      setCurrentProgress((prev) => prev + 1);
      setCurrentLabel(`${item.payloadName}=${item.value}`);
    };

    const finalResults = await onRun(onProgress, cancelledRef);

    if (!cancelledRef.current) {
      setIsCompleted(true);
      setResults(finalResults);
    }
    setIsRunning(false);
  }, [onRun]);

  const handleCancel = () => {
    cancelledRef.current = true;
  };

  const handleClose = () => {
    if (isRunning) return;
    onClose();
  };

  const handleViewResults = () => {
    onViewResults(results);
  };

  if (!isOpen) return null;

  const progressPercent =
    totalRequests > 0 ? Math.round((currentProgress / totalRequests) * 100) : 0;
  const successCount = results.filter((r) => r.status >= 200 && r.status < 400).length;
  const errorCount = results.filter((r) => r.status >= 400 || r.status === 0).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-2xl w-[800px] max-w-[95vw] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-medium text-text-primary">
              {isCompleted
                ? 'Execution Complete'
                : isRunning
                  ? 'Sending Requests...'
                  : 'Confirm Execution'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {totalRequests} request{totalRequests > 1 ? 's' : ''}
              {hasPayload &&
                ` with ${enabledPayloads.length} payload${enabledPayloads.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isRunning}
            className="p-1.5 rounded hover:bg-dropdown-item-hover disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto p-4">
          {/* ========== CONFIRM UI ========== */}
          {!isRunning && !isCompleted && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="text-4xl">🚀</div>
                <p className="text-sm text-text-primary text-center">
                  Ready to send <span className="font-bold text-primary">{totalRequests}</span>{' '}
                  request
                  {totalRequests > 1 ? 's' : ''}
                </p>
              </div>

              {/* Preview table */}
              {hasPayload && (
                <div>
                  <div className="text-xs font-medium text-text-secondary mb-2">
                    Payload Preview ({totalRequests} combinations)
                  </div>
                  <div className="border border-border rounded overflow-hidden max-h-64 overflow-y-auto">
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
                        </tr>
                      </thead>
                      <tbody>
                        {enabledPayloads.flatMap((payload) =>
                          payload.values.map((value, vi) => (
                            <tr
                              key={`${payload.name}-${value}-${vi}`}
                              className="border-b border-border/40"
                            >
                              <td className="px-3 py-1.5 text-text-secondary">{vi + 1}</td>
                              <td className="px-3 py-1.5 text-text-primary font-medium">
                                {payload.name}
                              </td>
                              <td className="px-3 py-1.5 text-text-primary font-mono truncate max-w-[350px]">
                                {value}
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== PROGRESS / COMPLETE UI ========== */}
          {(isRunning || isCompleted) && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-secondary">
                    {isRunning ? currentLabel : 'Done'}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {currentProgress}/{totalRequests} ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-background rounded-full overflow-hidden border border-border">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      isCompleted ? 'bg-success' : 'bg-primary',
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Summary khi completed */}
              {isCompleted && (
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-success">{successCount} OK</span>
                  {errorCount > 0 && <span className="text-error">{errorCount} errors</span>}
                </div>
              )}

              {/* Table */}
              {results.length > 0 && (
                <div className="border border-border rounded overflow-hidden max-h-64 overflow-y-auto">
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
          {isRunning && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-error/20 text-error hover:bg-error/30 transition-colors"
            >
              <Square className="w-3 h-3" />
              Cancel
            </button>
          )}
          {!isRunning && !isCompleted && (
            <>
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                <Play className="w-3 h-3" />
                Start
              </button>
            </>
          )}
          {isCompleted && (
            <>
              <button
                onClick={handleClose}
                className="px-3 py-1.5 rounded text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-dropdown-item-hover transition-colors"
              >
                Close
              </button>
              {hasPayload && (
                <button
                  onClick={handleViewResults}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                >
                  View Results
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
