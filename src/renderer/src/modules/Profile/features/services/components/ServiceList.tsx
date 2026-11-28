import { useMemo, useState } from 'react';
import { Check, Filter, Pencil, Plug, Plus, Search, Trash2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Button } from '@renderer/components/ui/Button';
import { Tooltip } from '@renderer/components/ui/Tooltip';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { ServiceLink, ServiceStatus, ServiceTemplate } from '../../../shared/types';
import { SERVICE_STATUS } from '../constants/service-status.constants';
import { TONE_CLASS } from '../../../shared/constants/tone.constants';
import { findTemplate, hostOf } from '../utils/service.util';
import { ServiceCard } from './ServiceCard';
import { ConfirmDeleteServiceModal } from './modals/ConfirmDeleteServiceModal';

interface ServiceListProps {
  links: ServiceLink[];
  templates: ServiceTemplate[];
  onOpen: (id: string) => void;
  onLink: (templateId: string | null) => void;
  onNewTemplate?: () => void;
  onEditTemplate?: (id: string) => void;
  onDelete: (id: string) => void;
}

const PRIMARY_BTN = 'rounded-md bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30';
const SOFT_BTN =
  'rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20';
const SECTION_LABEL = 'px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary';
const STATUS_ORDER = Object.keys(SERVICE_STATUS) as ServiceStatus[];
const STATUS_ICON = Object.fromEntries(STATUS_ORDER.map((s) => [s, SERVICE_STATUS[s].icon])) as Record<
  ServiceStatus,
  LucideIcon
>;

function toggleIn<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function ServiceList({ links, templates, onOpen, onLink, onEditTemplate, onDelete }: ServiceListProps) {
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuLink = menu ? links.find((l) => l.id === menu.id) : undefined;
  const menuTemplate = menuLink ? findTemplate(templates, menuLink) : undefined;
  const deletingLink = deletingId ? links.find((l) => l.id === deletingId) : undefined;
  const [statusFilter, setStatusFilter] = useState<Set<ServiceStatus>>(new Set());
  const filterCount = statusFilter.size;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((s) => {
      if (statusFilter.size > 0 && !statusFilter.has(s.status)) return false;
      if (!q) return true;
      const tpl = findTemplate(templates, s);
      return (
        s.name.toLowerCase().includes(q) ||
        hostOf(tpl?.url ?? '').includes(q) ||
        s.customFields.some((f) => f.key.toLowerCase().includes(q))
      );
    });
  }, [links, templates, query, statusFilter]);


  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, fields..."
            className="w-full rounded-lg border border-transparent bg-input-background py-1.5 pl-9 pr-8 text-sm text-text-primary outline-none transition-colors placeholder:text-text-secondary/60"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-text-secondary hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Dropdown align="end" width={200} closeOnSelect={false}>
          <DropdownTrigger asChild>
            <Button className={cn(filterCount > 0 ? PRIMARY_BTN : SOFT_BTN, 'relative h-8 w-8 p-0')}>
              <Filter className="h-3.5 w-3.5" />
              {filterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-medium tabular-nums text-white">
                  {filterCount}
                </span>
              )}
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <div className={SECTION_LABEL}>Status</div>
            {STATUS_ORDER.map((st) => {
              const StatusIcon = STATUS_ICON[st];
              const on = statusFilter.has(st);
              return (
                <DropdownItem
                  key={st}
                  icon={
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-md',
                        TONE_CLASS[SERVICE_STATUS[st].tone].icon,
                      )}
                    >
                      {on ? <Check className="h-3 w-3" /> : <StatusIcon className="h-3 w-3" />}
                    </span>
                  }
                  onClick={() => setStatusFilter((prev) => toggleIn(prev, st))}
                >
                  {SERVICE_STATUS[st].label}
                </DropdownItem>
              );
            })}
            {filterCount > 0 && (
              <>
                <DropdownSeparator />
                <DropdownItem
                  icon={<X className="h-3.5 w-3.5" />}
                  onClick={() => setStatusFilter(new Set())}
                >
                  Clear filters
                </DropdownItem>
              </>
            )}
          </DropdownContent>
        </Dropdown>
        <Tooltip content="Link service" side="top">
          <Button className={cn(PRIMARY_BTN, 'h-8 w-8 p-0')} onClick={() => onLink(null)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </Tooltip>
      </div>


      {links.length === 0 && (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-text-secondary/10 text-text-secondary">
            <Plug className="h-6 w-6" />
          </span>
          <div>
            <div className="text-sm font-semibold text-text-primary">No services linked yet</div>
            <div className="mt-0.5 text-xs text-text-secondary">Link a service to start tracking its fields.</div>
          </div>
          <Button className={cn(PRIMARY_BTN, 'mt-1 h-8 gap-1.5 px-3 text-xs font-medium')} onClick={() => onLink(null)}>
            <Plus className="h-3.5 w-3.5" />
            Link service
          </Button>
        </div>
      )}

      {links.length > 0 && filtered.length === 0 && (
        <div className="py-6 text-center text-xs text-text-secondary">
          {query.trim() ? `No service matches "${query}".` : 'No service matches the current filters.'}
        </div>
      )}

      {filtered.map((s, i) => (
        <ServiceCard
          key={s.id}
          link={s}
          template={findTemplate(templates, s)}
          index={i}
          onOpen={onOpen}
          onContextMenu={(e, id) => setMenu({ id, top: e.clientY, left: e.clientX })}
        />
      ))}

      <Dropdown
        className="absolute"
        open={menu !== null}
        onOpenChange={(o) => {
          if (!o) setMenu(null);
        }}
        strategy="fixed"
        position={menu ? { top: menu.top, left: menu.left } : undefined}
        width={180}
      >
        <DropdownTrigger asChild>
          <span className="block h-0 w-0" />
        </DropdownTrigger>
        <DropdownContent>
          {menuTemplate && onEditTemplate && (
            <DropdownItem icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => onEditTemplate(menuTemplate.id)}>
              Edit service
            </DropdownItem>
          )}
          {menuLink && (
            <DropdownItem
              variant="error"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setDeletingId(menuLink.id)}
            >
              Delete
            </DropdownItem>
          )}
        </DropdownContent>
      </Dropdown>

      <ConfirmDeleteServiceModal
        isOpen={!!deletingLink}
        name={deletingLink?.name ?? ''}
        onClose={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) onDelete(deletingId);
          setDeletingId(null);
        }}
      />
    </div>
  );
}

export default ServiceList;