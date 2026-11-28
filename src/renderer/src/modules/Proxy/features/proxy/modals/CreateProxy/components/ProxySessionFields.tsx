import { CalendarDays, ChevronDown, Layers, X } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Calendar } from '@renderer/components/ui/Calendar';
import { Dropdown, DropdownContent, DropdownTrigger } from '@renderer/components/ui/Dropdown';
import { Field, INPUT, NumField, Switch } from '../../../../../shared/components/form';
import { Section } from '../../../../../shared/components/Section';
import { clampTime, pad2 } from '../../../utils/expiry';
import type { ExpiryParts } from '../../../utils/expiry';
import type { Form } from '../CreateProxyModal.types';

interface ProxySessionFieldsProps {
  draft: Form;
  set: (patch: Partial<Form>) => void;
  exp: ExpiryParts | null;
  setExpiry: (patch: Partial<ExpiryParts>) => void;
}

/** "Session & limits" section: bandwidth quota and expiry. */
export function ProxySessionFields({ draft, set, exp, setExpiry }: ProxySessionFieldsProps) {
  return (
    <Section title="Session & limits" icon={Layers} tone="warn">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-md bg-text-secondary/5 px-2.5 py-2">
          <div className="min-w-0">
            <div className="text-xs font-medium text-text-primary">
              Unlimited bandwidth
            </div>
            <div className="truncate text-[10px] text-text-secondary">
              No data cap on this proxy
            </div>
          </div>
          <Switch
            checked={draft.quotaTotalGb === null}
            onChange={(v) => set({ quotaTotalGb: v ? null : 100 })}
          />
        </div>
        <div
          className={cn(
            'grid gap-2.5',
            draft.quotaTotalGb !== null ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {draft.quotaTotalGb !== null && (
            <Field label="Bandwidth limit">
              <NumField
                value={draft.quotaTotalGb}
                min={1}
                suffix="GB"
                onChange={(v) => set({ quotaTotalGb: v })}
              />
            </Field>
          )}
          <Field
            label="Expiry (optional)"
            hint={
              exp && (
                <button
                  type="button"
                  onClick={() => set({ expiresAt: null })}
                  className="flex items-center gap-1 text-[11px] text-text-secondary transition-colors hover:text-text-primary"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )
            }
          >
            <Dropdown>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    INPUT,
                    'flex items-center justify-between gap-2 text-left hover:bg-text-secondary/15',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate font-mono">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    {exp
                      ? `${exp.date} ${pad2(exp.hour)}:${pad2(exp.minute)}`
                      : 'No expiry'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                </button>
              </DropdownTrigger>
              <DropdownContent className="w-[264px]">
                <Calendar
                  value={exp?.date ?? null}
                  onChange={(date) => setExpiry({ date })}
                />
                <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
                  <span className="text-[11px] font-medium text-text-secondary">
                    Time (24h)
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      disabled={!exp}
                      value={pad2(exp?.hour ?? 23)}
                      onChange={(e) =>
                        setExpiry({ hour: clampTime(e.target.value, 23) })
                      }
                      className="h-7 w-12 rounded-md bg-text-secondary/10 px-2 text-center font-mono text-xs text-text-primary outline-none focus:bg-text-secondary/15 disabled:opacity-50"
                    />
                    <span className="text-xs text-text-secondary">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      disabled={!exp}
                      value={pad2(exp?.minute ?? 59)}
                      onChange={(e) =>
                        setExpiry({ minute: clampTime(e.target.value, 59) })
                      }
                      className="h-7 w-12 rounded-md bg-text-secondary/10 px-2 text-center font-mono text-xs text-text-primary outline-none focus:bg-text-secondary/15 disabled:opacity-50"
                    />
                  </div>
                </div>
              </DropdownContent>
            </Dropdown>
          </Field>
        </div>
      </div>
    </Section>
  );
}
