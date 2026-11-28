import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Copy, MoreHorizontal, Settings2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@renderer/components/ui/Modal';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Tone } from '../../../../shared/types/ui.types';
import { BackupItem, BACKUP_TONES, writeClipboard } from '../../utils/backup-code.util';

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
