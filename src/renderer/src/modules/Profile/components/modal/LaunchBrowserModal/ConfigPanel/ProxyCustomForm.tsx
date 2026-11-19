import { useState } from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { CANCEL_BTN, CONFIRM_BTN, Field, InputField, NativeSelect } from '../../FormBits';
import { PROXY_PROTOCOLS } from '../../../../constants/proxy';
import type { ProxyDraft, ProxyProtocol } from '../../../../types';

interface ProxyCustomFormProps {
  draft: ProxyDraft;
  onChange: (next: ProxyDraft) => void;
  valid: boolean;
  onCancel: () => void;
  onAdd: () => void;
}

export function ProxyCustomForm({ draft, onChange, valid, onCancel, onAdd }: ProxyCustomFormProps) {
  const [showPass, setShowPass] = useState(false);
  const patch = (next: Partial<ProxyDraft>): void => onChange({ ...draft, ...next });

  return (
    <div className='flex flex-col gap-3 rounded-lg bg-background/60 p-3'>
      <div className='grid grid-cols-[120px_minmax(0,1fr)_100px] gap-3'>
        <Field label='Type'>
          <NativeSelect value={draft.protocol} onChange={(e) => patch({ protocol: e.target.value as ProxyProtocol })}>
            {PROXY_PROTOCOLS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label='Host'>
          <InputField value={draft.host} placeholder='proxy.example.com' onChange={(e) => patch({ host: e.target.value })} />
        </Field>
        <Field label='Port'>
          <InputField value={draft.port} placeholder='1080' inputMode='numeric' onChange={(e) => patch({ port: e.target.value })} />
        </Field>
      </div>
      <div className='grid grid-cols-2 gap-3'>
        <Field label='Username' optional>
          <InputField value={draft.user} onChange={(e) => patch({ user: e.target.value })} />
        </Field>
        <Field label='Password' optional>
          <div className='relative'>
            <InputField type={showPass ? 'text' : 'password'} value={draft.pass} className='pr-9' onChange={(e) => patch({ pass: e.target.value })} />
            <button
              type='button'
              onClick={() => setShowPass((v) => !v)}
              className='absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary'
            >
              {showPass ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
            </button>
          </div>
        </Field>
      </div>
      <div className='flex justify-end gap-2'>
        <Button className={cn('h-8 rounded-md', CANCEL_BTN)} onClick={onCancel}>
          Cancel
        </Button>
        <Button className={cn('h-8 rounded-md', CONFIRM_BTN)} disabled={!valid} onClick={onAdd}>
          <Plus className='h-3.5 w-3.5' />
          Add and use
        </Button>
      </div>
    </div>
  );
}