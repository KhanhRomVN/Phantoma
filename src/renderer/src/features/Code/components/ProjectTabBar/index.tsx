import { Plus } from 'lucide-react';
import { useCodeStore } from '../../hooks/useCodeStore';
import { cn } from '../../../../shared/lib/utils';

interface ProjectTabBarProps {
  onOpenManager: () => void;
}

export function ProjectTabBar({ onOpenManager }: ProjectTabBarProps) {
  const { projects, currentProjectId, setCurrentProject } = useCodeStore();

  return (
    <div className="flex items-center h-8 bg-sidebar-background border-b border-divider px-2 overflow-x-auto flex-shrink-0">
      {projects.map((project) => {
        const isActive = project.id === currentProjectId;
        const running = project.services.filter((s) => s.status === 'running').length;
        return (
          <button
            key={project.id}
            onClick={() => setCurrentProject(project.id)}
            className={cn(
              'flex items-center gap-2 px-3 h-full text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
              isActive
                ? 'text-text-primary border-primary'
                : 'text-text-secondary/60 border-transparent hover:text-text-secondary hover:border-divider'
            )}
          >
            <span
              className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            {project.name}
            <span className="text-[9px] text-text-secondary/40">
              {running}/{project.services.length}
            </span>
          </button>
        );
      })}
      <button
        onClick={onOpenManager}
        className="flex items-center justify-center w-6 h-6 ml-1 rounded hover:bg-sidebar-item-hover text-text-secondary/40 hover:text-text-secondary transition-colors flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
      </button>
      <div className="flex-1 min-w-4" />
    </div>
  );
}