/**
 * ------------------------------------------------------------------
 * WorkspacePathBadge
 * ------------------------------------------------------------------
 * Badge góc phải trên Home hiển thị folder path mà Zen đang đứng.
 * Đọc `__zenWorkspaceFolderPath` (do Zen/index.tsx set) với fallback về
 * project hiện tại của Code store. Dùng để debug khi Zen không xác định
 * được nó đang ở folder nào.
 *
 * Main features:
 * - Hiển thị full path (title) + tên folder ngắn (label)
 * - Nút copy nhanh đường dẫn
 * - Tự cập nhật khi project active thay đổi (đọc từ Code store)
 * ------------------------------------------------------------------
 */

// ─── Imports ───────────────────────────────────────────────────────────
import React, { useMemo, useState } from 'react';
import { Folder, Check, Copy } from 'lucide-react';
import { useCodeStore } from '@renderer/modules/Code/hooks/useCodeStore';
import { $ } from '@renderer/utils/color';

// ─── Helpers ───────────────────────────────────────────────────────────
function getBasename(p: string): string {
  const norm = p.replace(/[\\/]+$/, '');
  const parts = norm.split(/[\\/]/);
  return parts[parts.length - 1] || norm;
}

// ─── Component ──────────────────────────────────────────────────────────
export const WorkspacePathBadge: React.FC<{ className?: string }> = ({ className }) => {
  // Subscribe Code store so badge updates when current project changes
  const storePath = useCodeStore((s) => {
    const project = s.projects.find((p) => p.id === s.currentProjectId);
    return project?.explorerRoot ?? project?.path ?? null;
  });

  const fullPath = useMemo(() => {
    const injected = (window as any).__zenWorkspaceFolderPath as string | undefined;
    return injected || storePath || null;
  }, [storePath]);

  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fullPath) return;
    try {
      await navigator.clipboard.writeText(fullPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!fullPath) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-dashed opacity-70 ${className ?? ''}`}
        style={{ color: 'rgb(255, 45, 85)', borderColor: 'rgb(255, 45, 85)' }}
        title="Zen chưa xác định được folder hiện tại"
      >
        <Folder size={12} />
        <span>No folder</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={fullPath}
      className={`group inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition-colors max-w-[260px] ${className ?? ''}`}
      style={{
        color: $('--text-secondary'),
        backgroundColor: $('--input-background'),
        borderColor: `color-mix(in srgb, ${$('--text-secondary')} 25%, transparent)`,
      }}
    >
      <Folder size={12} className="text-amber-400 shrink-0" />
      <span className="truncate font-mono">{getBasename(fullPath)}</span>
      <span className="opacity-60 group-hover:opacity-100 shrink-0">
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </span>
    </button>
  );
};

export default WorkspacePathBadge;