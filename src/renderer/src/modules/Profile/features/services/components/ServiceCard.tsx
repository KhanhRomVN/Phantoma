import type { CSSProperties } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import type { ServiceLink, ServiceStatus, ServiceTemplate } from '../../../shared/types';
import { TONE_CLASS } from '../../../shared/constants/tone.constants';
import { FIELD_KINDS } from '../constants/service-catalog.constants';
import { SERVICE_CATEGORIES, categoryChipStyle, categoryOf } from '../constants/service-category.constants';
import { resolveKind } from '../utils/service.util';
import { ServiceIcon, ServiceStatusBadge } from './ServiceBadges';

interface ServiceCardProps {
  link: ServiceLink;
  template?: ServiceTemplate;
  index?: number;
  onOpen: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

const MAX_FIELDS = 4;
const BADGE =
  'inline-flex shrink-0 items-center gap-1 rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary';

const CARD_TEXTURE: Partial<Record<ServiceStatus, CSSProperties>> = {
  suspended: {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 5px, rgba(96,165,250,0.2) 5px 6px)',
  },
  banned: {
    backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgba(248,113,113,0.22) 5px 6px)',
  },
  deleted: {
    backgroundImage: 'radial-gradient(rgba(148,163,184,0.45) 1px, transparent 1.2px)',
    backgroundSize: '7px 7px',
  },
};

export function ServiceCard({ link, template, index = 0, onOpen, onContextMenu }: ServiceCardProps) {
  const category = SERVICE_CATEGORIES[categoryOf(link)];
  const categoryColor = categoryChipStyle(categoryOf(link), false).color;
  const shown = link.customFields.slice(0, MAX_FIELDS);
  const hidden = link.customFields.length - shown.length;
  const has2fa = (template?.twoFactor.length ?? 0) > 0;
  const hasRecovery = link.customFields.some((f) => {
    const kind = resolveKind(f, template);
    return (kind === 'totp' || kind === 'backup') && f.value.trim() !== '';
  });
  const missing2fa = has2fa && !hasRecovery;

  return (
    <button
      type="button"
      onClick={() => onOpen(link.id)}
      onContextMenu={(e) => {
        if (!onContextMenu) return;
        e.preventDefault();
        onContextMenu(e, link.id);
      }}
      style={{ ...CARD_TEXTURE[link.status], animationDelay: `${Math.min(index, 8) * 30}ms` }}
      className={cn(
        'flex w-full items-center gap-3 rounded-md bg-card-background px-3.5 py-3 text-left transition-colors animate-in fade-in-0 slide-in-from-bottom-1 duration-200 [animation-fill-mode:backwards] hover:bg-text-secondary/10',
        (link.status === 'banned' || link.status === 'deleted') && 'opacity-70',
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-text-secondary/10">
        <ServiceIcon name={link.name} url={template?.url} size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-text-primary">{link.name}</span>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {missing2fa && (
              <Tooltip content="2FA enabled but no TOTP secret or backup codes" side="top">
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS.warn.icon)}>
                  <ShieldAlert className="h-3.5 w-3.5" />
                </span>
              </Tooltip>
            )}
            <ServiceStatusBadge status={link.status} />
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className={BADGE}>
            <category.icon className="h-2.5 w-2.5" style={{ color: categoryColor }} />
            {category.label}
          </span>
          {shown.map((f, i) => {
            const meta = FIELD_KINDS[resolveKind(f, template)];
            return (
              <span key={`${f.key}-${i}`} className={BADGE}>
                <span className={cn('flex !h-auto !w-auto items-center justify-center !bg-transparent', TONE_CLASS[meta.tone].icon)}>
                  <meta.icon className="h-2.5 w-2.5" />
                </span>
                {f.key}
              </span>
            );
          })}
          {hidden > 0 && (
            <span className="rounded-md bg-text-secondary/10 px-1.5 py-0.5 text-[10px] tabular-nums text-text-secondary">
              +{hidden}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default ServiceCard;