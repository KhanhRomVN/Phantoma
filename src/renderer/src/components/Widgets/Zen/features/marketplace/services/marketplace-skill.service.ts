/**
 * ------------------------------------------------------------------
 * Marketplace Skill Service (IPC)
 * ------------------------------------------------------------------
 * Gọi API mcp.directory thông qua main process để tránh CORS.
 *
 * - fetchLeaderboard() : skill:fetch-leaderboard
 * - searchSkills()     : skill:search
 * - fetchSkillDetail() : skill:fetch-detail
 *
 * Cache (private, TTL 5 phút, bounded) nằm trong module này.
 * ------------------------------------------------------------------
 */

import type {
  SkillSummary,
  SkillSearchResponse,
  SkillDetail,
} from "../types/skill.types";
import { invokeSkillIpc } from "./skill-ipc.bridge";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SEARCH_CACHE_ENTRIES = 50;
const MAX_DETAIL_CACHE_ENTRIES = 100;

export const DEFAULT_SEARCH_LIMIT = 24;

export interface CacheEntry<T> {
  data: T;
  ts: number;
}

let leaderboardCache: CacheEntry<SkillSummary[]> | null = null;
const searchCache = new Map<string, CacheEntry<SkillSearchResponse>>();
const detailCache = new Map<string, CacheEntry<SkillDetail>>();

export const isCacheFresh = (entry: CacheEntry<unknown>): boolean =>
  Date.now() - entry.ts < CACHE_TTL_MS;

const normalizeQuery = (query: string): string => query.trim();

const searchKey = (query: string, limit: number, offset: number): string =>
  JSON.stringify([normalizeQuery(query).toLowerCase(), limit, offset]);

/** Xoá entry hết hạn rồi cắt bớt entry cũ nhất nếu vượt giới hạn. */
function pruneCache<T>(cache: Map<string, CacheEntry<T>>, max: number): void {
  for (const [key, entry] of cache) {
    if (!isCacheFresh(entry)) cache.delete(key);
  }
  while (cache.size > max) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function setBounded<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  max: number,
): void {
  cache.delete(key); // đẩy key xuống cuối thứ tự chèn
  cache.set(key, { data, ts: Date.now() });
  pruneCache(cache, max);
}

/** Đọc cache (kể cả stale để UI render trước rồi refresh). */
export const getCachedLeaderboard = () => leaderboardCache;

export const getCachedSearch = (
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  offset: number = 0,
) => searchCache.get(searchKey(query, limit, offset)) ?? null;

export const getCachedSkillDetail = (slug: string) =>
  detailCache.get(slug) ?? null;

/** Leaderboard: danh sách skill theo lượt xem. Danh sách rỗng là kết quả hợp lệ. */
export async function fetchLeaderboard(): Promise<SkillSummary[]> {
  const data = await invokeSkillIpc<SkillSummary[]>("skill:fetch-leaderboard");
  if (!Array.isArray(data)) {
    throw new Error("Invalid leaderboard response");
  }
  leaderboardCache = { data, ts: Date.now() };
  return data;
}

/** Search: tìm kiếm skill theo query text. */
export async function searchSkills(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  offset: number = 0,
): Promise<SkillSearchResponse> {
  const q = normalizeQuery(query);
  const data = await invokeSkillIpc<SkillSearchResponse>("skill:search", {
    query: q,
    limit,
    offset,
  });
  if (!data) throw new Error("Invalid search response");
  setBounded(searchCache, searchKey(q, limit, offset), data, MAX_SEARCH_CACHE_ENTRIES);
  return data;
}

/** Detail: thông tin chi tiết của skill theo slug. */
export async function fetchSkillDetail(slug: string): Promise<SkillDetail> {
  const detail = await invokeSkillIpc<SkillDetail>("skill:fetch-detail", {
    slug,
  });
  if (!detail) throw new Error(`No detail returned for "${slug}"`);
  setBounded(detailCache, slug, detail, MAX_DETAIL_CACHE_ENTRIES);
  return detail;
}
