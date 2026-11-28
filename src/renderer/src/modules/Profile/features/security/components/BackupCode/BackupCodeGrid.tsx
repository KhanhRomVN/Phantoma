import { useState } from 'react';
import { Check, Copy, Plus, Upload, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { toastService } from '@renderer/components/ui/Toast';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import { BackupItem, BACKUP_TONES, parseCodeText, writeClipboard } from '../../utils/backup-code.util';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      toastService.show({ variant: 'error', title: 'Cannot copy to clipboard' });
    }
  };
  return (
    <Tooltip content={copied ? 'Copied' : label} side="top">
      <button
        type="button"
        onClick={copy}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </Tooltip>
  );
}

interface BackupCodeGridProps {
  items: BackupItem[];
  onToggle?: (idx: number) => void;
  onRemove?: (idx: number) => void;
  onAdd?: (codes: string[]) => void;
}

export function BackupCodeGrid({ items, onToggle, onRemove, onAdd }: BackupCodeGridProps) {
  const [adding, setAdding] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [fromFile, setFromFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const total = items.length;

  const copyCode = async (idx: number, code: string): Promise<void> => {
    if (!(await writeClipboard(code))) return;
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1200);
  };
  const draftCodes = Array.from(new Set(parseCodeText(codeDraft)));
  const isBatch = draftCodes.length > 1;
  const newCodes = draftCodes.filter((v) => !items.some((c) => c.code === v) && !skipped.has(v));

  const closeAdd = (): void => {
    setAdding(false);
    setCodeDraft('');
    setFromFile(false);
    setFileError('');
    setSkipped(new Set());
  };

  const loadFile = async (file: File): Promise<void> => {
    try {
      const codes = Array.from(new Set(parseCodeText(await file.text())));
      if (codes.length === 0) {
        setFileError('No codes found in file.');
        return;
      }
      setFileError('');
      setCodeDraft(codes.join('\n'));
      setFromFile(true);
      setAdding(true);
    } catch {
      setFileError('Cannot read the file.');
    }
  };

  const addCode = (keepOpen = false): void => {
    if (newCodes.length) onAdd?.(newCodes);
    if (keepOpen) setCodeDraft('');
    else closeAdd();
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map((c, idx) => (
          <div key={`${c.code}-${idx}`} className="group/code relative">
            <button
              type="button"
              title={`Click to copy · Right-click to ${c.used ? 'mark as unused' : 'mark as used'}`}
              onClick={() => void copyCode(idx, c.code)}
              onContextMenu={(e) => {
                e.preventDefault();
                onToggle?.(idx);
              }}
              className={cn(
                'flex w-full items-center justify-between gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs transition-colors',
                c.used
                  ? 'bg-text-secondary/10 text-text-secondary/50 line-through'
                  : cn(
                      TONE_CLASS[BACKUP_TONES[idx % BACKUP_TONES.length]].pill,
                      'hover:brightness-110',
                    ),
              )}
            >
              <span
                className={cn(
                  'text-[9px] tabular-nums opacity-50 transition-opacity',
                  onRemove && 'group-hover/code:opacity-0',
                )}
              >
                {copiedIdx === idx ? <Check className="h-2.5 w-2.5" /> : String(idx + 1).padStart(2, '0')}
              </span>
              <span>{c.code}</span>
            </button>
            {onRemove && (
              <button
                type="button"
                title="Delete code"
                onClick={() => onRemove(idx)}
                className="absolute left-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md bg-error/15 text-error opacity-0 transition-colors hover:bg-error/25 active:bg-error/30 focus-visible:opacity-100 group-hover/code:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {onAdd &&
          !fromFile &&
          (adding ? (
            <div className="flex items-center gap-1.5 rounded-md border border-dashed border-primary/50 bg-background/30 px-2 py-1.5">
              <span className="text-[9px] tabular-nums text-text-secondary/50">
                {String(total + 1).padStart(2, '0')}
              </span>
              <input
                autoFocus
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                onBlur={() => {
                  if (!isBatch) codeDraft.trim() ? addCode() : closeAdd();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addCode(!isBatch);
                  if (e.key === 'Escape') closeAdd();
                }}
                spellCheck={false}
                placeholder="code"
                className="min-w-0 flex-1 bg-transparent text-right font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary/50"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Tooltip content="Add backup code" side="top">
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex items-center justify-center rounded-md border border-dashed border-text-secondary/30 px-2 py-1.5 text-text-secondary transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip content="Upload .txt file" side="top">
                <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-text-secondary/30 px-2 py-1.5 text-text-secondary transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary">
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void loadFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </Tooltip>
            </div>
          ))}
      </div>

      {fileError && <div className="mt-1.5 text-[11px] text-error">{fileError}</div>}

      {onAdd && adding && (isBatch || fromFile) && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed border-primary/50 bg-background/30 p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Preview: {newCodes.length} new / {draftCodes.length} codes
            </span>
            <CopyButton value={draftCodes.join('\n')} label="Copy all preview codes" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {draftCodes.map((code, idx) => {
              const duplicated = items.some((c) => c.code === code);
              const off = duplicated || skipped.has(code);
              return (
                <button
                  type="button"
                  key={code}
                  disabled={duplicated}
                  title={duplicated ? 'Already exists' : off ? 'Click to include' : 'Click to exclude'}
                  onClick={() =>
                    setSkipped((prev) => {
                      const next = new Set(prev);
                      if (next.has(code)) next.delete(code);
                      else next.add(code);
                      return next;
                    })
                  }
                  className={cn(
                    'flex items-center justify-between gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs transition-colors',
                    off
                      ? 'bg-text-secondary/10 text-text-secondary/50 line-through'
                      : cn(TONE_CLASS[BACKUP_TONES[idx % BACKUP_TONES.length]].pill, 'hover:brightness-110'),
                    duplicated && 'cursor-not-allowed',
                  )}
                >
                  <span className="text-[9px] tabular-nums opacity-50">
                    {String(total + idx + 1).padStart(2, '0')}
                  </span>
                  <span>{code}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={closeAdd}
              className="rounded-md bg-primary/10 px-3 py-1 text-xs text-text-secondary transition-colors hover:bg-primary/20 hover:text-text-primary active:bg-primary/30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => addCode()}
              disabled={newCodes.length === 0}
              className={cn(
                'rounded-md bg-primary/10 px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/20 active:bg-primary/30',
                newCodes.length === 0 && 'cursor-not-allowed opacity-40',
              )}
            >
              Add {newCodes.length} codes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
