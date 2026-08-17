/**
 * ------------------------------------------------------------------
 * Design Tool
 * ------------------------------------------------------------------
 * Interactive design tool for creating and editing website designs
 * with a node-based architecture (sitemap view + detail editor).
 *
 * Main features:
 * - Overview mode: Visual sitemap with node cards
 * - Detail mode: Full page editor with element inspector
 * - Template-based projects (coffee shop, portfolio, etc.)
 * - Element selection and property editing
 * - Real-time visual updates
 * ------------------------------------------------------------------
 */

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Grid3x3 } from 'lucide-react';
import { cn } from '@renderer/shared/utils/cn';
import { DesignCanvas } from './DesignCanvas';
import { Inspector } from './Inspector';
import { PageManagerModal } from './PageManagerModal';
import type { DesignProject, PageNode, SelectedElement } from './types';

interface DesignToolProps {
  project: DesignProject;
  onSave?: (project: DesignProject) => void;
}

export function DesignTool({ project: initialProject, onSave }: DesignToolProps) {
  const [project, setProject] = useState<DesignProject>(initialProject);
  const [currentPage, setCurrentPage] = useState<PageNode | undefined>(project.pages?.[0]);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);

  // Guard against invalid or empty project
  if (!project?.pages?.length || !currentPage) {
    return (
      <div className="flex h-full w-full items-center justify-center text-text-secondary">
        No pages available. Create a page to start designing.
      </div>
    );
  }

  // Find current page index
  const currentPageIndex = project.pages.findIndex(p => p.id === currentPage.id);
  const canGoPrev = currentPageIndex > 0;
  const canGoNext = currentPageIndex < project.pages.length - 1;

  const handlePrevPage = useCallback(() => {
    if (canGoPrev) {
      setCurrentPage(project.pages[currentPageIndex - 1]);
      setSelectedElement(null);
    }
  }, [canGoPrev, currentPageIndex, project.pages]);

  const handleNextPage = useCallback(() => {
    if (canGoNext) {
      setCurrentPage(project.pages[currentPageIndex + 1]);
      setSelectedElement(null);
    }
  }, [canGoNext, currentPageIndex, project.pages]);

  const handleOpenPage = useCallback((page: PageNode) => {
    setCurrentPage(page);
    setSelectedElement(null);
    setIsGridModalOpen(false);
  }, []);

  const handleElementSelect = useCallback((element: SelectedElement | null) => {
    setSelectedElement(element);
  }, []);

  const handlePropertyUpdate = useCallback((updates: Record<string, any>) => {
    if (!selectedElement || !currentPage) return;

    // Update element properties
    setProject(prev => ({
      ...prev,
      pages: prev.pages.map(page =>
        page.id === currentPage.id
          ? {
              ...page,
              // Properties would be updated in the actual component file
            }
          : page
      ),
    }));

    // Trigger save if callback provided
    if (onSave) {
      onSave(project);
    }
  }, [selectedElement, currentPage, project, onSave]);

  return (
    <div className="flex h-full w-full bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-[52px] flex-shrink-0 border-b border-border bg-sidebar-background flex items-center gap-3.5 px-4.5 z-10">
          {/* Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevPage}
              disabled={!canGoPrev}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                canGoPrev
                  ? 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover'
                  : 'text-text-secondary/30 cursor-not-allowed'
              )}
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={!canGoNext}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                canGoNext
                  ? 'text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover'
                  : 'text-text-secondary/30 cursor-not-allowed'
              )}
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-border" />

          {/* Page Info */}
          <div className="flex items-center gap-1.75 font-mono text-xs">
            <span className="font-semibold text-text-primary">{project.name}</span>
            <span className="text-text-secondary/40">/</span>
            <span className="text-text-secondary">{currentPage.name}</span>
            <span className="text-text-secondary/40">
              ({currentPageIndex + 1}/{project.pages.length})
            </span>
          </div>

          <div className="flex-1" />

          {/* Grid View Button */}
          <button
            onClick={() => setIsGridModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-item-hover transition-colors"
            title="View all pages"
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            All Pages
          </button>
        </div>

        {/* Canvas Area */}
        <DesignCanvas
          project={project}
          viewMode="detail"
          deviceMode="desktop"
          currentPage={currentPage}
          onOpenPage={handleOpenPage}
          onElementSelect={handleElementSelect}
          selectedElement={selectedElement}
        />
      </div>

      {/* Inspector Panel (Right) - Show when element selected */}
      {selectedElement && (
        <Inspector
          element={selectedElement}
          onUpdate={handlePropertyUpdate}
          onClose={() => setSelectedElement(null)}
        />
      )}

      {/* Page Grid Modal */}
      {isGridModalOpen && (
        <PageManagerModal
          project={project}
          currentPage={currentPage}
          onSelectPage={handleOpenPage}
          onClose={() => setIsGridModalOpen(false)}
        />
      )}
    </div>
  );
}
