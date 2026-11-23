import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadSkillWorkspaceState,
  saveSkillWorkspaceState,
  DEFAULT_SKILL_WORKSPACE_STATE,
  type SkillWorkspaceState,
} from "../services/skillWorkspaceState.service";

/** Tên group mặc định cho skill không thuộc group nào. */
export const DEFAULT_GROUP_NAME = "Others";

export interface GroupExtra {
  color?: string;
  description?: string;
}

export interface UseSkillWorkspaceStateResult {
  state: SkillWorkspaceState;
  loading: boolean;

  addGroup: (name: string, icon?: string, extra?: GroupExtra) => void;
  renameGroup: (oldName: string, newName: string) => void;
  updateGroup: (
    oldName: string,
    next: { name: string; icon?: string; color?: string; description?: string },
  ) => void;
  removeGroup: (
    name: string,
    options?: { deleteSlugs?: string[]; moveTo?: string },
  ) => void;
  assignSkillToGroup: (slug: string, groupName: string) => void;
}

/** Chuẩn hoá tên để so sánh group (case-insensitive, trim). */
export function normalizeGroupName(name: string): string {
  return name.trim().toLowerCase();
}

/** Kiểm tra tên group có bị cấm (trùng "Other"). */
export function isReservedGroupName(name: string): boolean {
  return normalizeGroupName(name) === normalizeGroupName(DEFAULT_GROUP_NAME);
}

export function useSkillWorkspaceState(): UseSkillWorkspaceStateResult {
  const [state, setState] = useState<SkillWorkspaceState>(
    DEFAULT_SKILL_WORKSPACE_STATE,
  );
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadSkillWorkspaceState();
        if (!cancelled) setState(loaded);
      } catch (err: any) {
        console.error("[useSkillWorkspaceState] load error:", err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          initialLoadDone.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSkillWorkspaceState(state).catch((err: any) =>
        console.error("[useSkillWorkspaceState] save error:", err.message),
      );
    }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  const addGroup = useCallback(
    (name: string, icon?: string, extra?: GroupExtra) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => {
      const exists = prev.groups.some(
        (g) => normalizeGroupName(g.name) === normalizeGroupName(trimmed),
      );
      if (exists) return prev;
      return {
        ...prev,
        groups: [...prev.groups, { name: trimmed, slugs: [], icon, ...extra }],
      };
    });
  },
  [],
  );

  const updateGroup = useCallback(
    (
      oldName: string,
      next: { name: string; icon?: string; color?: string; description?: string },
    ) => {
      const trimmed = next.name.trim();
      if (!trimmed) return;
      setState((prev) => {
        const oldKey = normalizeGroupName(oldName);
        const newKey = normalizeGroupName(trimmed);
        const dup = prev.groups.some(
          (g) => normalizeGroupName(g.name) === newKey && oldKey !== newKey,
        );
        if (dup) return prev;

        const groups = prev.groups.map((g) =>
          normalizeGroupName(g.name) === oldKey
            ? {
                ...g,
                name: trimmed,
                icon: next.icon,
                color: next.color,
                description: next.description,
              }
            : g,
        );

        return { ...prev, groups };
      });
    },
    [],
  );

  const renameGroup = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setState((prev) => {
      const oldKey = normalizeGroupName(oldName);
      const newKey = normalizeGroupName(trimmed);
      const dup = prev.groups.some(
        (g) => normalizeGroupName(g.name) === newKey && oldKey !== newKey,
      );
      if (dup) return prev;

      const groups = prev.groups.map((g) =>
        normalizeGroupName(g.name) === oldKey ? { ...g, name: trimmed } : g,
      );

      return { ...prev, groups };
    });
  }, []);

  const removeGroup = useCallback(
    (name: string, options?: { deleteSlugs?: string[]; moveTo?: string }) => {
      setState((prev) => {
        const key = normalizeGroupName(name);
        const target = prev.groups.find(
          (g) => normalizeGroupName(g.name) === key,
        );
        if (!target) return prev;

        const deleteSet = new Set(options?.deleteSlugs ?? []);
        const remainingSlugs = target.slugs.filter((s) => !deleteSet.has(s));
        const moveTo = options?.moveTo;

        const groups = prev.groups
          .map((g) => {
            if (normalizeGroupName(g.name) === key) return null;
            if (
              moveTo &&
              normalizeGroupName(g.name) === normalizeGroupName(moveTo)
            ) {
              return { ...g, slugs: [...g.slugs, ...remainingSlugs] };
            }
            return g;
          })
          .filter((g): g is { name: string; slugs: string[] } => g !== null);

        return { ...prev, groups };
      });
    },
    [],
  );

  const assignSkillToGroup = useCallback((slug: string, groupName: string) => {
    setState((prev) => {
      const targetKey = normalizeGroupName(groupName);
      const isOther = targetKey === normalizeGroupName(DEFAULT_GROUP_NAME);

      let groups = prev.groups.map((g) => ({
        ...g,
        slugs: g.slugs.filter((s) => s !== slug),
      }));

      if (!isOther) {
        const idx = groups.findIndex(
          (g) => normalizeGroupName(g.name) === targetKey,
        );
        if (idx >= 0) {
          groups = groups.map((g, i) =>
            i === idx ? { ...g, slugs: [...g.slugs, slug] } : g,
          );
        } else {
          groups = [...groups, { name: groupName, slugs: [slug] }];
        }
      }

      return { ...prev, groups };
    });
  }, []);

  return {
    state,
    loading,

    addGroup,
    renameGroup,
    updateGroup,
    removeGroup,
    assignSkillToGroup,
  };
}