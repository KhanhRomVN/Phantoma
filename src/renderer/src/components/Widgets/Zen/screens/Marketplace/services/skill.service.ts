/**
 * ------------------------------------------------------------------
 * Skill Service (IPC)
 * ------------------------------------------------------------------
 * Gọi 3 HTTP API từ mcp.directory thông qua main process để tránh CORS.
 * Renderer gửi ipcRenderer.invoke -> Main fetch -> Trả về.
 *
 * APIs:
 * - fetchLeaderboard()  : GET /skills (rsc:1) → parse initialSkills từ RSC
 * - searchSkills()      : GET /api/v1/skills?q=... → JSON thuần
 * - fetchSkillDetail()  : GET /skills/{slug} (rsc:1) → parse markdown từ RSC
 * ------------------------------------------------------------------
 */

import {
  SkillSummary,
  SkillSearchResponse,
  SkillDetail,
} from "../types/skill.types";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface CacheEntry<T> {
  data: T;
  ts: number;
}

let leaderboardCache: CacheEntry<SkillSummary[]> | null = null;
const searchCache = new Map<string, CacheEntry<SkillSearchResponse>>();
const detailCache = new Map<string, CacheEntry<SkillDetail>>();

export const isCacheFresh = (entry: CacheEntry<unknown>): boolean =>
  Date.now() - entry.ts < CACHE_TTL_MS;
export const getCachedLeaderboard = () => leaderboardCache;
export const getCachedSearch = (query: string) =>
  searchCache.get(query) ?? null;
export const getCachedSkillDetail = (slug: string) =>
  detailCache.get(slug) ?? null;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function invokeSkillApi<T>(command: string, payload?: any): Promise<T> {
  try {
    const api = (window as any).api;
    if (!api?.invoke) throw new Error("API bridge not available");
    
    const res: ApiResponse<T> = await api.invoke(command, payload);
    if (res?.success && res.data !== undefined) {
      return res.data;
    }
    throw new Error(res?.error || "Unknown error from skill API");
  } catch (err: any) {
    console.error(`[SkillService] ${command} failed:`, err);
    throw err;
  }
}

/**
 * API 1 — Leaderboard: lấy danh sách skill theo lượt xem.
 */
export async function fetchLeaderboard(): Promise<SkillSummary[]> {
  try {
    const skills = await invokeSkillApi<SkillSummary[]>("skill:fetch-leaderboard");
    if (!skills || skills.length === 0) {
      throw new Error("No skills returned from leaderboard");
    }
    leaderboardCache = { data: skills, ts: Date.now() };
    return skills;
  } catch (err: any) {
    console.error("fetchLeaderboard: ERROR", {
      name: err?.name,
      message: err?.message,
      cause: err?.cause,
    });
    throw err;
  }
}

/**
 * API 2 — Search: tìm kiếm skill theo query text.
 */
export async function searchSkills(
  query: string,
  limit: number = 24,
  offset: number = 0,
): Promise<SkillSearchResponse> {
  try {
    const data = await invokeSkillApi<SkillSearchResponse>("skill:search", {
      query,
      limit,
      offset,
    });
    searchCache.set(query, { data, ts: Date.now() });
    return data;
  } catch (err: any) {
    console.error("searchSkills: ERROR", {
      name: err?.name,
      message: err?.message,
      cause: err?.cause,
    });
    throw err;
  }
}

/**
 * API 3 — Detail: lấy thông tin chi tiết của skill theo slug.
 */
export async function fetchSkillDetail(slug: string): Promise<SkillDetail> {
  try {
    const detail = await invokeSkillApi<SkillDetail>("skill:fetch-detail", {
      slug,
    });
    if (!detail) {
      throw new Error(`No detail returned for "${slug}"`);
    }
    detailCache.set(slug, { data: detail, ts: Date.now() });
    return detail;
  } catch (err: any) {
    console.error("fetchSkillDetail: ERROR", {
      name: err?.name,
      message: err?.message,
      cause: err?.cause,
    });
    throw err;
  }
}