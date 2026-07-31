// Storage Service - Generic localStorage CRUD with typing
export class StorageService {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}-${key}` : key;
  }

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const data = localStorage.getItem(this.getKey(key));
      if (!data) return defaultValue ?? null;
      return JSON.parse(data) as T;
    } catch {
      return defaultValue ?? null;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  }

  has(key: string): boolean {
    try {
      return localStorage.getItem(this.getKey(key)) !== null;
    } catch {
      return false;
    }
  }

  getAll<T>(prefix: string): Record<string, T> {
    const result: Record<string, T> = {};
    try {
      const fullPrefix = this.getKey(prefix);
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          const data = localStorage.getItem(key);
          if (data) {
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
      const fullPrefix = this.getKey(prefix);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(fullPrefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error(`Failed to clear ${prefix}:`, error);
    }
  }
}

// Singleton instance with 'phantoma' prefix
export const storageService = new StorageService('phantoma');

// Create scoped storage instances
export function createStorageService(prefix: string): StorageService {
  return new StorageService(prefix);
}

// Helper: get repeater storage
export function getRepeaterStorage(targetId: string | null) {
  const base = targetId ? `repeater-${targetId}` : 'repeater-default';
  return new StorageService(base);
}

// Helper: get payload storage
export function getPayloadStorage(targetId: string | null, payloadName: string) {
  const base = targetId ? `repeater-${targetId}` : 'repeater-default';
  return new StorageService(`${base}-${payloadName}`);
}

export default storageService;
