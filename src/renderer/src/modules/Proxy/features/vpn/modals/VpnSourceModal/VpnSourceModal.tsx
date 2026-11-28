import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, Power, XCircle } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { ErrorNote, INPUT, SOFT_PRIMARY, ValidatedField as Field } from '../../../../shared/components/form';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { ProxySource, VpnProviderInfo } from '../../../../shared/types/source-domain.types';
import { errorMessage } from '../../../../shared/utils/error';
import { vpnApi } from '../../api/vpn.api';

interface VpnSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: ProxySource;
  onSaved: (sourceId: string) => void;
}

export function VpnSourceModal({ isOpen, onClose, source, onSaved }: VpnSourceModalProps) {
  const account = source.vpn;
  const [provider, setProvider] = useState<VpnProviderInfo | null>(null);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [reveal, setReveal] = useState<Set<string>>(new Set());
  const [activated, setActivated] = useState(false);
  const [secretsSet, setSecretsSet] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<'save' | 'activate' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !account) return;
    setTouched(false);
    setBusy(null);
    setError(null);
    setReveal(new Set());
    setCreds({ ...account.config });
    setActivated(account.activated);
    setSecretsSet(account.secretsSet);
    vpnApi
      .providers()
      .then((list) => setProvider(list.find((p) => p.id === account.provider) ?? null))
      .catch((err: unknown) => setError(errorMessage(err)));
  }, [isOpen, account]);

  const missing = (provider?.fields ?? []).filter((f) => f.required && !creds[f.key]?.trim() && !secretsSet.includes(f.key));
  const canSave = provider !== null && missing.length === 0;

  const setCred = (key: string, value: string): void => {
    setCreds((prev) => ({ ...prev, [key]: value }));
    setActivated(false);
  };

  const toggleReveal = (key: string): void =>
    setReveal((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const credentials = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const f of provider?.fields ?? []) {
      const value = (creds[f.key] ?? '').trim();
      if (f.secret && value === '') continue;
      out[f.key] = value;
    }
    return out;
  };

  const persist = () => vpnApi.update(source.id, { credentials: credentials() });

  const submit = async (): Promise<void> => {
    setTouched(true);
    if (!canSave) return;
    setBusy('save');
    setError(null);
    try {
      await persist();
      onSaved(source.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const activate = async (): Promise<void> => {
    setTouched(true);
    if (!canSave) return;
    setBusy('activate');
    setError(null);
    try {
      await persist();
      const next = await vpnApi.activate(source.id);
      setActivated(next.activated);
      setSecretsSet(next.secretsSet);
      setCreds((prev) => ({ ...prev, ...next.config }));
      onSaved(next.id);
    } catch (err) {
      setActivated(false);
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className='max-w-lg'>
      <ModalHeader title={source.name} description={provider?.description ?? source.description} onClose={onClose} />
      <ModalBody className='flex flex-col gap-4 py-4'>
        {provider?.fields.map((f) => {
          const stored = f.secret && secretsSet.includes(f.key);
          const shown = reveal.has(f.key);
          const err = touched && f.required && !creds[f.key]?.trim() && !stored ? `${f.label} is required` : null;
          return (
            <Field key={f.key} label={f.label} hint={f.required ? undefined : 'Optional'} error={err}>
              <div className='relative'>
                <input
                  value={creds[f.key] ?? ''}
                  onChange={(e) => setCred(f.key, e.target.value)}
                  type={f.secret && !shown ? 'password' : 'text'}
                  placeholder={stored ? 'Saved — leave blank to keep' : (f.placeholder ?? '')}
                  spellCheck={false}
                  autoComplete='off'
                  className={cn(INPUT, f.secret && 'pr-9', err && 'bg-error/10 focus:bg-error/15')}
                />
                {f.secret && (
                  <button
                    type='button'
                    onClick={() => toggleReveal(f.key)}
                    className='absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary'
                  >
                    {shown ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                  </button>
                )}
              </div>
            </Field>
          );
        })}

        {provider && (
          <div className='flex items-center gap-3 rounded-lg bg-card-background px-3 py-2.5'>
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', activated ? TONE_CLASS.success.pill : TONE_CLASS.warn.pill)}>
              {activated ? <CheckCircle2 className='h-4 w-4' /> : <XCircle className='h-4 w-4' />}
            </span>
            <div className='flex min-w-0 flex-1 flex-col'>
              <span className='text-xs font-medium text-text-primary'>{activated ? 'Account active' : 'Not activated'}</span>
              <span className='truncate text-[10px] text-text-secondary'>{provider.activation}</span>
            </div>
            <button
              type='button'
              onClick={() => void activate()}
              disabled={busy !== null || !canSave}
              className={cn('flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium disabled:opacity-50', SOFT_PRIMARY)}
            >
              {busy === 'activate' ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Power className='h-3.5 w-3.5' />}
              {busy === 'activate' ? 'Activating…' : activated ? 'Re-activate' : 'Activate'}
            </button>
          </div>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}
      </ModalBody>
      <ModalFooter className='items-center justify-end gap-2 border-t border-border px-5 py-3'>
        <button
          type='button'
          onClick={onClose}
          className='h-8 rounded-md bg-primary/10 px-3 text-xs font-medium text-text-secondary hover:bg-primary/20 hover:text-text-primary active:bg-primary/30'
        >
          Cancel
        </button>
        <button
          type='button'
          onClick={() => void submit()}
          disabled={busy !== null}
          className={cn('flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium disabled:opacity-50', SOFT_PRIMARY)}
        >
          {busy === 'save' && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
          Save changes
        </button>
      </ModalFooter>
    </Modal>
  );
}

export default VpnSourceModal;