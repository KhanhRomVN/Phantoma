import { cn } from '@renderer/utils/cn';
import type { FieldKind } from '../../../shared/types';
import { TotpCard, BackupCodesCard, parseBackup, serializeBackup } from '../../security';

export interface TwoFactorField {
  id: string;
  name: string;
  kind: FieldKind;
}

interface TwoFactorSectionProps {
  fields: TwoFactorField[];
  values: Record<string, string>;
  errors: Record<string, string | null>;
  touched: boolean;
  onChange: (id: string, value: string) => void;
  className?: string;
}

export function TwoFactorSection({ fields, values, errors, touched, onChange, className }: TwoFactorSectionProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-md', className)}>
      {fields.map((f) => {
        const value = values[f.id] ?? '';
        const error = touched ? (errors[f.id] ?? null) : null;
        return (
          <div key={f.id} className="flex flex-col gap-1.5">
            {f.kind === 'totp' ? (
              <TotpCard secret={value.trim() ? value : null} onSave={(s) => onChange(f.id, s ?? '')} />
            ) : (
              <BackupCodesCard
                codes={parseBackup(value)}
                onChange={(next) => onChange(f.id, serializeBackup(next))}
              />
            )}
            {error && <div className="text-[11px] text-error">{error}</div>}
          </div>
        );
      })}
    </div>
  );
}

export default TwoFactorSection;