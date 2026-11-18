import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import type { ProxySource } from '../../types';
import { proxyApi } from '../../services/proxy-api.service';
import { VpnSourceModal } from './VpnSourceModal';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  source?: ProxySource | null;
  onSaved: (sourceId: string) => void;
}

const INPUT =
  'h-9 w-full rounded-md bg-text-secondary/10 px-3 text-xs text-text-primary outline-none transition-colors placeholder:text-text-secondary/70 focus:bg-text-secondary/15';
const SOFT_PRIMARY = 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30';

function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode }) {
  return (
    <div className='flex min-w-0 flex-col gap-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-[11px] font-medium text-text-secondary'>{label}</span>
        {hint && <span className='truncate text-[10px] text-text-secondary'>{hint}</span>}
      </div>
      {children}
      {error && <span className='text-[11px] text-error'>{error}</span>}
    </div>
  );
}

function StandardSourceModal({ isOpen, onClose, existingNames, source, onSaved }: SourceModalProps) {
  const editing = Boolean(source);
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTouched(false);
    setBusy(false);
    setError(null);
    setName(source?.name ?? '');
    setWebsiteUrl(source?.url ?? '');
  }, [isOpen, source]);

  const trimmed = name.trim();
  const nameError = !trimmed
    ? 'Name is required'
    : existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())
      ? 'A source with this name already exists'
      : null;

  const submit = async (): Promise<void> => {
    setTouched(true);
    if (nameError) return;
    setBusy(true);
    setError(null);
    try {
      const input = { name: trimmed, websiteUrl: websiteUrl.trim() };
      const id = source ? (await proxyApi.sources.update(source.id, input)).id : (await proxyApi.sources.create(input)).id;
      onSaved(id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false} className='max-w-lg'>
      <ModalHeader
        title={editing ? 'Edit source' : 'New source'}
        description='A source groups proxies stored in the table'
        onClose={onClose}
      />
      <ModalBody className='flex flex-col gap-4 py-4'>
        <Field label='Source name' error={touched ? nameError : null}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='e.g. MuaProxy.vn'
            spellCheck={false}
            className={cn(INPUT, touched && nameError && 'bg-error/10 focus:bg-error/15')}
          />
        </Field>
        <Field label='Website' hint='Optional · used for the favicon'>
          <div className='flex items-center gap-2'>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-text-secondary/10'>
              <Favicon
                url={websiteUrl.trim() ? getFaviconUrl(/^https?:\/\//i.test(websiteUrl.trim()) ? websiteUrl.trim() : `https://${websiteUrl.trim()}`, 64) : undefined}
                size={16}
                className='shrink-0 rounded-sm'
                fallbackIcon={<Globe className='h-4 w-4 shrink-0 text-text-secondary' />}
              />
            </span>
            <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder='e.g. https://muaproxy.vn' spellCheck={false} className={INPUT} />
          </div>
        </Field>

        {error && <p className='rounded-md bg-error/10 px-3 py-2 text-[11px] leading-relaxed text-error'>{error}</p>}
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
          disabled={busy}
          className={cn('flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium disabled:opacity-50', SOFT_PRIMARY)}
        >
          {busy && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
          {editing ? 'Save changes' : 'Create source'}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export function SourceModal(props: SourceModalProps) {
  if (props.source?.vpn) {
    return <VpnSourceModal isOpen={props.isOpen} onClose={props.onClose} source={props.source} onSaved={props.onSaved} />;
  }
  return <StandardSourceModal {...props} />;
}

export default SourceModal;