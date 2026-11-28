import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Mail, Pencil, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { BackupCode, ProfileInput } from '../../../../../../shared/types';
import { profileApi } from '../../../../../../shared/api/profile.api';
import {
  BackupCodesCard,
  TotpCard,
  SecurityCard,
  useSaveState,
  SaveIndicator,
} from '../../../../../security';
import { DuplicateSection } from '../DuplicateSection';
import { Creds, ValidationErrors, OverviewTabProps } from './overview-tab.types';
import { ICON_BTN, ICON_BTN_PRIMARY, REVEAL_ON_HOVER } from './overview-tab.constants';
import { validateCreds } from '../../../../utils/validate-creds.util';
import { CopyText, Section, CredRow, CredInput } from './OverviewParts';

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
