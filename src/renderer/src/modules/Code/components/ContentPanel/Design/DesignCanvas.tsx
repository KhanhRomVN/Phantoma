/**
 * ------------------------------------------------------------------
 * Design Canvas
 * ------------------------------------------------------------------
 * Main canvas area showing the page editor
 * ------------------------------------------------------------------
 */

import { DetailMode } from './DetailMode';
import type { DesignProject, PageNode, SelectedElement } from './types';

interface DesignCanvasProps {
  project: DesignProject;
  viewMode: 'overview' | 'detail'; // Keep for compatibility but always detail
  deviceMode: 'desktop' | 'mobile';
  currentPage: PageNode;
  onOpenPage: (page: PageNode) => void;
  onElementSelect: (element: SelectedElement | null) => void;
  selectedElement: SelectedElement | null;
}

export function DesignCanvas({
  project,
  currentPage,
  deviceMode,
  onElementSelect,
  selectedElement,
}: DesignCanvasProps) {
  return (
    <div className="flex-1 relative overflow-auto bg-background [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px]">
      <DetailMode
        page={currentPage}
        files={project.files}
        deviceMode={deviceMode}
        onElementSelect={onElementSelect}
        selectedElement={selectedElement}
      />
    </div>
  );
}