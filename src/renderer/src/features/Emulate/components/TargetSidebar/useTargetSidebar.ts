import { useState, useMemo } from 'react';
import { TargetTab } from '../../types/target.types';

interface UseTargetSidebarReturn {
  targetSearchQuery: string;
  setTargetSearchQuery: (query: string) => void;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  searchedTargets: TargetTab[];
}

export function useTargetSidebar(targetTabs: TargetTab[]): UseTargetSidebarReturn {
  const [targetSearchQuery, setTargetSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const allTargets = useMemo(
    () => targetTabs.filter((tab) => tab.id !== 'default'),
    [targetTabs],
  );

  const searchedTargets = useMemo(
    () =>
      allTargets.filter((tab) =>
        tab.title.toLowerCase().includes(targetSearchQuery.toLowerCase()),
      ),
    [allTargets, targetSearchQuery],
  );

  return {
    targetSearchQuery,
    setTargetSearchQuery,
    openMenuId,
    setOpenMenuId,
    searchedTargets,
  };
}