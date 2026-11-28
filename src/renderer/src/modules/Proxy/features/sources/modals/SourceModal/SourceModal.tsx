import { useEffect, useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Favicon, getFaviconUrl } from '@renderer/utils/favicon';
import { Modal } from '@renderer/components/ui/Modal/Modal';
import { ModalHeader } from '@renderer/components/ui/Modal/ModalHeader';
import { ModalBody } from '@renderer/components/ui/Modal/ModalBody';
import { ModalFooter } from '@renderer/components/ui/Modal/ModalFooter';
import { ErrorNote, INPUT, SOFT_PRIMARY, ValidatedField as Field } from '../../../../shared/components/form';
import type { ProxySource } from '../../../../shared/types/source-domain.types';
import { toastService } from '@renderer/components/ui/Toast';
import { errorMessage } from '../../../../shared/utils/error';
import { sourcesApi } from '../../api/source.api';

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  source?: ProxySource | null;
  onSaved: (sourceId: string) => void;
}

export function SourceModal({ isOpen, onClose, existingNames, source, onSaved }: SourceModalProps) {
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
      const id = source ? (await sourcesApi.update(source.id, input)).id : (await sourcesApi.create(input)).id;
      onSaved(id);
      toastService.show({
        variant: 'success',
        title: source ? 'Source updated' : 'Source created',
        description: trimmed,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      toastService.show({
        variant: 'error',
        title: source ? 'Update source failed' : 'Create source failed',
        description: errorMessage(err),
      });
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

export default SourceModal;
