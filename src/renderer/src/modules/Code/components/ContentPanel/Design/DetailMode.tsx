/**
 * ------------------------------------------------------------------
 * Detail Mode
 * ------------------------------------------------------------------
 * Full page editor with element selection and hover states.
 * Renders page components from design-owned source code via
 * runtimeComponent, so designs are independent from templates.
 * ------------------------------------------------------------------
 */

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import type { PageNode, SelectedElement } from './types';
import { useRuntimeComponent } from './runtimeComponent';

interface DetailModeProps {
  page: PageNode;
  files?: Record<string, string>;
  deviceMode: 'desktop' | 'mobile';
  onElementSelect: (element: SelectedElement | null) => void;
  selectedElement: SelectedElement | null;
}

export function DetailMode({
  page,
  files,
  deviceMode,
  onElementSelect,
  selectedElement,
}: DetailModeProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const PageComponent = useRuntimeComponent(page.componentPath, files);

  // Handle element clicks
  useEffect(() => {
    if (!stageRef.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const hoverable = target.closest('[data-element-id]');

      if (hoverable) {
        e.stopPropagation();
        const elementId = hoverable.getAttribute('data-element-id');
        const elementLabel = hoverable.getAttribute('data-element-label');
        const elementType = hoverable.getAttribute('data-element-type') as any;

        if (elementId && elementLabel) {
          const computedStyle = window.getComputedStyle(hoverable);

          onElementSelect({
            id: elementId,
            label: elementLabel,
            type: elementType || 'container',
            properties: {
              fontSize: parseInt(computedStyle.fontSize),
              fontWeight: parseInt(computedStyle.fontWeight),
              fontFamily: computedStyle.fontFamily,
              color: computedStyle.color,
              lineHeight: parseFloat(computedStyle.lineHeight) / parseInt(computedStyle.fontSize),
              textAlign: computedStyle.textAlign as any,
              backgroundColor: computedStyle.backgroundColor,
              borderRadius: parseInt(computedStyle.borderRadius),
              padding: computedStyle.padding,
              width: computedStyle.width,
              height: computedStyle.height,
            },
          });
        }
      } else {
        onElementSelect(null);
      }
    };

    stageRef.current.addEventListener('click', handleClick);

    return () => {
      stageRef.current?.removeEventListener('click', handleClick);
    };
  }, [onElementSelect]);

  const stageWidth = deviceMode === 'desktop' ? 1280 : 375;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const availableWidth = container.clientWidth;
      if (availableWidth === 0) return;

      const nextScale = Math.min(availableWidth / stageWidth, 1);
      setScale(nextScale);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, [stageWidth]);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-auto">
      <div className="flex justify-center min-h-full">
        <div
          ref={stageRef}
          className="bg-white shadow-2xl border border-border rounded-md overflow-hidden"
          style={{ width: stageWidth, zoom: scale } as CSSProperties}
        >
          <PageComponent selectedElementId={selectedElement?.id} onHover={setHoveredElement} />
        </div>
      </div>
    </div>
  );
}