// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useMemo } from 'react';

// ── Utils ──
import { getProjectStatus, getProjectTokens } from '../utils/project-card.util';
import { STATUS_ORDER } from '../constants/session.constants';

// ── Types ──
import { type SessionStatus } from '../types/session.types';
import type { ProjectExtended, SortMode } from '../types/project-panel.types';

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useProjectListView(projects: ProjectExtended[]) {
  // ── State ──
  const [showHidden] = useState(false);
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('manual');
  const [filterStatus, setFilterStatus] = useState<'all' | SessionStatus>('all');

  // ── Derived ──
  const shownProjects = useMemo(() => {
    let list = projects.filter((p) => showHidden || !p.hidden);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    if (filterStatus !== 'all') list = list.filter((p) => getProjectStatus(p) === filterStatus);
    if (sortMode === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === 'status')
      list = [...list].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(getProjectStatus(a)) - STATUS_ORDER.indexOf(getProjectStatus(b)),
      );
    if (sortMode === 'tokens')
      list = [...list].sort((a, b) => getProjectTokens(b) - getProjectTokens(a));
    return list;
  }, [projects, showHidden, filterStatus, sortMode, query]);

  return {
    showHidden,
    query,
    setQuery,
    sortMode,
    setSortMode,
    filterStatus,
    setFilterStatus,
    shownProjects,
  };
}