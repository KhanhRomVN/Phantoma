import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, KeyRound, MoreHorizontal, Plus, Settings2, Upload, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@renderer/components/ui/Modal';
import { TONE_CLASS } from '../../../constants/tone';
import type { Tone } from '../../../types/ui.types';
import { splitBackup } from '../../../utils/service';
import { saveOutlineClass } from './useSaveState';
import type { SaveStatus } from './useSaveState';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
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

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

function Section({ title, icon: Icon, tone = 'muted', action, className, children }: SectionProps) {
  return (
    <section className={cn('group/section rounded-md bg-card-background', className)}>
      <header className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          {Icon && (
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          {title}
        </div>
        {action}
      </header>
      <div className="px-3.5 pb-3.5">{children}</div>
    </section>
  );
}

export interface BackupItem {
  code: string;
  used: boolean;
}

const BACKUP_TONES: Tone[] = ['primary', 'info', 'success', 'warn', 'error'];

export function backupTone(left: number): Tone {
  return left >= 5 ? 'success' : left >= 3 ? 'warn' : 'error';
}

// ASSUMED: backup codes are stored as one string; a leading "~" marks a code as used
export function parseBackup(value: string): BackupItem[] {
  return splitBackup(value).map((raw) =>
    raw.startsWith('~') ? { code: raw.slice(1), used: true } : { code: raw, used: false },
  );
}

export function serializeBackup(items: BackupItem[]): string {
  return items.map((i) => (i.used ? '~' : '') + i.code).join('\n');
}

const NUMBERED_MARK = /(?:^|\s)(\d{1,3})[.)]\s+/g;

// ASSUMED: numbered lists ("1. 8083 7422", possibly several columns per line) are sorted by their index and inner spaces are dropped, because stored codes are whitespace-separated
export function parseCodeText(text: string): string[] {
  const marks = Array.from(text.matchAll(NUMBERED_MARK));
  if (marks.length >= 2) {
    const rows = marks
      .map((m, i) => {
        const start = (m.index ?? 0) + m[0].length;
        const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
        return { n: Number(m[1]), code: text.slice(start, end).replace(/\s+/g, '') };
      })
      .filter((r) => r.code);
    if (rows.length >= 2) return rows.sort((a, b) => a.n - b.n).map((r) => r.code);
  }
  return text.split(/[\s,;]+/).filter(Boolean);
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

type SeparatorKey = 'space' | 'comma' | 'newline' | 'custom';

interface CopyFormat {
  separator: SeparatorKey;
  custom: string;
  quote: string;
  prefix: string;
  suffix: string;
  onlyUnused: boolean;
}

const SEPARATORS: { key: SeparatorKey; label: string; value: string }[] = [
  { key: 'space', label: 'Space', value: ' ' },
  { key: 'comma', label: 'Comma', value: ', ' },
  { key: 'newline', label: 'New line', value: '\n' },
  { key: 'custom', label: 'Custom', value: '' },
];

const QUOTES = [
  { value: '', label: 'None' },
  { value: "'", label: "Single ' '" },
  { value: '"', label: 'Double " "' },
];

const DEFAULT_FORMAT: CopyFormat = {
  separator: 'space',
  custom: '',
  quote: '',
  prefix: '',
  suffix: '',
  onlyUnused: false,
};

const FIELD_INPUT =
  'h-8 w-full rounded-md bg-text-secondary/10 px-2.5 font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:bg-text-secondary/15';

function formatCodes(codes: BackupItem[], f: CopyFormat): string {
  const sep =
    f.separator === 'custom'
      ? f.custom.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
      : (SEPARATORS.find((s) => s.key === f.separator)?.value ?? ' ');
  const list = (f.onlyUnused ? codes.filter((c) => !c.used) : codes).map(
    (c) => f.quote + c.code + f.quote,
  );
  return f.prefix + list.join(sep) + f.suffix;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function FormatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1 text-xs font-medium transition-all',
        active
          ? TONE_CLASS.info.pill
          : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

const FIELD_TONES: Record<string, Tone> = {
  Separator: 'info',
  Quote: 'success',
  Prefix: 'warn',
  Suffix: 'warn',
  Preview: 'primary',
};

function FormatField({ label, children }: { label: string; children: ReactNode }) {
  const key = Object.keys(FIELD_TONES).find((k) => label.startsWith(k));
  const tone: Tone = key ? FIELD_TONES[key] : 'muted';
  return (
    <div className="flex flex-col gap-2 rounded-md bg-card-background p-3">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        <span className={cn('h-1.5 w-1.5 rounded-full', TONE_CLASS[tone].icon)} />
        {label}
      </span>
      {children}
    </div>
  );
}

function separatorOf(f: CopyFormat): string {
  return f.separator === 'custom'
    ? f.custom.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
    : (SEPARATORS.find((s) => s.key === f.separator)?.value ?? ' ');
}

export function BackupCopyMenu({ codes }: { codes: BackupItem[] }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [format, setFormat] = useState<CopyFormat>(DEFAULT_FORMAT);
  const [copied, setCopied] = useState(false);

  const patch = (p: Partial<CopyFormat>): void => setFormat((f) => ({ ...f, ...p }));
  const preview = formatCodes(codes, format);
  const count = format.onlyUnused ? codes.filter((c) => !c.used).length : codes.length;

  const copyPreset = (separator: SeparatorKey): void => {
    void writeClipboard(formatCodes(codes, { ...DEFAULT_FORMAT, separator }));
  };

  const copyCustom = async (): Promise<void> => {
    if (!(await writeClipboard(preview))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <Dropdown align="end" width={210} open={open} onOpenChange={setOpen}>
        <DropdownTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-all hover:bg-text-secondary/15 focus-visible:opacity-100 group-hover/section:opacity-100',
              open ? 'opacity-100' : 'opacity-0',
            )}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copyPreset('space')}>
            Copy with spaces
          </DropdownItem>
          <DropdownItem icon={<Copy className="h-3.5 w-3.5" />} onClick={() => copyPreset('comma')}>
            Copy with commas
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setModal(true)}>
            Customize format...
          </DropdownItem>
        </DropdownContent>
      </Dropdown>

      <Modal isOpen={modal} onClose={() => setModal(false)} className="max-w-xl">
        <ModalHeader
          title={
            <span className="flex items-center gap-2.5">
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', TONE_CLASS.info.icon)}>
                <Settings2 className="h-4 w-4" />
              </span>
              Copy format
            </span>
          }
          description="Customize how backup codes are copied"
          onClose={() => setModal(false)}
        />
        <ModalBody className="flex flex-col gap-2.5">
          <FormatField label="Separator">
            <div className="flex flex-wrap gap-1.5">
              {SEPARATORS.map((s) => (
                <FormatChip
                  key={s.key}
                  active={format.separator === s.key}
                  onClick={() => patch({ separator: s.key })}
                >
                  {s.label}
                </FormatChip>
              ))}
            </div>
            {format.separator === 'custom' && (
              <input
                value={format.custom}
                onChange={(e) => patch({ custom: e.target.value })}
                spellCheck={false}
                placeholder="e.g.  |  or  ;\n"
                className={FIELD_INPUT}
              />
            )}
          </FormatField>

          <FormatField label="Quote each code">
            <div className="flex flex-wrap gap-1.5">
              {QUOTES.map((q) => (
                <FormatChip
                  key={q.label}
                  active={format.quote === q.value}
                  onClick={() => patch({ quote: q.value })}
                >
                  {q.label}
                </FormatChip>
              ))}
            </div>
          </FormatField>

          <div className="grid grid-cols-2 gap-3">
            <FormatField label="Prefix">
              <input
                value={format.prefix}
                onChange={(e) => patch({ prefix: e.target.value })}
                spellCheck={false}
                placeholder="["
                className={FIELD_INPUT}
              />
            </FormatField>
            <FormatField label="Suffix">
              <input
                value={format.suffix}
                onChange={(e) => patch({ suffix: e.target.value })}
                spellCheck={false}
                placeholder="]"
                className={FIELD_INPUT}
              />
            </FormatField>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={format.onlyUnused}
              onChange={(e) => patch({ onlyUnused: e.target.checked })}
              className="accent-primary"
            />
            Only unused codes
          </label>

          <FormatField label={`Preview (${count} codes)`}>
            <div className="max-h-40 overflow-auto rounded-md bg-background/50 p-2.5 font-mono text-xs">
              {count === 0 ? (
                <span className="text-text-secondary/50">No codes</span>
              ) : (
                <div
                  className={cn(
                    'flex gap-y-1',
                    separatorOf(format).includes('\n') ? 'flex-col items-start' : 'flex-wrap items-center',
                  )}
                >
                  {format.prefix && <span className="text-text-secondary">{format.prefix}</span>}
                  {(format.onlyUnused ? codes.filter((c) => !c.used) : codes).map((c, i, arr) => (
                    <span key={`${c.code}-${i}`} className="flex items-center">
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5',
                          c.used
                            ? 'bg-text-secondary/10 text-text-secondary/50 line-through'
                            : TONE_CLASS[BACKUP_TONES[i % BACKUP_TONES.length]].pill,
                        )}
                      >
                        {format.quote + c.code + format.quote}
                      </span>
                      {i < arr.length - 1 && !separatorOf(format).includes('\n') && (
                        <span className="px-1 text-text-secondary/60">
                          {separatorOf(format).trim() || '·'}
                        </span>
                      )}
                    </span>
                  ))}
                  {format.suffix && <span className="text-text-secondary">{format.suffix}</span>}
                </div>
              )}
            </div>
          </FormatField>
        </ModalBody>
        <ModalFooter>
          <span className="mr-auto self-center text-xs tabular-nums text-text-secondary">{count} codes</span>
          <button
            type="button"
            onClick={() => setModal(false)}
            className="rounded-md bg-primary/10 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-primary/20 hover:text-text-primary active:bg-primary/30"
          >
            Close
          </button>
          <button
            type="button"
            onClick={copyCustom}
            disabled={count === 0}
            className={cn(
              'flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/20 active:bg-primary/30',
              count === 0 && 'cursor-not-allowed opacity-40',
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}

interface BackupCodesCardProps {
  codes: BackupItem[];
  onChange: (next: BackupItem[]) => void;
  status?: SaveStatus;
}

export function BackupCodesCard({ codes, onChange, status = 'idle' }: BackupCodesCardProps) {
  const left = codes.filter((c) => !c.used).length;

  return (
    <Section
      title={`Backup codes (${left}/${codes.length} left)`}
      icon={KeyRound}
      tone={backupTone(left)}
      className={cn(saveOutlineClass(status), status === 'saving' && 'pointer-events-none opacity-70')}
      action={
        codes.length > 0 ? (
          <BackupCopyMenu codes={codes} />
        ) : undefined
      }
    >
      <BackupCodeGrid
        items={codes}
        onToggle={(idx) => onChange(codes.map((c, i) => (i === idx ? { ...c, used: !c.used } : c)))}
        onRemove={(idx) => onChange(codes.filter((_, i) => i !== idx))}
        onAdd={(added) => onChange([...codes, ...added.map((code) => ({ code, used: false }))])}
      />
    </Section>
  );
}

export default BackupCodesCard;