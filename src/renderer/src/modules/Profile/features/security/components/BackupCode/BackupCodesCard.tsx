import type { ReactNode } from 'react';
import { KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import type { Tone } from '../../../../shared/types/ui.types';
import { saveOutlineClass } from '../../hooks/useSaveState';
import type { SaveStatus } from '../../hooks/useSaveState';
import { BackupItem, backupTone } from '../../utils/backup-code.util';
import { BackupCopyMenu } from './BackupCopyMenu';
import { BackupCodeGrid } from './BackupCodeGrid';

interface SectionProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

function Section({ title, icon: Icon, tone = 'muted', action, className, children }: SectionProps) {
  return (
    <section className={cn('group/section rounded-md bg-card-background', className)}>
      <header className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
          {Icon && (
            <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          {title}
        </div>
        {action}
      </header>
      <div className="px-3.5 pb-3.5">{children}</div>
    </section>
  );
}

interface BackupCodesCardProps {
  codes: BackupItem[];
  onChange: (next: BackupItem[]) => void;
  status?: SaveStatus;
}

export function BackupCodesCard({ codes, onChange, status = 'idle' }: BackupCodesCardProps) {
  const left = codes.filter((c) => !c.used).length;

  return (
    <Section
      title={`Backup codes (${left}/${codes.length} left)`}
      icon={KeyRound}
      tone={backupTone(left)}
      className={cn(saveOutlineClass(status), status === 'saving' && 'pointer-events-none opacity-70')}
      action={
        codes.length > 0 ? (
          <BackupCopyMenu codes={codes} />
        ) : undefined
      }
    >
      <BackupCodeGrid
        items={codes}
        onToggle={(idx) => onChange(codes.map((c, i) => (i === idx ? { ...c, used: !c.used } : c)))}
        onRemove={(idx) => onChange(codes.filter((_, i) => i !== idx))}
        onAdd={(added) => onChange([...codes, ...added.map((code) => ({ code, used: false }))])}
      />
    </Section>
  );
}

export default BackupCodesCard;
