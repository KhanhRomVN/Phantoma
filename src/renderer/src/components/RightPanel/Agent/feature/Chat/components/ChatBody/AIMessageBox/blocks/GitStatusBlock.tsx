import React from 'react';
import { Check, X, Pencil, Trash2, Plus, Move, HelpCircle, FolderOpen } from 'lucide-react';
import FileIcon from '@renderer/components/common/FileIcon';
import { $ } from '@renderer/utils/color';

export interface GitStatusItem {
  status: string;
  path: string;
  staged?: boolean;
  added?: number;
  deleted?: number;
  isUnpushedCommit?: boolean;
}

export interface GitStatusBlockProps {
  statusItems: GitStatusItem[];
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

const GitStatusBlock: React.FC<GitStatusBlockProps> = ({
  statusItems,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  const handleRowClick = (path: string) => {
    // Send message to extension to show git diff
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        command: 'showGitDiff',
        filePath: path,
      });
    } else {
      console.error('[GitStatusBlock] vscodeApi not available');
    }
  };

  const getStatusColor = (status: string): string => {
    if (status === 'M' || status === 'MM' || status === 'AM') return $('--warn') || '#d4a72c';
    if (status === 'A' || status === 'R' || status === 'C') return $('--teal') || '#4ec9b0';
    if (status === 'D') return $('--error') || '#f14c4c';
    if (status === '?') return $('--info') || '#569cd6';
    if (status === 'U') return $('--violet') || '#8b5cf6';
    return $('--text-primary');
  };

  const stagedItems = statusItems.filter((item) => item.staged && !item.isUnpushedCommit);
  const unpushedCommits = statusItems.filter((item) => item.isUnpushedCommit);

  // Button color based on git status
  const hasStaged = statusItems.some((item) => item.staged && !item.isUnpushedCommit);
  const hasUnpushed = statusItems.some((item) => item.isUnpushedCommit);
  const buttonColor = hasStaged
    ? $('--teal') || '#4ec9b0'
    : hasUnpushed
      ? $('--violet') || '#8b5cf6'
      : $('--warn') || '#d4a72c';

  const renderItem = (item: GitStatusItem, index: number) => {
    const statusColor = getStatusColor(item.status);
    const fileName = item.path.split('/').pop() || item.path;
    const added = item.added || 0;
    const deleted = item.deleted || 0;
    const hasDiff = added > 0 || deleted > 0;

    return (
      <div
        key={index}
        className="git-status-item flex items-center gap-2.5 px-3.5 py-1 text-xs transition-colors duration-[0.15s] border-l-2 cursor-pointer hover:bg-sidebar-item-hover"
        style={{ borderLeftColor: statusColor }}
        onClick={() => handleRowClick(item.path)}
        title={`Click để xem git diff của ${item.path}`}
      >
        <FileIcon path={item.path} style={{ width: 16, height: 16, flexShrink: 0 }} />
        <span className="text-primary text-xs font-mono break-all flex-1">{fileName}</span>
        {hasDiff && (
          <span className="inline-flex items-center gap-1 ml-auto text-[11px] font-medium font-mono shrink-0 opacity-80">
            <span className="text-success">+{added}</span>
            <span className="text-error">-{deleted}</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className="bg-transparent border-none overflow-hidden my-2"
        style={{ fontFamily: $('--font-family') || "'Segoe UI','Helvetica Neue',Arial,sans-serif" }}
      >
        <div className="git-status-body py-1.5 max-h-[280px] overflow-y-auto border rounded-md">
          {unpushedCommits.length > 0 && (
            <div className="py-1">
              <div className="text-[11px] font-semibold px-3.5 py-1.5 uppercase tracking-[0.5px] opacity-70 text-violet">
                📤 Chưa push ({unpushedCommits.length})
              </div>
              {unpushedCommits.map((item, index) => {
                const commitMsg = item.path;
                const shortMsg =
                  commitMsg.length > 60 ? commitMsg.substring(0, 60) + '...' : commitMsg;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 px-3.5 py-1 text-xs transition-colors duration-[0.15s] border-l-2 border-l-violet cursor-default"
                  >
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-violet"
                      >
                        <path d="M12 19V5" />
                        <path d="M5 12l7-7 7 7" />
                      </svg>
                    </span>
                    <span className="text-primary text-xs font-mono break-all flex-1 text-[11px] opacity-85">
                      {shortMsg}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {stagedItems.length === 0 && unpushedCommits.length === 0 && (
            <div className="px-3.5 py-4 text-center text-secondary text-[13px]">
              <div className="text-2xl mb-2">📂</div>
              <div className="font-semibold mb-1 text-warn">⚠️ Chưa có file nào được staged</div>
              <div className="text-xs opacity-80">
                Hãy chạy{' '}
                <code className="bg-background px-1.5 py-0.5 rounded font-mono">
                  git add {'<file>'}
                </code>{' '}
                để thêm file vào staging area
              </div>
            </div>
          )}

          {stagedItems.length > 0 && (
            <div className="py-1">
              <div className="text-[11px] font-semibold text-secondary px-3.5 py-1.5 uppercase tracking-[0.5px] opacity-70">
                Staged Changes
              </div>
              {stagedItems.map((item, index) => renderItem(item, index))}
            </div>
          )}
        </div>

        <div className="flex gap-1.5 py-2 justify-end bg-transparent">
          <button
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 inline-flex items-center gap-1.5 h-6 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              onConfirm();
            }}
            disabled={isProcessing || stagedItems.length === 0}
            title={
              stagedItems.length === 0 && unpushedCommits.length > 0
                ? 'Đã có commit chưa push. Không có thay đổi mới để commit.'
                : stagedItems.length === 0
                  ? 'Chưa có file nào được staged. Hãy chạy git add trước.'
                  : 'Tạo commit message từ các file đã staged'
            }
            style={{
              background: `color-mix(in srgb, ${buttonColor} 15%, transparent)`,
              color: stagedItems.length === 0 ? $('--secondary-text') || '#8c8c8c' : buttonColor,
              border: `1px solid color-mix(in srgb, ${stagedItems.length === 0 ? $('--secondary-text') || '#8c8c8c' : buttonColor} 30%, transparent)`,
              cursor: stagedItems.length === 0 ? 'not-allowed' : 'pointer',
              opacity: stagedItems.length === 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (stagedItems.length > 0) {
                e.currentTarget.style.background = `color-mix(in srgb, ${buttonColor} 25%, transparent)`;
              }
            }}
            onMouseLeave={(e) => {
              if (stagedItems.length > 0) {
                e.currentTarget.style.background = `color-mix(in srgb, ${buttonColor} 15%, transparent)`;
              }
            }}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>{isProcessing ? 'Processing' : 'Create Commit Message'}</span>
          </button>
          <button
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 inline-flex items-center gap-1.5 h-6 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              onCancel();
            }}
            disabled={isProcessing}
            style={{
              background: `color-mix(in srgb, ${$('--error') || '#ff4d4d'} 15%, transparent)`,
              color: $('--error') || '#ff4d4d',
              border: `1px solid color-mix(in srgb, ${$('--error') || '#ff4d4d'} 30%, transparent)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `color-mix(in srgb, ${$('--error') || '#ff4d4d'} 25%, transparent)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `color-mix(in srgb, ${$('--error') || '#ff4d4d'} 15%, transparent)`;
            }}
          >
            <X size={14} strokeWidth={2.5} />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default GitStatusBlock;
