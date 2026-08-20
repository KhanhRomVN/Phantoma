/**
 * ------------------------------------------------------------------
 * Storage Handler
 * ------------------------------------------------------------------
 * Handles localStorage CRUD operations via IPC messages from the
 * main process. Uses a prefix-based key namespace to isolate storage
 * from other modules.
 *
 * Main commands:
 * - storageGet    : Read a value by key
 * - storageSet    : Write a value by key
 * - storageDelete : Remove a value by key
 * - storageList   : List all keys under a given prefix
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────
import { logger } from '@renderer/utils/logger';

interface StorageResult {
  command: string;
  requestId?: string;
  operation?: string;
  key?: string;
  value?: string | null;
  keys?: string[];
  success?: boolean;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────
const STORAGE_PREFIX = 'zen_storage:';

// ─── Class ──────────────────────────────────────────────────────────────
export class StorageHandler {
  public async handle(message: any): Promise<StorageResult> {
    try {
      switch (message.command) {
        case 'storageGet': {
          const value = this.storageGet(message.key || '');
          return {
            command: 'storageResult',
            requestId: message.requestId,
            operation: 'get',
            key: message.key,
            value,
          };
        }
        case 'storageSet': {
          this.storageSet(message.key || '', message.value || '');
          return {
            command: 'storageResult',
            requestId: message.requestId,
            operation: 'set',
            key: message.key,
            success: true,
          };
        }
        case 'storageDelete': {
          this.storageDelete(message.key || '');
          return {
            command: 'storageResult',
            requestId: message.requestId,
            operation: 'delete',
            key: message.key,
            success: true,
          };
        }
        case 'storageList': {
          const keys = this.storageList(message.prefix);
          return {
            command: 'storageResult',
            requestId: message.requestId,
            operation: 'list',
            keys,
          };
        }
        default:
          return {
            command: 'storageResult',
            requestId: message.requestId,
            error: `Unknown storage command: ${message.command}`,
          };
      }
    } catch (e: any) {
      return {
        command: 'storageResult',
        requestId: message.requestId,
        error: e.message || String(e),
      };
    }
  }

  private storageGet(key: string): string | null {
    try {
      return localStorage.getItem(STORAGE_PREFIX + key);
    } catch {
      return null;
    }
  }

  private storageSet(key: string, value: string): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, value);
    } catch (e) {
      logger.error('[StorageHandler] localStorage set failed:', key, e);
    }
  }

  private storageDelete(key: string): void {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      logger.error('[StorageHandler] localStorage delete failed:', key, e);
    }
  }

  private storageList(prefix?: string): string[] {
    try {
      const fullPrefix = STORAGE_PREFIX + (prefix || '');
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(fullPrefix)) {
          keys.push(k.slice(STORAGE_PREFIX.length));
        }
      }
      return keys;
    } catch {
      return [];
    }
  }
}
