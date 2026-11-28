/**
 * ------------------------------------------------------------------
 * MemoryEditor
 * ------------------------------------------------------------------
 * Textarea chỉnh sửa memory.md với autosave, trạng thái lưu,
 * reload và retry. Logic lưu/đọc nằm trong useMemoryDocument.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { $ } from '@renderer/utils/color';
import { useMemoryDocument } from '../hooks/useMemoryDocument';

const PLACEHOLDER_TEXT =
  '# Global Memory\n\n- User prefers dark mode.\n- Prefers TypeScript and concise code.';

const MemoryEditor: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const { content, loading, error, status, dirty, onChange, reload, retry } =
    useMemoryDocument(enabled);

  if (!enabled) {
    return (
      <div className="text-[11.5px] text-text-secondary italic py-2">
        Bật Memory để xem và chỉnh sửa nội dung file memory.md.
      </div>
    );
  }

  const getStatusColor = () => {
    if (status === 'saving') return $('--warn');
    if (status === 'saved') return $('--success');
    if (status === 'error') return $('--error');
    return $('--text-secondary');
  };

  const getStatusText = () => {
    if (status === 'saving') return 'Saving...';
    if (status === 'saved') return 'Saved';
    if (status === 'error') return 'Save Error';
    return '';
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wide">
          memory.md
        </span>

        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: getStatusColor(),
              opacity: status !== 'idle' ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
          >
            {getStatusText()}
          </span>

          {status === 'error' && (
            <button
              type="button"
              onClick={() => void retry()}
              className="bg-transparent border-none cursor-pointer text-text-secondary text-[11px] px-1.5 py-0.5 rounded hover:bg-gray-500/10 transition-colors"
            >
              Retry
            </button>
          )}

          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading || dirty || status === 'saving'}
            title={dirty ? 'Unsaved changes — wait for autosave' : 'Reload from disk'}
            aria-label="Reload memory from disk"
            className="inline-flex items-center gap-1 bg-transparent border-none cursor-pointer text-text-secondary text-[11px] px-1.5 py-0.5 rounded hover:bg-gray-500/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={11}
              style={{ animation: loading ? 'spin 1s linear infinite' : undefined }}
            />
          </button>
        </div>
      </div>

      {error && <div className="text-[11.5px] text-red-500">{error}</div>}

      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder={PLACEHOLDER_TEXT}
        aria-label="memory.md content"
        className="w-full min-h-[150px] max-h-[300px] resize-y p-2.5 text-[11.5px] leading-normal font-mono text-text-primary bg-input-background border border-border rounded-md outline-none box-border transition-colors focus:border-blue-500"
      />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MemoryEditor;
