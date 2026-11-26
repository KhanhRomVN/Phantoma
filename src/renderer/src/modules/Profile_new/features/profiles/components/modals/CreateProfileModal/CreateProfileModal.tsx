import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  HardDrive,
  Mail,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { decodeTotpFromImage } from '../../../../security';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import { profileApi } from '../../../../../shared/api/profile.api';
import {
  CANCEL_BTN,
  CONFIRM_BTN,
  EMAIL_RE,
  PHONE_RE,
  Field,
  estimateStrength,
  generatePassword,
  splitCodes,
} from '../../../../../shared/components/FormBits';
import { CreateProfileModalProps, FormState } from './create-profile-modal.types';
import { STRENGTH, BACKUP_TONES, INPUT, INPUT_ERROR, ICON_BTN } from './create-profile-modal.constants';
import { Section, TotpPreview } from './CreateProfileParts';

export function CreateProfileModal({
  isOpen,
  onClose,
  sources,
  defaultSourceId,
  existingEmails,
  onCreate,
}: CreateProfileModalProps) {
  const [f, setF] = useState<FormState>(() => ({
    sourceId: sources.find((s) => s.id === defaultSourceId)?.id ?? sources[0]?.id ?? '',
    email: '',
    displayName: '',
    password: '',
    recoveryEmail: '',
    phone: '',
    totpSecret: '',
    codes: [],
  }));
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [scanError, setScanError] = useState('');
  const [reuse, setReuse] = useState(0);

  useEffect(() => {
    if (f.password.length < 4) {
      setReuse(0);
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      profileApi.system
        .passwordReuse(f.password)
        .then((r) => {
          if (!cancelled) setReuse(r.count);
        })
        .catch(() => {
          if (!cancelled) setReuse(0);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [f.password]);

  const handleQr = async (file: Blob): Promise<void> => {
    try {
      setScanError('');
      const secret = await decodeTotpFromImage(file);
      setF((prev) => ({ ...prev, totpSecret: secret }));
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Failed to read image.');
    }
  };


  const set = <K extends keyof FormState>(key: K, value: FormState[K]): void =>
    setF((prev) => ({ ...prev, [key]: value }));

  const addCodes = (text: string): void => {
    const next = splitCodes(text);
    if (next.length === 0) return;
    setF((prev) => ({ ...prev, codes: Array.from(new Set([...prev.codes, ...next])) }));
  };

  const removeCode = (code: string): void =>
    setF((prev) => ({ ...prev, codes: prev.codes.filter((c) => c !== code) }));

  const email = f.email.trim();
  const totp = f.totpSecret.replace(/\s+/g, '').toUpperCase();

  const errors = {
    sourceId: f.sourceId ? null : 'Create a source first',
    email: !email
      ? 'Email is required'
      : !EMAIL_RE.test(email)
        ? 'Enter a valid email'
        : existingEmails.some((e) => e.toLowerCase() === email.toLowerCase())
          ? 'This email already exists'
          : null,
    password: f.password ? null : 'Password is required',
    recoveryEmail: !f.recoveryEmail.trim()
      ? null
      : !EMAIL_RE.test(f.recoveryEmail.trim())
        ? 'Enter a valid email'
        : f.recoveryEmail.trim().toLowerCase() === email.toLowerCase()
          ? 'Recovery email must differ from the account email'
          : null,
    phone: f.phone.trim() && !PHONE_RE.test(f.phone.trim()) ? 'Enter a valid phone number' : null,
    totpSecret:
      totp && !/^[A-Z2-7]{16,}=*$/.test(totp)
        ? 'Base32 secret (A-Z, 2-7), at least 16 characters'
        : null,
  };
  const liveError =
    errors.email === 'This email already exists' || errors.recoveryEmail?.startsWith('Recovery email must');
  const show = (key: keyof typeof errors): string | null => {
    const live = (key === 'email' && errors.email === 'This email already exists') || (key === 'recoveryEmail' && !!liveError);
    return touched || live ? errors[key] : null;
  };
  const valid = Object.values(errors).every((e) => e === null);
  const strength = STRENGTH[estimateStrength(f.password)];
  const source = sources.find((s) => s.id === f.sourceId);

  const submit = (): void => {
    setTouched(true);
    if (!valid) return;
    const pending = splitCodes(codeDraft);
    onCreate({
      sourceId: f.sourceId,
      email,
      displayName: f.displayName.trim() || email.split('@')[0],
      password: f.password,
      passwordStrength: estimateStrength(f.password),
      recoveryEmail: f.recoveryEmail.trim(),
      phone: f.phone.trim(),
      totpSecret: totp,
      backupCodes: Array.from(new Set([...f.codes, ...pending])),
      group: 'Ungrouped',
      purpose: 'General',
      notes: '',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className='max-w-[820px]'>
      <div className='flex shrink-0 items-center gap-3 border-b border-border px-5 py-3'>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', TONE_CLASS.primary.icon)}>
          <UserRound className='h-4 w-4' />
        </span>
        <div className='min-w-0 flex-1'>
          <h3 className='flex flex-wrap items-center gap-2 text-base font-bold text-text-primary'>
            New profile for
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold',
                TONE_CLASS.primary.pill,
              )}
            >
              <HardDrive className='h-3 w-3' />
              {source?.name ?? 'Unknown source'}
            </span>
          </h3>
          <p className='mt-0.5 truncate text-xs text-text-secondary'>
            Store an account with its recovery and two-factor details
          </p>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='shrink-0 cursor-pointer rounded-md bg-card-background p-1.5 text-text-secondary transition-colors hover:bg-error/15 hover:text-error'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
      <ModalBody className='flex flex-col py-4'>
        <div
          className='flex flex-col'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !adding && (e.target as HTMLElement).tagName === 'INPUT') submit();
          }}
        >
              <Section title='Account' desc='Where this profile lives and how it signs in' icon={UserRound} tone='primary'>

                <div className='grid grid-cols-2 gap-3'>
                  <Field label='Email' error={show('email')}>
                    <input
                      autoFocus
                      value={f.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder='name@gmail.com'
                      className={cn(INPUT, show('email') && INPUT_ERROR)}
                    />
                  </Field>
                  <Field label='Display name' optional>
                    <input
                      value={f.displayName}
                      onChange={(e) => set('displayName', e.target.value)}
                      placeholder={email ? email.split('@')[0] : 'Defaults to the email name'}
                      className={INPUT}
                    />
                  </Field>
                </div>
                <Field
                  label='Password'
                  error={show('password')}
                  hint={
                    reuse > 0 ? (
                      <span className='text-warn'>
                        Already used by {reuse} other {reuse === 1 ? 'profile' : 'profiles'}
                      </span>
                    ) : undefined
                  }
                >
                  <div className='relative'>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={f.password}
                      onChange={(e) => set('password', e.target.value)}
                      placeholder='Account password'
                      className={cn(INPUT, 'pr-[72px] font-mono', show('password') && INPUT_ERROR)}
                    />
                    <div className='absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5'>
                      <button
                        type='button'
                        title='Generate password'
                        className={ICON_BTN}
                        onClick={() => {
                          set('password', generatePassword());
                          setShowPw(true);
                        }}
                      >
                        <RefreshCw className='h-3.5 w-3.5' />
                      </button>
                      <button type='button' title={showPw ? 'Hide' : 'Reveal'} className={ICON_BTN} onClick={() => setShowPw((v) => !v)}>
                        {showPw ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                      </button>
                    </div>
                  </div>
                  {f.password && (
                    <div className='flex items-center gap-2'>
                      <div className='flex flex-1 gap-1'>
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className={cn('h-1 flex-1 rounded-full', i <= strength.level ? TONE_CLASS[strength.tone].dot : 'bg-text-secondary/15')}
                          />
                        ))}
                      </div>
                      <span className={cn('text-[11px] font-medium', TONE_CLASS[strength.tone].pill.split(' ')[1])}>{strength.label}</span>
                    </div>
                  )}
                </Field>
              </Section>

              <Section title='Recovery' desc='Ways to get back into the account' icon={Mail} tone='info'>
                <div className='grid grid-cols-2 gap-3'>
                  <Field label='Recovery email' optional error={show('recoveryEmail')}>
                    <input
                      value={f.recoveryEmail}
                      onChange={(e) => set('recoveryEmail', e.target.value)}
                      placeholder='backup@mail.com'
                      className={cn(INPUT, show('recoveryEmail') && INPUT_ERROR)}
                    />
                  </Field>
                  <Field label='Phone number' optional error={show('phone')}>
                    <input
                      value={f.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder='+84 912 345 678'
                      className={cn(INPUT, 'font-mono', show('phone') && INPUT_ERROR)}
                    />
                  </Field>
                </div>
              </Section>

              <Section title='Two-factor authentication' desc='Authenticator secret and one-time backup codes' icon={ShieldCheck} tone='success'>
                <Field
                  label='TOTP secret'
                  optional
                  error={show('totpSecret') || scanError || null}
                  hint='Spaces are removed automatically. Paste (Ctrl+V) or upload a QR image to fill it in.'
                >
                  <div className='relative'>
                    <input
                      value={f.totpSecret}
                      onChange={(e) => {
                        setScanError('');
                        set('totpSecret', e.target.value);
                      }}
                      onPaste={(e) => {
                        const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
                        const file = item?.getAsFile();
                        if (file) {
                          e.preventDefault();
                          void handleQr(file);
                        }
                      }}
                      spellCheck={false}
                      placeholder='JBSW Y3DP EHPK 3PXP'
                      className={cn(INPUT, 'pr-[104px] font-mono uppercase tracking-wider', show('totpSecret') && INPUT_ERROR)}
                    />
                    <label
                      title='Upload a QR code image'
                      className='absolute right-1.5 top-1/2 flex h-7 -translate-y-1/2 cursor-pointer items-center gap-1.5 rounded-md bg-text-secondary/10 px-2 text-[11px] font-medium text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary'
                    >
                      <QrCode className='h-3.5 w-3.5' />
                      Scan QR
                      <input
                        type='file'
                        accept='image/*'
                        className='hidden'
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleQr(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </Field>
                {totp && <TotpPreview secret={totp} />}

                <Field
                  label='Backup codes'
                  optional
                  hint={
                    f.codes.length > 0
                      ? `${f.codes.length} unique ${f.codes.length === 1 ? 'code' : 'codes'} · Click a badge's x to remove it`
                      : 'Click + to add codes one by one, or paste a whole list.'
                  }
                >
                  <div className='grid grid-cols-4 gap-2'>
                    {f.codes.map((c, idx) => (
                      <span
                        key={c}
                        className={cn(
                          'group relative flex items-center justify-between gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs',
                          TONE_CLASS[BACKUP_TONES[idx % BACKUP_TONES.length]].pill,
                        )}
                      >
                        <span className='text-[9px] tabular-nums opacity-50'>{String(idx + 1).padStart(2, '0')}</span>
                        <span>{c}</span>
                        <button
                          type='button'
                          title='Remove'
                          onClick={() => removeCode(c)}
                          className='absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-background text-text-secondary shadow group-hover:flex hover:text-error'
                        >
                          <X className='h-2.5 w-2.5' />
                        </button>
                      </span>
                    ))}
                    {adding ? (
                      <div className='flex items-center gap-1.5 rounded-md border border-dashed border-primary/50 bg-input-background px-2 py-1.5'>
                        <span className='text-[9px] tabular-nums text-text-secondary/50'>{String(f.codes.length + 1).padStart(2, '0')}</span>
                        <input
                          autoFocus
                          value={codeDraft}
                          onChange={(e) => setCodeDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                              e.preventDefault();
                              addCodes(codeDraft);
                              setCodeDraft('');
                            } else if (e.key === 'Escape') {
                              e.stopPropagation();
                              setCodeDraft('');
                              setAdding(false);
                            } else if (e.key === 'Backspace' && !codeDraft && f.codes.length > 0) {
                              removeCode(f.codes[f.codes.length - 1]);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            addCodes(e.clipboardData.getData('text'));
                          }}
                          onBlur={() => {
                            addCodes(codeDraft);
                            setCodeDraft('');
                            setAdding(false);
                          }}
                          spellCheck={false}
                          placeholder='code'
                          className='min-w-0 flex-1 bg-transparent text-right font-mono text-xs text-text-primary outline-none placeholder:text-text-secondary/50'
                        />
                      </div>
                    ) : (
                      <button
                        type='button'
                        title='Add backup code'
                        onClick={() => setAdding(true)}
                        className='flex items-center justify-center rounded-md border border-dashed border-text-secondary/30 px-2 py-1.5 text-text-secondary transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary'
                      >
                        <Plus className='h-4 w-4' />
                      </button>
                    )}
                  </div>
                </Field>
              </Section>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose} className={cn(CANCEL_BTN, 'h-10 px-5 text-sm')}>
          Cancel
        </Button>
        <Button onClick={submit} className={cn(CONFIRM_BTN, 'h-10 px-5 text-sm')}>
          Create profile
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default CreateProfileModal;
