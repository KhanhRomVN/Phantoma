/**
 * ------------------------------------------------------------------
 * useInstalledSkills
 * ------------------------------------------------------------------
 * Skill đã cài ở local: list, install, uninstall, pending theo slug, lỗi.
 * install/uninstall trả `true` CHỈ khi main process xác nhận thành công.
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listInstalledSkills,
  installSkill,
  uninstallSkill,
  openSkillFolder,
} from "../services/installed-skills.service";
import type {
  InstalledSkill,
  SkillSummary,
  SkillDetail,
} from "../types/skill.types";

import { toMessage } from "../utils/to-message.util";

export interface UseInstalledSkillsResult {
  installedSkills: InstalledSkill[];
  /** Set slug đã cài — chỉ chứa skill có slug thật (không dùng name làm slug). */
  installedSlugs: Set<string>;
  /** Đang tải danh sách lần đầu / reload. */
  installedLoading: boolean;
  /** Lỗi đọc danh sách (khác với danh sách rỗng). */
  loadError: string | null;
  /** Lỗi của thao tác install/uninstall gần nhất. */
  actionError: string | null;
  /** Slug đang có mutation chạy. */
  pendingSlugs: ReadonlySet<string>;
  reloadInstalled: () => Promise<void>;
  install: (skill: SkillSummary | SkillDetail) => Promise<boolean>;
  uninstall: (slug: string) => Promise<boolean>;
  openFolder: (slug: string) => Promise<void>;
  clearActionError: () => void;
}

export function useInstalledSkills(): UseInstalledSkillsResult {
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([]);
  const [installedLoading, setInstalledLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingSlugs, setPendingSlugs] = useState<ReadonlySet<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const loadIdRef = useRef(0);

  const installedSlugs = useMemo(
    () =>
      new Set(
        installedSkills
          .map((s) => s.slug)
          .filter((s): s is string => typeof s === "string" && s.length > 0),
      ),
    [installedSkills],
  );

  const reloadInstalled = useCallback(async () => {
    const loadId = ++loadIdRef.current;
    setInstalledLoading(true);
    try {
      const list = await listInstalledSkills();
      if (loadIdRef.current !== loadId) return;
      setInstalledSkills(list);
      setLoadError(null);
    } catch (err: unknown) {
      // Giữ list hiện có; chỉ báo lỗi, không thay bằng [].
      if (loadIdRef.current !== loadId) return;
      setLoadError(toMessage(err, "Failed to load installed skills"));
    } finally {
      if (loadIdRef.current === loadId) setInstalledLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadInstalled();
  }, [reloadInstalled]);

  const runMutation = useCallback(
    async (
      slug: string,
      action: () => Promise<void>,
      fallbackMessage: string,
    ): Promise<boolean> => {
      if (pendingRef.current.has(slug)) return false; // chặn double submit
      pendingRef.current.add(slug);
      setPendingSlugs(new Set(pendingRef.current));
      setActionError(null);
      try {
        await action();
      } catch (err: unknown) {
        setActionError(toMessage(err, fallbackMessage));
        return false;
      } finally {
        pendingRef.current.delete(slug);
        setPendingSlugs(new Set(pendingRef.current));
      }
      // Mutation đã thành công; reload thất bại chỉ ảnh hưởng loadError.
      await reloadInstalled();
      return true;
    },
    [reloadInstalled],
  );

  const install = useCallback(
    async (skill: SkillSummary | SkillDetail): Promise<boolean> => {
      if (!skill.slug) {
        setActionError("Skill has no slug and cannot be installed");
        return false;
      }
      return runMutation(skill.slug, () => installSkill(skill), "Install failed");
    },
    [runMutation],
  );

  const uninstall = useCallback(
    (slug: string): Promise<boolean> =>
      runMutation(slug, () => uninstallSkill(slug), "Uninstall failed"),
    [runMutation],
  );

  const openFolder = useCallback(async (slug: string) => {
    try {
      await openSkillFolder(slug);
    } catch (err: unknown) {
      setActionError(toMessage(err, "Failed to open skill folder"));
    }
  }, []);

  const clearActionError = useCallback(() => setActionError(null), []);

  return {
    installedSkills,
    installedSlugs,
    installedLoading,
    loadError,
    actionError,
    pendingSlugs,
    reloadInstalled,
    install,
    uninstall,
    openFolder,
    clearActionError,
  };
}
