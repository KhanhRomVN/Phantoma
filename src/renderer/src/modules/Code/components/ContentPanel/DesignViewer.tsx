/**
 * ------------------------------------------------------------------
 * Design Viewer
 * ------------------------------------------------------------------
 * Component for displaying and previewing design HTML content.
 * Renders the design in an iframe with responsive controls and
 * device size presets.
 *
 * Main features:
 * - HTML content rendering in sandboxed iframe
 * - Responsive viewport controls (desktop, tablet, mobile)
 * - Full-screen preview mode
 * - Live HTML content updates
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── React ──
import { useEffect, useRef, useState } from 'react';

// ── UI ──
import { Monitor, Tablet, Smartphone, Maximize2 } from 'lucide-react';

// ── Types ──
import type { Design } from '../../types/design';

// ── Utils ──
import { cn } from '@renderer/shared/utils/cn';

// ─── Component ──────────────────────────────────────────────────────────

interface DesignViewerProps {
  design: Design;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile' | 'full';

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; height: string; label: string }> = {
  desktop: { width: '1440px', height: '900px', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' },
  full: { width: '100%', height: '100%', label: 'Full Screen' },
};

export function DesignViewer({ design }: DesignViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<ViewportSize>('full');
  const [isLoading, setIsLoading] = useState(true);

  // Update iframe content when design HTML changes
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (doc) {
      setIsLoading(true);
      doc.open();
      doc.write(design.html);
      doc.close();

      // Wait for iframe to load
      const handleLoad = () => setIsLoading(false);
      iframe.addEventListener('load', handleLoad);

      return () => {
        iframe.removeEventListener('load', handleLoad);
      };
    }
  }, [design.html]);

  const currentSize = VIEWPORT_SIZES[viewport];

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-sidebar-background">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{design.name}</span>
          {design.description && (
            <span className="text-xs text-text-secondary/60">— {design.description}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewport('desktop')}
            className={cn(
              'p-2 rounded text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary transition-colors',
              viewport === 'desktop' && 'bg-sidebar-item-hover text-primary',
            )}
            title="Desktop view"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={cn(
              'p-2 rounded text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary transition-colors',
              viewport === 'tablet' && 'bg-sidebar-item-hover text-primary',
            )}
            title="Tablet view"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={cn(
              'p-2 rounded text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary transition-colors',
              viewport === 'mobile' && 'bg-sidebar-item-hover text-primary',
            )}
            title="Mobile view"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewport('full')}
            className={cn(
              'p-2 rounded text-text-secondary hover:bg-sidebar-item-hover hover:text-text-primary transition-colors',
              viewport === 'full' && 'bg-sidebar-item-hover text-primary',
            )}
            title="Full screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto bg-[#1a1b1e]">
        <div
          className={cn(
            'relative bg-white shadow-2xl transition-all duration-300',
            viewport === 'full' ? 'w-full h-full' : 'rounded-lg overflow-hidden',
          )}
          style={{
            width: currentSize.width,
            height: currentSize.height,
            maxWidth: viewport === 'full' ? '100%' : currentSize.width,
            maxHeight: viewport === 'full' ? '100%' : currentSize.height,
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <div className="text-sm text-text-secondary">Loading preview...</div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
            title="Design Preview"
          />
        </div>
      </div>

      {/* Size indicator */}
      {viewport !== 'full' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-3 py-1.5 bg-black/80 text-white text-xs rounded-full">
          {currentSize.label} ({currentSize.width} × {currentSize.height})
        </div>
      )}
    </div>
  );
}
