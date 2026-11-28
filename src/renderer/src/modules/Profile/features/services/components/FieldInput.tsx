import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import type { FieldKind } from '../../../shared/types';
import { FIELD_KINDS } from '../constants/service-catalog.constants';
import { decodeTotpFromImage } from '../../security';
import { InputField, TEXTAREA_CLASS } from '../../../shared/components/FormBits';

interface FieldInputProps {
  kind: FieldKind;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  autoFocus?: boolean;
  onSubmit?: () => void;
  onCancel?: () => void;
}

const SOFT_BTN =
  'rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 active:bg-text-secondary/20';

export function FieldInput({ kind, value, onChange, error, autoFocus, onSubmit, onCancel }: FieldInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState('');
  const meta = FIELD_KINDS[kind];
  const multi = kind === 'backup' || kind === 'totp' || kind === 'array';

  const scan = async (file: Blob): Promise<void> => {
    try {
      setScanError('');
      onChange(await decodeTotpFromImage(file));
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Failed to read image.');
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    if (e.key === 'Escape') onCancel?.();
    if (e.key === 'Enter' && !e.shiftKey && kind !== 'backup' && kind !== 'array') {
      e.preventDefault();
      onSubmit?.();
    }
  };

  const errorClass = error ? 'border-error focus:border-error' : 'focus:border-primary/50';

  return (
    <div className="flex flex-col gap-1.5">
      {multi ? (
        <textarea
          autoFocus={autoFocus}
          rows={kind === 'backup' ? 4 : kind === 'array' ? 3 : 2}
          value={value}
          spellCheck={false}
          placeholder={meta.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            if (kind !== 'totp') return;
            const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
            const file = item?.getAsFile();
            if (file) {
              e.preventDefault();
              void scan(file);
            }
          }}
          className={cn(TEXTAREA_CLASS, 'bg-background break-all font-mono text-xs tracking-wider', errorClass)}
        />
      ) : (
        <InputField
          autoFocus={autoFocus}
          value={value}
          spellCheck={false}
          placeholder={meta.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className={cn('bg-background py-1.5 text-xs', meta.secret && 'font-mono', errorClass)}
        />
      )}
      {kind === 'totp' && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void scan(f);
              e.target.value = '';
            }}
          />
          <Button className={cn(SOFT_BTN, 'self-start')} onClick={() => fileRef.current?.click()}>
            <QrCode className="h-3.5 w-3.5" />
            Scan QR image
          </Button>
        </>
      )}
      {kind === 'backup' && (
        <span className="text-[11px] text-text-secondary">One code per line. Prefix a code with ~ to mark it as used.</span>
      )}
      {(error || scanError) && <span className="text-[11px] text-error">{error || scanError}</span>}
    </div>
  );
}

export default FieldInput;