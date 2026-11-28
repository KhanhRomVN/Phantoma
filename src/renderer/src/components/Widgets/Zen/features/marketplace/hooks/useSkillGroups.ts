/**
 * ------------------------------------------------------------------
 * useSkillGroups
 * ------------------------------------------------------------------
 * State + mutations + persistence cho skill groups.
 * - status: initializing / ready / load-error (load lỗi KHÁC workspace rỗng)
 * - chỉ lưu sau khi user thực sự thay đổi VÀ đã load thành công
 * - save được debounce, serialize (không chồng chéo) và flush khi unmount
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { loadSkillGroups, saveSkillGroups } from "../services/skill-groups.service";
import {
  EMPTY_SKILL_WORKSPACE_STATE,
  type SkillWorkspaceState,
  type SkillGroupRecord,
} from "../types/skill-workspace.types";
import {
  DEFAULT_GROUP_NAME,
  isReservedGroupName,
  normalizeGroupName,
} from "../skill-group.rules";
import { toMessage } from "../utils/to-message.util";

const SAVE_DEBOUNCE_MS = 300;

export type SkillGroupsStatus = "initializing" | "ready" | "load-error";

export interface GroupExtra {
  color?: string;
  description?: string;
}

export interface UseSkillGroupsResult {
  state: SkillWorkspaceState;
  status: SkillGroupsStatus;
  loading: boolean;
  loadError: string | null;
  saveError: string | null;
  retryLoad: () => void;

  addGroup: (name: string, icon?: string, extra?: GroupExtra) => void;
  updateGroup: (
    oldName: string,
    next: { name: string; icon?: string; color?: string; description?: string },
  ) => void;
  /** Xoá group; skill thuộc group tự quay về "Others". */
  removeGroup: (name: string) => void;
  /** Gán skill vào group (một slug tối đa một group; "Others" = bỏ khỏi mọi group). */
  assignSkillToGroup: (slug: string, groupName: string) => void;
}

export function useSkillGroups(): UseSkillGroupsResult {
  const [state, setState] = useState<SkillWorkspaceState>(
    EMPTY_SKILL_WORKSPACE_STATE,
  );
  const [status, setStatus] = useState<SkillGroupsStatus>("initializing");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  const statusRef = useRef<SkillGroupsStatus>("initializing");
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  const setStatusBoth = (next: SkillGroupsStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  // ---- Load ----
  useEffect(() => {
    let cancelled = false;
    setStatusBoth("initializing");
    setLoadError(null);
    (async () => {
      try {
        const loaded = await loadSkillGroups();
        if (cancelled) return;
        setState(loaded);
        setStatusBoth("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        setLoadError(toMessage(err, "Failed to load skill groups"));
        setStatusBoth("load-error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const retryLoad = useCallback(() => setLoadAttempt((n) => n + 1), []);

  // ---- Save (serialize, latest-wins) ----
  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!dirtyRef.current || statusRef.current !== "ready") return;
    dirtyRef.current = false;
    const snapshot = stateRef.current;
    saveChain.current = saveChain.current
      .then(() => saveSkillGroups(snapshot))
      .then(() => setSaveError(null))
      .catch((err: unknown) => {
        dirtyRef.current = true; // giữ dirty để lần thay đổi sau lưu lại
        setSaveError(toMessage(err, "Failed to save skill groups"));
      });
  }, []);

  useEffect(() => {
    if (!dirtyRef.current || status !== "ready") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  }, [state, status, flushSave]);

  // Unmount: không để mất lần ghi cuối đang chờ debounce.
  useEffect(() => () => flushSave(), [flushSave]);

  /** Mọi mutation đi qua đây: chặn khi chưa load xong, đánh dấu dirty. */
  const mutate = useCallback(
    (fn: (prev: SkillWorkspaceState) => SkillWorkspaceState) => {
      if (statusRef.current !== "ready") return;
      setState((prev) => {
        const next = fn(prev);
        if (next !== prev) dirtyRef.current = true;
        return next;
      });
    },
    [],
  );

  const addGroup = useCallback(
    (name: string, icon?: string, extra?: GroupExtra) => {
      const trimmed = name.trim();
      if (!trimmed || isReservedGroupName(trimmed)) return;
      mutate((prev) => {
        const key = normalizeGroupName(trimmed);
        if (prev.groups.some((g) => normalizeGroupName(g.name) === key)) return prev;
        return {
          ...prev,
          groups: [...prev.groups, { name: trimmed, slugs: [], icon, ...extra }],
        };
      });
    },
    [mutate],
  );

  const updateGroup = useCallback(
    (
      oldName: string,
      next: { name: string; icon?: string; color?: string; description?: string },
    ) => {
      const trimmed = next.name.trim();
      if (!trimmed || isReservedGroupName(trimmed)) return;
      mutate((prev) => {
        const oldKey = normalizeGroupName(oldName);
        const newKey = normalizeGroupName(trimmed);
        const dup = prev.groups.some(
          (g) => normalizeGroupName(g.name) === newKey && oldKey !== newKey,
        );
        if (dup) return prev;
        return {
          ...prev,
          groups: prev.groups.map((g) =>
            normalizeGroupName(g.name) === oldKey
              ? {
                  ...g,
                  name: trimmed,
                  icon: next.icon,
                  color: next.color,
                  description: next.description,
                }
              : g,
          ),
        };
      });
    },
    [mutate],
  );

  const removeGroup = useCallback(
    (name: string) => {
      mutate((prev) => {
        const key = normalizeGroupName(name);
        if (!prev.groups.some((g) => normalizeGroupName(g.name) === key)) return prev;
        return {
          ...prev,
          groups: prev.groups.filter((g) => normalizeGroupName(g.name) !== key),
        };
      });
    },
    [mutate],
  );

  const assignSkillToGroup = useCallback(
    (slug: string, groupName: string) => {
      mutate((prev) => {
        const targetKey = normalizeGroupName(groupName);
        const toOthers = targetKey === normalizeGroupName(DEFAULT_GROUP_NAME);
        // Group đích không tồn tại → bỏ qua, không tự tạo group ngầm.
        if (
          !toOthers &&
          !prev.groups.some((g) => normalizeGroupName(g.name) === targetKey)
        ) {
          return prev;
        }
        const groups: SkillGroupRecord[] = prev.groups.map((g) => {
          const without = g.slugs.filter((s) => s !== slug);
          if (!toOthers && normalizeGroupName(g.name) === targetKey) {
            return { ...g, slugs: [...without, slug] };
          }
          return { ...g, slugs: without };
        });
        return { ...prev, groups };
      });
    },
    [mutate],
  );

  return {
    state,
    status,
    loading: status === "initializing",
    loadError,
    saveError,
    retryLoad,
    addGroup,
    updateGroup,
    removeGroup,
    assignSkillToGroup,
  };
}
