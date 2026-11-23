import { useState, useEffect } from 'react';
import type { GroupInfo } from '../types/project-panel.types';

const GROUP_STORAGE_KEY = 'phantoma_code_project_groups_v2';
export const UNGROUP_ID = '__ungroup__';
const UNGROUP_INDEX_KEY = 'phantoma_code_ungroup_index_v2';

function loadGroupsFromStorage(): GroupInfo[] {
  try {
    const stored = window.localStorage.getItem(GROUP_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((g: any) => ({
      id: String(g.id),
      name: String(g.name || 'Untitled'),
      open: Boolean(g.open ?? true),
      iconId: g.iconId ? String(g.iconId) : undefined,
    }));
  } catch (e) {
    console.error('Failed to load groups from storage:', e);
    return [];
  }
}

function loadUngroupIndex(): number {
  try {
    const v = parseInt(window.localStorage.getItem(UNGROUP_INDEX_KEY) ?? '', 10);
    return Number.isNaN(v) ? Number.MAX_SAFE_INTEGER : v;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

export function useProjectGroups() {
  const [groups, setGroups] = useState<GroupInfo[]>(loadGroupsFromStorage);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [ungroupedOpen, setUngroupedOpen] = useState(true);
  const [ungroupIndex, setUngroupIndex] = useState<number>(loadUngroupIndex);

  useEffect(() => {
    try {
      window.localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups));
    } catch (e) {
      console.error('Failed to save groups to storage:', e);
    }
  }, [groups]);

  useEffect(() => {
    try {
      window.localStorage.setItem(UNGROUP_INDEX_KEY, String(ungroupIndex));
    } catch (e) {
      console.error('Failed to save ungroup index:', e);
    }
  }, [ungroupIndex]);

  return {
    groups,
    setGroups,
    renamingGroupId,
    setRenamingGroupId,
    groupFormOpen,
    setGroupFormOpen,
    editingGroupId,
    setEditingGroupId,
    ungroupedOpen,
    setUngroupedOpen,
    ungroupIndex,
    setUngroupIndex,
  };
}