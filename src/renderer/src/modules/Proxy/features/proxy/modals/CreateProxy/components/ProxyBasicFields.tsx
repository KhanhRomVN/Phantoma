import { Eye, EyeOff, Plug } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Field, INPUT } from '../../../../../shared/components/form';
import { Section } from '../../../../../shared/components/Section';
import { PROTOCOLS, PROTOCOL_META } from '../../../../../shared/constants/proxy-meta.constants';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import type { ProxyProtocol } from '../../../../../shared/types/proxy-domain.types';
import type { Form } from '../CreateProxyModal.types';
import { ProxyQuickInput } from './ProxyQuickInput';

interface ProxyBasicFieldsProps {
  draft: Form;
  set: (patch: Partial<Form>) => void;
  hostError: boolean;
  portOk: boolean;
  reveal: boolean;
  onToggleReveal: () => void;
  quick: string;
  quickError: boolean;
  changeQuick: (value: string) => void;
  applyQuick: (text: string) => void;
}

/** "Connection" section: quick paste, protocol, host/port and credentials. */
export function ProxyBasicFields({
  draft,
  set,
  hostError,
  portOk,
  reveal,
  onToggleReveal,
  quick,
  quickError,
  changeQuick,
  applyQuick,
}: ProxyBasicFieldsProps) {
  return (
    <Section title="Connection" icon={Plug} tone="primary">
      <div className="flex flex-col gap-3">
        <ProxyQuickInput
          value={quick}
          error={quickError}
          onChange={changeQuick}
          onApply={applyQuick}
        />

        <Field label="Protocol">
          <div className="grid grid-cols-4 gap-1.5">
            {PROTOCOLS.map((p: ProxyProtocol) => (
              <button
                key={p}
                type="button"
                onClick={() => set({ protocol: p })}
                className={cn(
                  'h-9 rounded-md font-mono text-[11px] font-medium transition-colors',
                  draft.protocol === p
                    ? TONE_CLASS[PROTOCOL_META[p].tone].pill
                    : 'bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15',
                )}
              >
                {PROTOCOL_META[p].label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2.5">
          <Field
            label="Host"
            hint={
              hostError && <span className="text-[11px] text-error">Invalid host</span>
            }
          >
            <input
              className={cn(INPUT, 'font-mono', hostError && 'bg-error/10')}
              value={draft.host}
              spellCheck={false}
              placeholder="123.45.67.89 or gw.provider.io"
              onChange={(e) => set({ host: e.target.value })}
            />
          </Field>
          <Field
            label="Port"
            hint={!portOk && <span className="text-[11px] text-error">1–65535</span>}
          >
            <input
              className={cn(INPUT, 'font-mono', !portOk && 'bg-error/10')}
              type="number"
              value={draft.port}
              onChange={(e) => set({ port: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Username (optional)">
            <input
              className={INPUT}
              value={draft.username}
              autoComplete="off"
              onChange={(e) => set({ username: e.target.value })}
            />
          </Field>
          <Field label="Password (optional)">
            <div className="relative">
              <input
                className={cn(INPUT, 'pr-9')}
                type={reveal ? 'text' : 'password'}
                autoComplete="off"
                value={draft.password}
                onChange={(e) => set({ password: e.target.value })}
              />
              <button
                type="button"
                onClick={onToggleReveal}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
              >
                {reveal ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </Field>
        </div>
      </div>
    </Section>
  );
}
