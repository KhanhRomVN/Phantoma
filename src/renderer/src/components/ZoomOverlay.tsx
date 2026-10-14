import { useEffect, useRef, useState } from 'react';
import { icons } from 'lucide-react';

const HIDE_DELAY_MS = 1500;

export default function ZoomOverlay() {
  const [percent, setPercent] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ZoomIcon = icons.Search;

  useEffect(() => {
    const handleZoom = (_event: unknown, value: number) => {
      setPercent(value);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPercent(null), HIDE_DELAY_MS);
    };

    window.api.on('window:zoom-changed', handleZoom);
    return () => {
      window.api.off('window:zoom-changed', handleZoom);
      clearTimeout(timerRef.current);
    };
  }, []);

  if (percent === null) return null;

  return (
    <div className="fixed top-12 right-4 z-[9999] pointer-events-none flex items-center gap-2 rounded-lg border border-border bg-card-background px-3 py-2 text-sm font-medium text-text-primary shadow-lg">
      <ZoomIcon className="w-4 h-4 text-text-secondary" strokeWidth={2} />
      {percent}%
    </div>
  );
}