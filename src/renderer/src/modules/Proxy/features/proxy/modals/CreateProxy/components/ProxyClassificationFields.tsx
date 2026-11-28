import { Globe2, Lock, Share2 } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { COUNTRY_OPTIONS, Field, Select } from '../../../../../shared/components/form';
import type { Option } from '../../../../../shared/components/form';
import { Section } from '../../../../../shared/components/Section';
import { KIND_ICON } from '../../../../../shared/constants/kind-icon.constants';
import { KIND_META, KINDS } from '../../../../../shared/constants/proxy-meta.constants';
import { TONE_CLASS } from '../../../../../shared/constants/tone.constants';
import type { ProxyKind, ProxyOwnership } from '../../../../../shared/types/proxy-domain.types';
import type { Form } from '../CreateProxyModal.types';

const ownershipOptions: Option[] = [
  { value: 'private', label: 'Private', prefix: <Lock className="h-3.5 w-3.5 text-warn" /> },
  { value: 'shared', label: 'Shared', prefix: <Share2 className="h-3.5 w-3.5 text-success" /> },
];

interface ProxyClassificationFieldsProps {
  draft: Form;
  set: (patch: Partial<Form>) => void;
}

/** "Classification" section: proxy type, country and ownership. */
export function ProxyClassificationFields({ draft, set }: ProxyClassificationFieldsProps) {
  return (
    <Section title="Classification" icon={Globe2} tone="info">
      <div className="flex flex-col gap-3">
        <Field label="Type">
          <div className="grid grid-cols-2 gap-1.5">
            {KINDS.map((k: ProxyKind) => {
              const Icon = KIND_ICON[k];
              const active = draft.kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set({ kind: k })}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                    active
                      ? 'bg-text-secondary/20'
                      : 'bg-text-secondary/5 hover:bg-text-secondary/10',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      TONE_CLASS[KIND_META[k].tone].icon,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-text-primary">
                      {KIND_META[k].label}
                    </span>
                    <span className="block truncate text-[10px] text-text-secondary">
                      {KIND_META[k].description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full transition-opacity',
                      TONE_CLASS[KIND_META[k].tone].dot,
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Country">
            <Select
              value={draft.country}
              options={COUNTRY_OPTIONS}
              searchable
              onChange={(v) => set({ country: v })}
            />
          </Field>
          <Field label="Ownership">
            <Select
              value={draft.ownership}
              options={ownershipOptions}
              onChange={(v) => set({ ownership: v as ProxyOwnership })}
            />
          </Field>
        </div>
      </div>
    </Section>
  );
}
