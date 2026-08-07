import { Plus, X, CircleDot } from 'lucide-react';
import { useCodeStore } from '../../hooks/useCodeStore';
import { cn } from '@renderer/shared/utils/cn';

interface ProjectTabBarProps {
  onOpenManager: () => void;
}

export function ProjectTabBar({ onOpenManager }: ProjectTabBarProps) {
  const { projects, currentProjectId, setCurrentProject, removeProject } = useCodeStore();

  return (
    <div className="flex items-center h-10 bg-sidebar-background border-b border-divider px-2 overflow-x-auto flex-shrink-0 gap-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {projects.map((project) => {
        const isActive = project.id === currentProjectId;
        const hasUnsaved = project.unsavedFiles && project.unsavedFiles.size > 0;

        return (
          <button
            key={project.id}
            onClick={() => setCurrentProject(project.id)}
            className={cn(
              'flex items-center gap-2 px-3 h-full text-xs font-medium whitespace-nowrap border-b-2 transition-colors group',
              isActive
                ? 'text-text-primary'
                : 'text-text-secondary border-transparent hover:text-text-secondary hover:border-divider',
            )}
            style={isActive ? { borderBottomColor: project.color } : undefined}
          >
            <span
              className="w-2 h-2 rounded-[2px] flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            {project.name}

            {/* Unsaved indicator / Close button — matching FileTabBar pattern */}
            {hasUnsaved ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(project.id);
                }}
                className={cn(
                  'p-0.5 rounded text-warning hover:text-error transition-colors ml-0.5 group/close',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
                title="Project has unsaved changes"
              >
                <CircleDot
                  className="w-3 h-3 group-hover/close:hidden"
                  strokeWidth={2}
                  fill="currentColor"
                />
                <X className="w-3 h-3 hidden group-hover/close:block" strokeWidth={2.5} />
              </span>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeProject(project.id);
                }}
                className={cn(
                  'p-0.5 rounded text-text-primary hover:text-error transition-colors ml-0.5',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </span>
            )}
          </button>
        );
      })}
      <button
        onClick={onOpenManager}
        className="flex items-center justify-center w-6 h-6 ml-1 rounded border border-dashed text-text-secondary/40 hover:text-text-secondary hover:border-text-secondary/40 transition-colors flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5 text-text-secondary" strokeWidth={1.5} />
      </button>
      <div className="flex-1 min-w-4" />
    </div>
  );
}
