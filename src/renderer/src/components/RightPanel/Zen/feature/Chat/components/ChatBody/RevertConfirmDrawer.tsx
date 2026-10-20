/**
 * ------------------------------------------------------------------
 * RevertConfirmDrawer
 * ------------------------------------------------------------------
 * Bottom-sheet drawer xác nhận revert conversation. Hiển thị danh sách
 * file bị ảnh hưởng, phân loại theo restore/undo/remove, có search và
 * preview khi click.
 *
 * Khác với Zen bản gốc: nhận prop `files` từ parent thay vì tự fetch
 * qua IPC. Điều này cho phép parent (ResponseMetadataBar) quyết định
 * có mở drawer hay revert thẳng khi không có file changes.
 * ------------------------------------------------------------------
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Loader2 } from 'lucide-react';
import { getFileIconPath } from '@renderer/shared/utils/fileIconMapper';
import { cn } from '@renderer/shared/utils/cn';

import type { RevertFileEntry, RevertGroupKey } from '../../types/revert';
import { classifyFile } from '../../utils/revertPreviewBuilder';

// ─── Types ──────────────────────────────────────────────────────────────
interface GroupDef {
  key: RevertGroupKey;
  name: string;
  desc: string;
  accentColor: string;
  accentBg: string;
  icon: React.ReactNode;
}

interface RevertConfirmDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  files: RevertFileEntry[];
  onFileClick?: (filePath: string, groupKey: RevertGroupKey) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────
const ACCENT_RESTORE = '#4FD1C0';
const ACCENT_UNDO = '#F0A857';
const ACCENT_REMOVE = '#F0687A';

const GROUP_DEFS: GroupDef[] = [
  {
    key: 'restore',
    name: 'Will be restored',
    desc: 'Files deleted after this point',
    accentColor: ACCENT_RESTORE,
    accentBg: 'rgba(79,209,192,0.12)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    ),
  },
  {
    key: 'undo',
    name: 'Edits will be undone',
    desc: 'Files modified after this point',
    accentColor: ACCENT_UNDO,
    accentBg: 'rgba(240,168,87,0.12)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 14l-4-4 4-4" />
        <path d="M5 10h9a5 5 0 0 1 0 10h-1" />
      </svg>
    ),
  },
  {
    key: 'remove',
    name: 'Will be removed',
    desc: 'Files created after this point',
    accentColor: ACCENT_REMOVE,
    accentBg: 'rgba(240,104,122,0.12)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 14h10l1-14" />
      </svg>
    ),
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────
const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn('transition-transform shrink-0', open && 'rotate-180')}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const FileRow: React.FC<{
  entry: RevertFileEntry;
  groupKey: RevertGroupKey;
  query: string;
  onFileClick?: (filePath: string, groupKey: RevertGroupKey) => void;
}> = ({ entry, groupKey, query, onFileClick }) => {
  const { filePath } = entry;
  const slashIdx = filePath.lastIndexOf('/');
  const dirPart = slashIdx >= 0 ? filePath.slice(0, slashIdx + 1) : '';
  const namePart = slashIdx >= 0 ? filePath.slice(slashIdx + 1) : filePath;

  const highlight = (text: string) => {
    if (!query) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/35 text-inherit rounded-sm">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div
      onClick={() => onFileClick?.(filePath, groupKey)}
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-2 pl-12 border-t border-border/60',
        onFileClick ? 'cursor-pointer hover:bg-foreground/[0.04]' : 'cursor-default',
      )}
    >
      <img
        src={getFileIconPath(namePart)}
        alt=""
        width={15}
        height={15}
        className="shrink-0 object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <div className="flex-1 min-w-0 font-mono text-[11.5px] text-text-primary truncate">
        <span className="text-text-secondary opacity-60">{highlight(dirPart)}</span>
        {highlight(namePart)}
      </div>
    </div>
  );
};

const FileGroup: React.FC<{
  def: GroupDef;
  files: RevertFileEntry[];
  query: string;
  forceOpen: boolean;
  onFileClick?: (filePath: string, groupKey: RevertGroupKey) => void;
}> = ({ def, files, query, forceOpen, onFileClick }) => {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  if (files.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden bg-input mb-2">
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer select-none hover:bg-foreground/[0.03] transition-colors"
      >
        <div
          className="w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: def.accentBg, color: def.accentColor }}
        >
          {def.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-medium text-text-primary">{def.name}</div>
          <div className="text-[11px] text-text-secondary opacity-70 mt-px">{def.desc}</div>
        </div>
        <div className="text-text-secondary opacity-50">
          <ChevronIcon open={open} />
        </div>
      </div>
      <div
        className="overflow-y-auto transition-[max-height] duration-200 ease-out"
        style={{ maxHeight: open ? 260 : 0 }}
      >
        {files.map((f) => (
          <FileRow
            key={f.filePath}
            entry={f}
            groupKey={def.key}
            query={query}
            onFileClick={onFileClick}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Main component ─────────────────────────────────────────────────────
const RevertConfirmDrawer: React.FC<RevertConfirmDrawerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  files,
  onFileClick,
}) => {
  const [query, setQuery] = React.useState('');
  const [reverting, setReverting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setReverting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const grouped: Record<RevertGroupKey, RevertFileEntry[]> = { restore: [], undo: [], remove: [] };
  const lq = query.toLowerCase();
  files.forEach((f) => {
    if (!lq || f.filePath.toLowerCase().includes(lq)) {
      grouped[classifyFile(f)].push(f);
    }
  });

  const totalFiltered = grouped.restore.length + grouped.undo.length + grouped.remove.length;
  const totalAll = files.length;
  const counts = {
    restore: grouped.restore.length,
    undo: grouped.undo.length,
    remove: grouped.remove.length,
  };
  const pct = (n: number) => (totalFiltered > 0 ? `${(n / totalFiltered) * 100}%` : '0%');
  const hasSearch = query.length > 0;

  const handleConfirm = () => {
    setReverting(true);
    setTimeout(() => {
      onClose();
      onConfirm();
    }, 300);
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-sm animate-[rcFadeIn_0.18s_ease]"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[9999] h-1/2 flex flex-col bg-tertiary border-t border-border shadow-[0_-8px_32px_rgba(0,0,0,0.28)] animate-[rcSlideUp_0.22s_ease]">
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-1 min-h-0 rc-scroll">
          <div className="flex flex-col items-center text-center px-2 pt-2 pb-4">
            <div className="w-11 h-11 rounded-[10px] mb-3 bg-primary/12 flex items-center justify-center text-primary">
              <RotateCcw size={20} />
            </div>
            <div className="text-base font-semibold text-text-primary tracking-tight mb-1.5">
              Revert to this point?
            </div>
            <div className="text-[12.5px] text-text-secondary leading-relaxed max-w-[320px] opacity-85">
              The conversation will return to the state before this message. Messages and changes
              after this point cannot be recovered.
            </div>
          </div>

          {totalAll > 0 && (
            <div className="bg-input rounded-xl px-3.5 py-3 mb-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-text-primary">
                  {totalAll} file{totalAll !== 1 ? 's' : ''} affected{' '}
                  <span className="font-normal text-text-secondary opacity-60">
                    · since this message
                  </span>
                </div>
              </div>
              <div className="flex h-[5px] rounded-full overflow-hidden bg-border mb-2.5">
                <div
                  className="transition-[width] duration-300 ease-out"
                  style={{ width: pct(counts.restore), background: ACCENT_RESTORE }}
                />
                <div
                  className="transition-[width] duration-300 ease-out"
                  style={{ width: pct(counts.undo), background: ACCENT_UNDO }}
                />
                <div
                  className="transition-[width] duration-300 ease-out"
                  style={{ width: pct(counts.remove), background: ACCENT_REMOVE }}
                />
              </div>
              <div className="flex gap-3.5 flex-wrap">
                {(
                  [
                    { label: 'restore', count: counts.restore, color: ACCENT_RESTORE },
                    { label: 'undo', count: counts.undo, color: ACCENT_UNDO },
                    { label: 'remove', count: counts.remove, color: ACCENT_REMOVE },
                  ] as const
                ).map(
                  (l) =>
                    l.count > 0 && (
                      <div
                        key={l.label}
                        className="flex items-center gap-1.5 text-[11px] text-text-secondary"
                      >
                        <div
                          className="w-[7px] h-[7px] rounded-full shrink-0"
                          style={{ background: l.color }}
                        />
                        {l.count} {l.label}
                      </div>
                    ),
                )}
              </div>
            </div>
          )}

          {totalAll > 3 && (
            <div className="relative mb-2.5">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary opacity-50 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by filename…"
                className="w-full h-[34px] bg-input border-none rounded-lg text-text-primary font-inherit text-xs pl-8 pr-8 outline-none"
              />
              {hasSearch && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] border-none bg-transparent text-text-secondary cursor-pointer flex items-center justify-center rounded p-0"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {totalAll === 0 ? (
            <div className="text-center text-xs text-text-secondary opacity-45 py-6 px-2">
              No file changes to revert
            </div>
          ) : totalFiltered === 0 ? (
            <div className="text-center text-xs text-text-secondary opacity-45 py-4 px-2">
              No files match "{query}"
            </div>
          ) : (
            <div className="pb-2">
              {GROUP_DEFS.map((def) => (
                <FileGroup
                  key={def.key}
                  def={def}
                  files={grouped[def.key]}
                  query={query}
                  forceOpen={hasSearch}
                  onFileClick={onFileClick}
                />
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 px-4 pt-3 pb-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[9px] bg-foreground/8 border-none text-text-secondary text-xs font-medium cursor-pointer hover:bg-foreground/13 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={reverting}
            className={cn(
              'flex-1 py-2.5 rounded-[9px] border-none text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors',
              reverting
                ? 'bg-primary/14 text-primary/50 cursor-not-allowed'
                : 'bg-primary/22 text-primary cursor-pointer hover:bg-primary/30',
            )}
          >
            {reverting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <>
                <RotateCcw size={12} />
                Revert
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rcSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes rcFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .rc-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }
        .rc-scroll::-webkit-scrollbar { width: 5px; }
        .rc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
      `}</style>
    </>,
    document.body,
  );
};

export default RevertConfirmDrawer;