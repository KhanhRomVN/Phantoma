import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Loader2, Mail, Pencil, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { BackupCode, Profile } from '../../../../types';
import { profileApi } from '../../../../services/profile-api.service';
import type { ProfileInput } from '../../../../services/profile-api.service';

import type { LucideIcon } from 'lucide-react';
import { TONE_CLASS } from '../../../../constants/tone';
import type { Tone } from '../../../../types/ui.types';
import { BackupCodesCard } from '../../common/BackupCode';
import { TotpCard } from '../../common/TOTP';
import { SecurityCard } from './SecurityCard';
import { DuplicateSection } from './DuplicateSection';
import type { DuplicateEntry } from './DuplicateSection';
import { useSaveState } from '../../common/useSaveState';
import { SaveIndicator } from '../../common/SaveIndicator';

interface CopyTextProps {
  value: string;
  children?: ReactNode;
  mono?: boolean;
  className?: string;
  label?: string;
}

function CopyText({
  value,
  children,
  mono = false,
  className,
  label = 'Click to copy',
}: CopyTextProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (): Promise<void> => {
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
        onClick={handleCopy}
        className={cn(
          'min-w-0 truncate text-left transition-colors',
          mono && 'font-mono',
          copied ? 'text-success' : 'hover:text-primary',
          className,
        )}
      >
        {children ?? value}
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
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md',
                TONE_CLASS[tone].icon,
              )}
            >
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

const ICON_BTN =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary';
const ICON_BTN_PRIMARY =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20 active:bg-primary/30';

const REVEAL_ON_HOVER = 'opacity-0 group-hover/section:opacity-100 focus-visible:opacity-100';

interface Creds {
  email: string;
  recoveryEmail: string;
  phone: string;
  password: string;
}

interface ValidationErrors {
  recoveryEmail?: string;
  phone?: string;
  password?: string;
}

function validateCreds(creds: Creds): ValidationErrors {
  const errors: ValidationErrors = {};
  if (creds.recoveryEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creds.recoveryEmail)) {
    errors.recoveryEmail = 'Invalid email format';
  }
  if (creds.phone && !/^\+?[0-9\s-()]+$/.test(creds.phone)) {
    errors.phone = 'Invalid phone format';
  }
  if (creds.password && creds.password.length < 6) {
    errors.password = 'Password too short';
  }
  return errors;
}

function CredRow({
  label,
  children,
  focusId,
}: {
  label: string;
  children?: ReactNode;
  focusId?: string;
}) {
  return (
    <div
      data-focus={focusId}
      className="flex min-h-[38px] items-center justify-between gap-3 border-b border-border/40 py-1.5 last:border-b-0"
    >
      <span className="shrink-0 text-[13px] text-text-secondary">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-[13px] text-text-primary">
        {children}
      </div>
    </div>
  );
}

function CredInput({
  value,
  onChange,
  placeholder,
  mono,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  mono?: boolean;
  error?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      placeholder={placeholder}
      className={cn(
        'h-7 w-full max-w-[240px] rounded-md border border-dashed bg-background/30 px-2 text-right text-[13px] text-text-primary outline-none transition-colors placeholder:text-text-secondary/50',
        error ? 'border-error focus:border-error' : 'border-primary focus:border-primary',
        mono && 'font-mono',
      )}
    />
  );
}

interface OverviewTabProps {
  profile: Profile;
  duplicates?: DuplicateEntry[];
  onOpenDuplicate?: (profileId: string) => void;
  onUpdate?: (patch: Partial<Profile>) => void;
  focus?: { target: string; nonce: number } | null;
  onFocusDone?: () => void;
}

export function OverviewTab({
  profile,
  duplicates = [],
  onOpenDuplicate,
  onUpdate,
  focus,
  onFocusDone,
}: OverviewTabProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!focus) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-focus="${focus.target}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlash(focus.target);
    const t = setTimeout(() => setFlash(null), 1600);
    onFocusDone?.();
    return () => clearTimeout(t);
  }, [focus?.nonce]);
  const [totpSecret, setTotpSecret] = useState<string | null>(profile.totpSecret);

  const totpSave = useSaveState();

  const saveTotp = async (next: string | null): Promise<boolean> => {
    const prev = totpSecret;
    setTotpSecret(next);
    return totpSave.run(async () => {
      try {
        await persist({ totpSecret: next, totpEnabled: !!next });
      } catch (e) {
        setTotpSecret(prev);
        throw e;
      }
    });
  };
  const [creds, setCreds] = useState<Creds>({
    email: profile.email,
    recoveryEmail: profile.recoveryEmail ?? '',
    phone: profile.phone ?? '',
    password: profile.password ?? '',
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Creds>(creds);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [codes, setCodes] = useState<BackupCode[]>(profile.backupCodes);

  const credSave = useSaveState();
  const codesSave = useSaveState();

  const persist = async (patch: ProfileInput): Promise<void> => {
    await profileApi.profiles.update(profile.id, patch);
    onUpdate?.(patch);
  };

  const commitCodes = (next: BackupCode[]): void => {
    const prev = codes;
    setCodes(next);
    void codesSave.run(async () => {
      try {
        await persist({ backupCodes: next });
      } catch (e) {
        setCodes(prev);
        throw e;
      }
    });
  };

  const setField = (key: keyof Creds) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const startEdit = (): void => {
    setDraft(creds);
    setErrors({});
    credSave.reset();
    setEditing(true);
  };

  const saveEdit = async (): Promise<void> => {
    const trimmed = {
      email: draft.email.trim(),
      recoveryEmail: draft.recoveryEmail.trim(),
      phone: draft.phone.trim(),
      password: draft.password,
    };
    const validationErrors = validateCreds(trimmed);
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      return;
    }
    const ok = await credSave.run(() =>
      persist({
        recoveryEmail: trimmed.recoveryEmail || null,
        phone: trimmed.phone || null,
        password: trimmed.password || null,
        hasPassword: !!trimmed.password,
      }),
    );
    if (!ok) return;
    setCreds(trimmed);
    setEditing(false);
  };

  const hasChanges =
    draft.recoveryEmail !== creds.recoveryEmail ||
    draft.phone !== creds.phone ||
    draft.password !== creds.password;
  const hasErrors = Object.values(errors).some(Boolean);
  const canSave = hasChanges && !hasErrors;

  const credAction = editing ? (
    <div className="flex items-center gap-1.5">
      <SaveIndicator
        status={credSave.status}
        error={credSave.error}
        onRetry={() => void saveEdit()}
        className="max-w-[200px]"
      />
      <Tooltip content="Cancel" side="top">
        <button
          type="button"
          onClick={() => {
            credSave.reset();
            setEditing(false);
          }}
          disabled={credSave.saving}
          className={cn(ICON_BTN, credSave.saving && 'cursor-not-allowed opacity-40')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
      <Tooltip content={credSave.saving ? 'Saving...' : canSave ? 'Save' : 'No valid changes'} side="top">
        <button
          type="button"
          onClick={() => void saveEdit()}
          disabled={!canSave || credSave.saving}
          className={cn(ICON_BTN_PRIMARY, (!canSave || credSave.saving) && 'cursor-not-allowed opacity-40')}
        >
          {credSave.saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </button>
      </Tooltip>
    </div>
  ) : (
    <div className="flex items-center gap-1.5">
      <Tooltip content="Edit" side="top">
        <button type="button" onClick={startEdit} className={cn(ICON_BTN, REVEAL_ON_HOVER)}>
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </Tooltip>
    </div>
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-3 pb-8">
      <SecurityCard profile={profile} />

      {onOpenDuplicate && <DuplicateSection items={duplicates} onOpen={onOpenDuplicate} />}

      <div
        data-focus="totp"
        className={cn('rounded-md transition-shadow', flash === 'totp' && 'ring-1 ring-primary')}
      >
        <TotpCard
          secret={totpSecret}
          onSave={saveTotp}
          status={totpSave.status}
          onReset={totpSave.reset}
        />
        <SaveIndicator status={totpSave.status} error={totpSave.error} className="px-3.5 pb-2" />
      </div>

      <Section
        title="Credentials & recovery"
        icon={Mail}
        tone="info"
        action={credAction}
        className={cn(
          'outline outline-1 -outline-offset-1 outline-dashed transition-[outline-color]',
          credSave.status === 'success' && 'outline-success',
          credSave.status === 'error' && 'outline-error',
          credSave.status !== 'success' && credSave.status !== 'error' && 'outline-transparent',
        )}
      >
        <CredRow label="Email">
          <CopyText value={creds.email} className="text-[13px]" />
        </CredRow>
        <CredRow label="Recovery email" focusId="recoveryEmail">
          {editing ? (
            <CredInput
              value={draft.recoveryEmail}
              onChange={setField('recoveryEmail')}
              placeholder="recovery@mail.com"
              error={!!errors.recoveryEmail}
            />
          ) : (
            creds.recoveryEmail && <CopyText value={creds.recoveryEmail} className="text-[13px]" />
          )}
        </CredRow>
        <CredRow label="Phone number" focusId="phone">
          {editing ? (
            <CredInput
              mono
              value={draft.phone}
              onChange={setField('phone')}
              placeholder="+84 ..."
              error={!!errors.phone}
            />
          ) : (
            creds.phone && <CopyText value={creds.phone} mono className="text-[13px]" />
          )}
        </CredRow>
        <CredRow label="Password" focusId="password">
          {editing ? (
            <CredInput
              mono
              value={draft.password}
              onChange={setField('password')}
              placeholder="Enter password"
              error={!!errors.password}
            />
          ) : (
            creds.password && (
              <CopyText
                value={creds.password}
                className="text-[13px] tracking-[0.25em]"
                label="Click to copy password"
              >
                *****
              </CopyText>
            )
          )}
        </CredRow>
      </Section>

      <div
        data-focus="backup"
        className={cn('rounded-md transition-shadow', flash === 'backup' && 'ring-1 ring-primary')}
      >
        <BackupCodesCard codes={codes} onChange={commitCodes} status={codesSave.status} />
        <SaveIndicator status={codesSave.status} error={codesSave.error} className="px-3.5 pb-2" />
      </div>
    </div>
  );
}

export default OverviewTab;
