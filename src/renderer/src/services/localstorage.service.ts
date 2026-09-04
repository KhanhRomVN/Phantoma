/**
 * ------------------------------------------------------------------
 * LocalStorage Service
 * ------------------------------------------------------------------
 * Wrapper đơn giản cho localStorage với JSON parse/stringify tự động.
 * Dùng chung cho toàn bộ renderer, không ràng buộc module hay prefix nào.
 *
 * Các hàm chính:
 * - get()     : Lấy giá trị (tự động parse JSON), hỗ trợ defaultValue
 * - set()     : Lưu giá trị (tự động JSON.stringify)
 * - remove()  : Xóa một key
 * - has()     : Kiểm tra key có tồn tại
 * - getAll()  : Lấy tất cả key bắt đầu bằng prefix, trả về object
 * - clear()   : Xóa tất cả key bắt đầu bằng prefix
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import { logger } from '@renderer/utils/logger';

// ─── Class ──────────────────────────────────────────────────────────────
class LocalStorageService {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const data = localStorage.getItem(key);
      if (data === null) return defaultValue ?? null;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue ?? null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error(`[LocalStorage] Failed to set ${key}:`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error(`[LocalStorage] Failed to remove ${key}:`, error);
    }
  }

  has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  }

  getAll<T>(prefix: string): Record<string, T> {
    const result: Record<string, T> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          const data = localStorage.getItem(key);
          if (data !== null) {
            result[key] = JSON.parse(data);
          }
        }
      }
    } catch {
      // Ignore
    }
    return result;
  }

  clear(prefix: string): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      logger.error(`[LocalStorage] Failed to clear ${prefix}:`, error);
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const localStorageService = new LocalStorageService();
export default localStorageService;