import { cn } from '@renderer/shared/utils/cn';
import { useCodeStore } from '../../hooks/useCodeStore';
import { X, Globe, Smartphone, Monitor, Database, Plug, Palette, Table, Puzzle } from 'lucide-react';
import type { ReactNode } from 'react';

const TYPE_ICONS: Record<string, ReactNode> = {
  website: <Globe className="w-3.5 h-3.5" />,
  app: <Smartphone className="w-3.5 h-3.5" />,
  device: <Monitor className="w-3.5 h-3.5" />,
  database: <Database className="w-3.5 h-3.5" />,
  api: <Plug className="w-3.5 h-3.5" />,
  design: <Palette className="w-3.5 h-3.5" />,
  table: <Table className="w-3.5 h-3.5" />,
  extension: <Puzzle className="w-3.5 h-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  website: 'text-cyan',
  app: 'text-purple',
  device: 'text-green',
  database: 'text-blue',
  api: 'text-yellow',
  design: 'text-pink',
  table: 'text-teal',
  extension: 'text-accent', // Extension color
};

export function ServiceTabBar() {
  const projects = useCodeStore((s) => s.projects);
  const currentProjectId = useCodeStore((s) => s.currentProjectId);
  const setCurrentService = useCodeStore((s) => s.setCurrentService);
  const removeService = useCodeStore((s) => s.removeService);
  const project = projects.find((p) => p.id === currentProjectId);

  if (!project || project.services.length === 0) {
    return (
      <div className="flex items-center h-10 bg-sidebar-background border-b border-divider px-3 text-xs text-text-secondary/40">
        No services docked
      </div>
    );
  }

  const currentServiceId = project.currentServiceId;

  const handleCloseService = (e: React.MouseEvent, serviceId: string) => {
    e.stopPropagation();
    if (!currentProjectId) return;
    removeService(currentProjectId, serviceId);
  };

  return (
    <div className="flex items-center h-9 bg-sidebar-background border-b border-divider px-1 overflow-x-auto flex-shrink-0 gap-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {project.services.map((service) => {
        const isActive = service.id === currentServiceId;
        const colorClass = TYPE_COLORS[service.type] || 'text-text-secondary';
        return (
          <button
            key={service.id}
            onClick={() => setCurrentService(service.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 h-full text-[13px] whitespace-nowrap transition-colors group',
              'border-t-2',
              isActive
                ? 'text-text-primary border-t-primary bg-background'
                : 'text-text-secondary border-t-transparent hover:text-text-secondary hover:border-t-divider hover:bg-sidebar-item-hover/30',
            )}
          >
            <span className={cn('text-sm', colorClass)}>{TYPE_ICONS[service.type] || '📄'}</span>
            <span>{service.name}</span>
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                service.status === 'running' && 'bg-success',
                service.status === 'stopped' && 'bg-text-secondary/30',
                service.status === 'building' && 'bg-warn animate-pulse',
                service.status === 'error' && 'bg-error',
              )}
            />
            {service.meta && (
              <span className="text-[11px] text-text-secondary/50">{service.meta}</span>
            )}
            
            {/* Close button */}
            <span
              onClick={(e) => handleCloseService(e, service.id)}
              className={cn(
                'p-0.5 rounded text-text-primary hover:text-error transition-colors ml-0.5',
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
            >
              <X className="w-3 h-3" strokeWidth={1.5} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
