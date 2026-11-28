import { useEffect } from 'react';
import { useProfileViewStore } from '../../features/profiles';

interface ViewSnapshot {
  loading: boolean;
  activeSourceId: string;
  search: string;
  selectedId: string | null;
}

export function useProfileViewPersistence({ loading, activeSourceId, search, selectedId }: ViewSnapshot): void {
  useEffect(() => {
    if (loading) return;
    useProfileViewStore.getState().setView({
      activeSourceId,
      search,
      selectedId,
    });
  }, [loading, activeSourceId, search, selectedId]);
}
