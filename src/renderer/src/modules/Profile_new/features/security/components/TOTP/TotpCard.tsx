import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ClipboardPaste,
  Copy,
  KeyRound,
  Loader2,
  Pencil,
  QrCode,
  ShieldPlus,
  Smartphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Tone } from '../../../../shared/types/ui.types';
import { useTotp } from '../../utils/totp.util';
import { decodeTotpFromImage, extractTotpSecret } from '../../utils/qr.util';
import { saveOutlineClass } from '../../hooks/useSaveState';
import type { SaveStatus } from '../../hooks/useSaveState';
import { CopyButton } from './CopyBits';
import { TotpDisplay } from './TotpDisplay';

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

interface TotpCardProps {
  secret: string | null;
  onSave: (secret: string | null) => boolean | void | Promise<boolean | void>;
  status?: SaveStatus;
  onReset?: () => void;
}

const SOFT_BTN =
  'rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 active:bg-text-secondary/20';

const SOFT_PRIMARY_BTN =
  'rounded-md bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30';

const SOFT_ERROR_BTN = 'rounded-md bg-error/15 text-error hover:bg-error/25 active:bg-error/30';

export function TotpCard({ secret, onSave, status = 'idle', onReset }: TotpCardProps) {
  const saving = status === 'saving';
  const { code, remaining, invalid } = useTotp(secret);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [scanError, setScanError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const normalized = draft.replace(/\s+/g, '').toUpperCase();
  const draftInvalid = normalized.length > 0 && !/^[A-Z2-7]+=*$/.test(normalized);
  const preview = useTotp(normalized && !draftInvalid ? normalized : null);

  const handleImage = async (file: Blob): Promise<void> => {
    try {
      setScanError('');
      setDraft(await decodeTotpFromImage(file));
      setEditing(true);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Failed to read image.');
      setEditing(true);
    }
  };
  const pasteFromClipboard = async (): Promise<void> => {
    setScanError('');
    setDraft('');
    setEditing(true);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          await handleImage(await item.getType(imageType));
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      const secret = extractTotpSecret(text);
      if (secret) setDraft(secret);
      else setScanError('Clipboard has no image or valid TOTP secret.');
    } catch (e) {
      setScanError('Cannot read the clipboard.');
    }
  };

  const startEdit = (): void => {
    onReset?.();
    setDraft(secret ?? '');
    setEditing(true);
  };

  const save = async (): Promise<void> => {
    if (draftInvalid || saving) return;
    const ok = await onSave(normalized || null);
    if (ok !== false) setEditing(false);
  };

  const action = editing ? undefined : (
    <div className="flex items-center gap-1.5">
      {code && !invalid && <CopyButton value={code} label="Copy code" />}
      <Tooltip content="Edit secret" side="top">
        <button
          type="button"
          onClick={startEdit}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary opacity-0 transition-all hover:bg-text-secondary/15 focus-visible:opacity-100 group-hover/section:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  );

  return (
    <Section
      title="TOTP"
      icon={Smartphone}
      tone="primary"
      action={action}
      className={saveOutlineClass(status)}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImage(f);
          e.target.value = '';
        }}
      />
      {editing ? (
        <div className="flex flex-col gap-2">
          {preview.code && !preview.invalid && (
            <div className="rounded-md border border-dashed border-text-secondary/40 p-1.5">
              <TotpDisplay code={preview.code} remaining={preview.remaining} />
            </div>
          )}
          <textarea
            autoFocus
            rows={3}
            disabled={saving}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              const item = Array.from(e.clipboardData.items).find((i) =>
                i.type.startsWith('image/'),
              );
              const file = item?.getAsFile();
              if (file) {
                e.preventDefault();
                void handleImage(file);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void save();
              }
              if (e.key === 'Escape' && !saving) setEditing(false);
            }}
            spellCheck={false}
            placeholder="Base32 secret, e.g. JBSWY3DPEHPK3PXP"
            className="w-full resize-none break-all rounded-md border border-border bg-background/30 px-2.5 py-2 font-mono text-xs leading-relaxed tracking-wider text-text-primary outline-none transition-colors placeholder:text-text-secondary/60 focus:border-primary/50"
          />
          {draftInvalid && (
            <div className="text-[11px] text-error">
              Only letters A-Z and digits 2-7 are allowed (base32).
            </div>
          )}
          {scanError && <div className="text-[11px] text-error">{scanError}</div>}
          <div className="flex items-center justify-end gap-1.5">
            <Tooltip content="Scan QR image (or press Ctrl+V to paste one)" side="top">
              <Button className={SOFT_BTN} onClick={() => fileRef.current?.click()}>
                <QrCode className="h-3.5 w-3.5" />
                Scan QR
              </Button>
            </Tooltip>
            <Button className={cn(SOFT_BTN, 'mr-auto')} onClick={() => void pasteFromClipboard()}>
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste Clipboard
            </Button>
            {secret && (
              <Button
                className={SOFT_ERROR_BTN}
                disabled={saving}
                onClick={async () => {
                  const ok = await onSave(null);
                  if (ok !== false) setEditing(false);
                }}
              >
                Remove
              </Button>
            )}
            <Button
              className={SOFT_BTN}
              disabled={saving}
              onClick={() => {
                onReset?.();
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              className={SOFT_PRIMARY_BTN}
              disabled={draftInvalid || saving}
              onClick={() => void save()}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      ) : !secret ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-text-secondary/25 bg-background/30 px-4 py-5 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldPlus className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1">
            <div className="text-[13px] font-semibold text-text-primary">Two-factor not set up</div>
            <div className="max-w-[260px] text-xs leading-relaxed text-text-secondary">
              Add the base32 secret or scan a QR image to generate 6-digit codes here.
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button className={SOFT_BTN} onClick={() => fileRef.current?.click()}>
              <QrCode className="h-3.5 w-3.5" />
              Scan QR
            </Button>
            <Button className={SOFT_BTN} onClick={() => void pasteFromClipboard()}>
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste Clipboard
            </Button>
            <Button className={SOFT_PRIMARY_BTN} onClick={startEdit}>
              <KeyRound className="h-3.5 w-3.5" />
              Enter secret
            </Button>
          </div>
        </div>
      ) : invalid ? (
        <div className="text-xs text-error">The saved secret is not a valid base32 string.</div>
      ) : (
        <TotpDisplay code={code} remaining={remaining} />
      )}
    </Section>
  );
}

export default TotpCard;
