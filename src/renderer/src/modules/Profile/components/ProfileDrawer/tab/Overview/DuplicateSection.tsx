import { useState } from 'react';
import { ArrowUpRight, FolderOpen, Layers, Copy } from 'lucide-react';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
} from '@renderer/components/ui/Dropdown';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@renderer/utils/cn';
import { Avatar } from '../../../common/Avatar';
import type { Profile, ProfileSource } from '../../../../types';
import { TONE_CLASS } from '../../../../constants/tone';
import type { Tone } from '../../../../types/ui.types';

function Section({
  title,
  icon: Icon,
  tone = 'muted',
  children,
}: {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md bg-card-background p-3.5">
      <header className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-primary">
        {Icon && (
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', TONE_CLASS[tone].icon)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {title}
      </header>
      {children}
    </section>
  );
}

export interface DuplicateEntry {
  profile: Profile;
  source?: ProfileSource;
}

interface DuplicateSectionProps {
  items: DuplicateEntry[];
  onOpen: (profileId: string) => void;
}

function openSourceFolder(location?: string): void {
  if (!location) return;
  void (window as any).api?.invoke('shell:open-path', location);
}

export function DuplicateSection({ items, onOpen }: DuplicateSectionProps) {
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  if (items.length === 0) return null;

  const menuItem = menu ? (items.find((i) => i.profile.id === menu.id) ?? null) : null;
  const menuPath = menuItem?.source?.location;

  return (
    <Section title={`Also in other sources (${items.length})`} icon={Layers} tone="warn">
      <div className="flex flex-col gap-1.5">
        {items.map(({ profile, source }) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => onOpen(profile.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ id: profile.id, top: e.clientY, left: e.clientX });
            }}
            className="group/dup flex items-center gap-2.5 rounded-md bg-text-secondary/10 px-2.5 py-1.5 text-left transition-colors hover:bg-text-secondary/15"
          >
            <Avatar name={profile.displayName} hue={profile.avatarHue} src={profile.avatarUrl} size={24} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] text-text-primary">{source?.name ?? 'Unknown source'}</span>
              <span className="truncate font-mono text-[11px] text-text-secondary">{source?.location ?? ''}</span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-text-secondary transition-colors group-hover/dup:text-text-primary" />
          </button>
        ))}
      </div>

      <Dropdown
        className="absolute"
        open={menu !== null}
        onOpenChange={(o) => {
          if (!o) setMenu(null);
        }}
        strategy="fixed"
        position={menu ? { top: menu.top, left: menu.left } : undefined}
        width={200}
      >
        <DropdownTrigger asChild>
          <span className="block h-0 w-0" />
        </DropdownTrigger>
        <DropdownContent>
          {menuItem && (
            <>
              <DropdownItem
                icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                onClick={() => onOpen(menuItem.profile.id)}
              >
                Switch to source
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                icon={<FolderOpen className="h-3.5 w-3.5" />}
                onClick={() => openSourceFolder(menuPath)}
              >
                Open in folder
              </DropdownItem>
              <DropdownItem
                icon={<Copy className="h-3.5 w-3.5" />}
                onClick={() => menuPath && void navigator.clipboard.writeText(menuPath).catch(() => undefined)}
              >
                Copy path
              </DropdownItem>
            </>
          )}
        </DropdownContent>
      </Dropdown>
    </Section>
  );
}

export default DuplicateSection;