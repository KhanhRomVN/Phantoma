import type { CSSProperties } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { BackupFieldTip, isBackupField } from './common/BackupFieldTip';
import { cn } from '@renderer/utils/cn';
import { TONE_CLASS } from '../constants/tone';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { Profile, ServiceStatus } from '../types';
import { useTotp } from '../utils/totp';
import { Avatar } from './common/Avatar';

interface ProfileCardGridProps {
  profiles: Profile[];
  service: string;
  selectedId: string | null;
  showSource: boolean;
  sourceNames: Record<string, string>;
  onSelect: (id: string, target?: { tab: 'overview' | 'services'; target: string }) => void;
}

// ASSUMED: texture theo status của service đang lọc, dùng cùng màu rgba với ROW_TEXTURE của ProfileTable
const CARD_TEXTURE: Partial<Record<ServiceStatus, CSSProperties>> = {
  suspended: {
    backgroundImage:
      'repeating-linear-gradient(45deg, transparent 0 5px, rgba(96,165,250,0.2) 5px 6px)',
  },
  banned: {
    backgroundImage:
      'repeating-linear-gradient(135deg, transparent 0 5px, rgba(248,113,113,0.22) 5px 6px)',
  },
  deleted: {
    backgroundImage: 'radial-gradient(rgba(148,163,184,0.45) 1px, transparent 1.2px)',
    backgroundSize: '7px 7px',
  },
};

function TotpTip({ secret }: { secret: string }) {
  const { code, invalid } = useTotp(secret);
  if (invalid || !code) return <span className="text-[11px]">Invalid secret</span>;
  return (
    <span className="font-mono text-sm font-semibold tracking-widest">
      {code.slice(0, 3)} {code.slice(3)}
    </span>
  );
}

export function ProfileCardGrid({
  profiles,
  service,
  selectedId,
  showSource,
  sourceNames,
  onSelect,
}: ProfileCardGridProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-md bg-card-background p-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {profiles.map((p) => {
          const link = p.services.find((s) => s.name === service);
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id)}
              style={link ? CARD_TEXTURE[link.status] : undefined}
              className={cn(
                'flex cursor-pointer flex-col gap-2.5 rounded-md bg-text-secondary/5 p-3 transition-colors hover:bg-text-secondary/10',
                selectedId === p.id && 'bg-text-secondary/15 hover:bg-text-secondary/15',
              )}
            >
              <div className="flex items-center gap-2.5">
                <Avatar name={p.displayName} hue={p.avatarHue} src={p.avatarUrl} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-text-primary">{p.displayName}</div>
                  <div className="truncate text-[11px] text-text-secondary">
                    {p.email}
                    {showSource && <span>{` • ${sourceNames[p.sourceId] ?? ''}`}</span>}
                  </div>
                </div>
              </div>
              {link && link.customFields.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  {link.customFields.map((f, i) => (
                    <Tooltip
                      key={`${f.key}-${i}`}
                      side="top"
                      contentClassName="max-w-none"
                      content={
                        (f.kind === 'totp' || /totp/i.test(f.key)) && f.value ? (
                          <TotpTip secret={f.value} />
                        ) : isBackupField(f) ? (
                          <BackupFieldTip value={f.value} />
                        ) : (
                          <span className="max-w-[280px] break-all font-mono text-[11px]">{f.value || '—'}</span>
                        )
                      }
                    >
                      <span
                        className="flex h-5 cursor-pointer items-center justify-center gap-1 rounded-md bg-text-secondary/10 px-1.5 text-[10px] text-text-secondary transition-opacity hover:opacity-80"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(p.id, { tab: 'services', target: link.id });
                        }}
                      >
                        {f.kind === 'totp' || /totp/i.test(f.key) ? (
                          <>
                            <ShieldCheck className={cn('h-3 w-3 shrink-0 bg-transparent', TONE_CLASS.primary.icon)} />
                            TOTP
                          </>
                        ) : isBackupField(f) ? (
                          <>
                            <KeyRound className={cn('h-3 w-3 shrink-0', TONE_CLASS.warn.icon)} />
                            BackupCode
                          </>
                        ) : (
                          f.key
                        )}
                      </span>
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProfileCardGrid;