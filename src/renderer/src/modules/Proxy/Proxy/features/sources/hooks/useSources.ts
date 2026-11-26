import { useCallback, useMemo, useState } from 'react';
import type { ProxySource } from '../../../shared/types/source-domain.types';

/** Source list plus the active tab. `applySources` replaces the list and keeps the active tab valid. */
export function useSources() {
  const [sources, setSources] = useState<ProxySource[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string>('');

  const applySources = useCallback((next: ProxySource[]) => {
    setSources(next);
    setActiveSourceId((prev) => (next.some((s) => s.id === prev) ? prev : (next[0]?.id ?? '')));
  }, []);

  const activeSource = useMemo(
    () => sources.find((s) => s.id === activeSourceId) ?? null,
    [sources, activeSourceId],
  );

  return { sources, activeSourceId, activeSource, setActiveSourceId, applySources };
}
