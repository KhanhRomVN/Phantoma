/**
 * ------------------------------------------------------------------
 * useSkillMarketplace
 * ------------------------------------------------------------------
 * Hook cho Skill catalog: leaderboard, search, detail.
 * Không quản lý skill đã cài (xem useInstalledSkills).
 * ------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchLeaderboard,
  searchSkills,
  fetchSkillDetail,
  getCachedLeaderboard,
  getCachedSearch,
  getCachedSkillDetail,
  isCacheFresh,
} from "../services/marketplace-skill.service";
import type { SkillSummary, SkillDetail } from "../types/skill.types";

const SEARCH_DEBOUNCE_MS = 400;

export interface UseSkillMarketplaceResult {
  skills: SkillSummary[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchLoading: boolean;
  selectedSkill: SkillDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  loadLeaderboard: () => Promise<void>;
  handleSkillClick: (skill: Pick<SkillSummary, "slug">) => Promise<void>;
  handleBack: () => void;
  handleClearSearch: () => void;
}

export function useSkillMarketplace(): UseSkillMarketplaceResult {
  const [skills, setSkills] = useState<SkillSummary[]>(
    () => getCachedLeaderboard()?.data ?? [],
  );
  const [loading, setLoading] = useState(() => !getCachedLeaderboard());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  /** ID tăng dần cho mọi request ảnh hưởng `skills` (leaderboard + search). */
  const listRequestRef = useRef(0);
  const activeSlugRef = useRef<string | null>(null);
  /** true khi `skills` đang hiển thị kết quả search (cần khôi phục leaderboard khi query rỗng). */
  const showingSearchRef = useRef(false);

  const loadLeaderboard = useCallback(async () => {
    const requestId = ++listRequestRef.current;
    const isActive = () => listRequestRef.current === requestId;
    const cached = getCachedLeaderboard();
    showingSearchRef.current = false;
    setError(null);
    setSearchLoading(false);
    if (cached) {
      setSkills(cached.data);
      setLoading(false);
      if (isCacheFresh(cached)) return;
    } else {
      setLoading(true);
    }
    try {
      const data = await fetchLeaderboard();
      if (isActive()) setSkills(data);
    } catch (err: unknown) {
      if (!cached && isActive()) {
        setError(err instanceof Error && err.message ? err.message : "Failed to load skills");
      }
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Search: một luồng duy nhất cho mọi thay đổi query (gõ, xoá, nút clear).
  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      if (showingSearchRef.current) loadLeaderboard();
      return;
    }

    const requestId = ++listRequestRef.current;
    const isActive = () => listRequestRef.current === requestId;
    showingSearchRef.current = true;

    const cached = getCachedSearch(query);
    if (cached) {
      setSkills(cached.data.skills);
      setError(null);
      setSearchLoading(false);
      if (isCacheFresh(cached)) return;
    }

    const timer = setTimeout(
      async () => {
        if (!cached) setSearchLoading(true);
        setError(null);
        try {
          const result = await searchSkills(query);
          if (isActive()) setSkills(result.skills);
        } catch (err: unknown) {
          if (!cached && isActive()) {
            setError(err instanceof Error && err.message ? err.message : "Search failed");
          }
        } finally {
          if (isActive()) setSearchLoading(false);
        }
      },
      cached ? 0 : SEARCH_DEBOUNCE_MS,
    );

    return () => {
      clearTimeout(timer);
      // Hủy hiệu lực mọi response của query này nếu effect chạy lại/unmount.
      if (listRequestRef.current === requestId) listRequestRef.current++;
    };
  }, [searchQuery, loadLeaderboard]);

  const handleBack = useCallback(() => {
    activeSlugRef.current = null;
    setSelectedSkill(null);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  const handleSkillClick = useCallback(async (skill: Pick<SkillSummary, "slug">) => {
    const slug = skill.slug;
    activeSlugRef.current = slug;
    const isActive = () => activeSlugRef.current === slug;
    const cached = getCachedSkillDetail(slug);
    setDetailError(null);
    if (cached) {
      setSelectedSkill(cached.data);
      setDetailLoading(false);
      if (isCacheFresh(cached)) return;
    } else {
      setSelectedSkill(null);
      setDetailLoading(true);
    }
    try {
      const detail = await fetchSkillDetail(slug);
      if (isActive()) setSelectedSkill(detail);
    } catch (err: unknown) {
      if (!cached && isActive()) {
        setDetailError(
          err instanceof Error && err.message ? err.message : "Failed to load skill detail",
        );
      }
    } finally {
      if (isActive()) setDetailLoading(false);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    // Effect search sẽ tự khôi phục leaderboard khi query rỗng.
    setSearchQuery("");
  }, []);

  return {
    skills,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    searchLoading,
    selectedSkill,
    detailLoading,
    detailError,
    loadLeaderboard,
    handleSkillClick,
    handleBack,
    handleClearSearch,
  };
}
