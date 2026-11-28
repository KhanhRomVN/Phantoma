import { useState } from 'react';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';
import type { FieldKind } from '../../../shared/types';
import { normalizeUrl } from '../utils/service.util';
import { BackupCodeGrid, BackupCopyMenu, parseBackup, serializeBackup, TotpLive } from '../../security';

const copy = (text: string): void => {
  void navigator.clipboard.writeText(text).catch(() => undefined);
};

function BackupView({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  const items = parseBackup(value);
  const left = items.filter((i) => !i.used).length;
  return (
    <div className="group/section flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] tabular-nums text-text-secondary">
          {left}/{items.length} left
        </span>
        {items.length > 0 && <BackupCopyMenu codes={items} />}
      </div>
      <BackupCodeGrid
        items={items}
        onToggle={
          onChange
            ? (idx) =>
                onChange(serializeBackup(items.map((it, i) => (i === idx ? { ...it, used: !it.used } : it))))
            : undefined
        }
        onRemove={
          onChange
            ? (idx) => onChange(serializeBackup(items.filter((_, i) => i !== idx)))
            : undefined
        }
        onAdd={
          onChange
            ? (added) => onChange(serializeBackup([...items, ...added.map((code) => ({ code, used: false }))]))
            : undefined
        }
      />
    </div>
  );
}

function SecretValue({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        type="button"
        title="Click to copy"
        onClick={() => copy(value)}
        className="min-w-0 truncate text-left font-mono text-xs text-text-primary transition-colors hover:text-primary"
      >
        {revealed ? value : '•'.repeat(Math.min(value.length, 18))}
      </button>
      <button
        type="button"
        title={revealed ? 'Hide' : 'Reveal'}
        onClick={() => setRevealed((v) => !v)}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15"
      >
        {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

interface FieldViewProps {
  kind: FieldKind;
  value: string;
  onChange?: (value: string) => void;
}

export function FieldView({ kind, value, onChange }: FieldViewProps) {
  if (kind === 'totp') return <TotpLive secret={value} />;
  if (kind === 'backup') return <BackupView value={value} onChange={onChange} />;
  if (kind === 'array') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((item, i) => (
            <button
              key={`${item}-${i}`}
              type="button"
              title="Click to copy"
              onClick={() => copy(item)}
              className="rounded-md bg-text-secondary/10 px-2 py-1 font-mono text-xs text-text-primary transition-colors hover:bg-text-secondary/15 hover:text-primary"
            >
              {item}
            </button>
          ))}
      </div>
    );
  }
  if (kind === 'secret' || kind === 'api') return <SecretValue value={value} />;
  if (kind === 'url') {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          title="Click to copy"
          onClick={() => copy(value)}
          className="min-w-0 truncate text-left text-xs text-info transition-colors hover:text-primary"
        >
          {value}
        </button>
        <a
          href={normalizeUrl(value)}
          target="_blank"
          rel="noreferrer"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }
  return (
    <button
      type="button"
      title="Click to copy"
      onClick={() => copy(value)}
      className="min-w-0 truncate text-left font-mono text-xs text-text-primary transition-colors hover:text-primary"
    >
      {value}
    </button>
  );
}

export default FieldView;