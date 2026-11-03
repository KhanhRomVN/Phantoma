import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Image as ImageIcon, Info, SlidersHorizontal, X } from 'lucide-react';
import { Modal } from '@renderer/components/ui/Modal';
import { cn } from '@renderer/shared/utils/cn';
import { OverviewTab } from './tabs/OverviewTab';
import { GeneralTab } from './tabs/GeneralTab';
import { LogoTab } from './tabs/LogoTab';
import {
  ProjectMark,
  type ProjectSettingsPatch,
  type ProjectSettingsTabId,
  type ProjectSettingsTarget,
} from './shared';

export type { ProjectSettingsPatch, ProjectSettingsTarget } from './shared';

interface TabProps {
  project: ProjectSettingsTarget;
  onChange: (patch: ProjectSettingsPatch) => void;
}

interface TabDefinition {
  id: ProjectSettingsTabId;
  label: string;
  icon: ReactNode;
  component: ComponentType<TabProps>;
}

const TABS: TabDefinition[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Info className='h-4 w-4' />,
    component: ({ project }) => <OverviewTab project={project} />,
  },
  {
    id: 'general',
    label: 'General',
    icon: <SlidersHorizontal className='h-4 w-4' />,
    component: GeneralTab,
  },
  {
    id: 'logo',
    label: 'Logo',
    icon: <ImageIcon className='h-4 w-4' />,
    component: LogoTab,
  },
];

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectSettingsTarget | null;
  onChange: (id: string, patch: ProjectSettingsPatch) => void;
}

export function ProjectSettingsModal({
  isOpen,
  onClose,
  project,
  onChange,
}: ProjectSettingsModalProps) {
  const [tab, setTab] = useState<ProjectSettingsTabId>('overview');
  const projectId = project?.id;

  useEffect(() => {
    if (isOpen) setTab('overview');
  }, [isOpen, projectId]);

  if (!project) return null;

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const ActiveTab = active.component;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className='w-[960px] max-w-[960px] h-[640px] max-h-[640px] overflow-hidden'
    >
      <div className='flex min-h-0 flex-1'>
        <aside className='flex w-[240px] shrink-0 flex-col border-r border-divider bg-sidebar-background/60 p-3'>
          <div className='flex items-center gap-3 px-2 pb-4 pt-2'>
            <ProjectMark
              name={project.name}
              color={project.color}
              logoPath={project.logoPath}
              size={36}
            />
            <div className='min-w-0'>
              <div className='truncate text-[13px] font-semibold text-text-primary'>
                {project.name}
              </div>
              <div className='text-[10.5px] text-text-secondary'>Project settings</div>
            </div>
          </div>

          <nav className='flex flex-col gap-1'>
            {TABS.map((t) => {
              const isActive = t.id === active.id;
              return (
                <button
                  key={t.id}
                  type='button'
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'relative flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-[13px] transition-colors',
                    isActive
                      ? 'bg-card-hover font-medium text-text-primary'
                      : 'text-text-secondary hover:bg-card-hover/60 hover:text-text-primary',
                  )}
                >
                  {isActive && (
                    <span className='absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary' />
                  )}
                  <span className={cn(isActive && 'text-primary')}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className='flex min-w-0 flex-1 flex-col'>
          <header className='flex h-14 shrink-0 items-center justify-between border-b border-divider px-7'>
            <h3 className='text-[15px] font-semibold text-text-primary'>{active.label}</h3>
            <button
              type='button'
              onClick={onClose}
              title='Close'
              className='grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary'
            >
              <X className='h-4 w-4' />
            </button>
          </header>
          <div className='custom-scrollbar min-h-0 flex-1 overflow-y-auto px-7 py-6'>
            <ActiveTab project={project} onChange={(patch) => onChange(project.id, patch)} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default ProjectSettingsModal;