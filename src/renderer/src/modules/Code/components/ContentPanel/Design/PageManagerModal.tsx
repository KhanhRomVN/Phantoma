/**
 * ------------------------------------------------------------------
 * Page Manager Modal
 * ------------------------------------------------------------------
 * Modal for managing all pages of a design — grid preview and
 * quick navigation between pages.
 * Renders previews from design-owned source code, independent
 * from template folder.
 * ------------------------------------------------------------------
 */

import { X } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import type { DesignProject, PageNode } from './types';
import { useRuntimeComponent } from './runtimeComponent';

interface PageManagerModalProps {
  project: DesignProject;
  currentPage: PageNode;
  onSelectPage: (page: PageNode) => void;
  onClose: () => void;
}

export function PageManagerModal({ project, currentPage, onSelectPage, onClose }: PageManagerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[90vw] h-[85vh] bg-sidebar-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">All Pages</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {project.pages.length} pages in {project.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {project.pages.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                files={project.files}
                isActive={page.id === currentPage.id}
                onClick={() => onSelectPage(page)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page Card ──────────────────────────────────────────────────────

interface PageCardProps {
  page: PageNode;
  files?: Record<string, string>;
  isActive: boolean;
  onClick: () => void;
}

function PageCard({ page, files, isActive, onClick }: PageCardProps) {
  const PageComponent = useRuntimeComponent(page.componentPath, files);

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden cursor-pointer transition-all hover:scale-[1.02] group',
        'border-2',
        isActive
          ? 'border-primary shadow-lg'
          : 'border-border hover:border-primary/50'
      )}
      onClick={onClick}
    >
      {/* Preview */}
      <div className="relative w-full aspect-[16/9] bg-background overflow-hidden">
        <div className="absolute top-0 left-0 w-[1280px] h-[720px] origin-top-left scale-[0.234375] pointer-events-none">
          <PageComponent />
        </div>

        {/* Overlay */}
        <div className={cn(
          'absolute inset-0 transition-opacity',
          isActive ? 'bg-primary/10' : 'bg-transparent group-hover:bg-background/20'
        )} />
      </div>

      {/* Info */}
      <div className="px-3 py-2 bg-sidebar-item-hover border-t border-border">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-mono text-[10px] px-1.5 py-0.5 rounded',
            isActive
              ? 'bg-primary/20 text-primary'
              : 'bg-background text-text-secondary/60'
          )}>
            {page.tag}
          </span>
          <span className={cn(
            'text-xs font-medium truncate',
            isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'
          )}>
            {page.name}
          </span>
          {page.isRoot && (
            <span className="ml-auto font-mono text-[9px] text-primary bg-primary/20 px-1.5 py-0.5 rounded">
              root
            </span>
          )}
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary shadow-lg" />
      )}
    </div>
  );
}