/**
 * IndexedDB Storage Service for Network Requests
 * Stores requests per target with compression for response bodies
 */

const DB_NAME = 'PhantomaRequests';
const DB_VERSION = 1;
const STORE_NAME = 'requests';

export interface StoredRequest {
  id: string;
  targetId: string;
  method: string;
  url: string;
  protocol: string;
  host: string;
  path: string;
  status: number;
  type: string;
  size: string;
  time: string;
  timestamp: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: string;
  responseBody: string; // compressed or raw
  responseBodyCompressed?: boolean; // flag indicating if body is compressed
  initiator?: string;
  securityIssues?: any[];
  requestCookies?: Record<string, string>;
  responseCookies?: Record<string, string>;
}

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;
  private compressThreshold = 10240; // 10KB - compress bodies larger than this

  constructor() {
    this.dbReady = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('targetId', 'targetId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('targetId_timestamp', ['targetId', 'timestamp'], { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async compress(data: string): Promise<string> {
    if (!data || data.length < this.compressThreshold) return data;

    try {
      const encoder = new TextEncoder();
      const compressed = await new Response(
        new Blob([encoder.encode(data)]).stream().pipeThrough(new CompressionStream('gzip')),
      ).arrayBuffer();

      // Convert to base64 for storage
      const uint8Array = new Uint8Array(compressed);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      return btoa(binary);
    } catch {
      // Fallback: store as-is if compression fails
      return data;
    }
  }

  private async decompress(data: string, isCompressed: boolean): Promise<string> {
    if (!isCompressed || !data) return data;

    try {
      const binaryString = atob(data);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }

      const decompressed = await new Response(
        new Blob([uint8Array]).stream().pipeThrough(new DecompressionStream('gzip')),
      ).text();

      return decompressed;
    } catch {
      return data;
    }
  }

  private async ensureReady(): Promise<void> {
    await this.dbReady;
  }

  async saveRequest(targetId: string, request: Partial<StoredRequest>): Promise<void> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not initialized');

    const stored: StoredRequest = {
      id: request.id || `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      targetId,
      method: request.method || 'GET',
      url: request.url || '',
      protocol: request.protocol || 'http',
      host: request.host || '',
      path: request.path || '/',
      status: request.status || 0,
      type: request.type || 'other',
      size: request.size || '0 B',
      time: request.time || '0ms',
      timestamp: request.timestamp || Date.now(),
      requestHeaders: request.requestHeaders || {},
      responseHeaders: request.responseHeaders || {},
      requestBody: request.requestBody || '',
      responseBody: request.responseBody || '',
      responseBodyCompressed: false,
      initiator: request.initiator,
      securityIssues: request.securityIssues,
      requestCookies: request.requestCookies,
      responseCookies: request.responseCookies,
    };

    // Compress response body if large
    if (stored.responseBody && stored.responseBody.length > this.compressThreshold) {
      try {
        stored.responseBody = await this.compress(stored.responseBody);
        stored.responseBodyCompressed = true;
      } catch {
        // Keep uncompressed
        stored.responseBodyCompressed = false;
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request_ = store.put(stored);

      request_.onsuccess = () => resolve();
      request_.onerror = () => reject(request_.error);
    });
  }

  async getRequests(targetId: string, limit = 1000, offset = 0): Promise<StoredRequest[]> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('targetId_timestamp');

      const requests: StoredRequest[] = [];
      let skipped = 0;
      let collected = 0;

      // Query in descending timestamp order (newest first)
      const range = IDBKeyRange.bound([targetId, 0], [targetId, Date.now()]);
      const cursor = index.openCursor(range, 'prev');

      cursor.onsuccess = async (event) => {
        const cursor_ = (event.target as IDBRequest).result;
        if (!cursor_) {
          resolve(requests);
          return;
        }

        if (skipped < offset) {
          skipped++;
          cursor_.continue();
          return;
        }

        if (collected < limit) {
          const value = cursor_.value as StoredRequest;
          // Decompress response body if needed
          if (value.responseBodyCompressed && value.responseBody) {
            try {
              value.responseBody = await this.decompress(value.responseBody, true);
              value.responseBodyCompressed = false;
            } catch {
              // Keep as-is if decompression fails
            }
          }
          requests.push(value);
          collected++;
          cursor_.continue();
        } else {
          resolve(requests);
        }
      };

      cursor.onerror = () => reject(cursor.error);
    });
  }

  async getRequestsCount(targetId: string): Promise<number> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('targetId');
      const range = IDBKeyRange.only(targetId);
      const count = index.count(range);

      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    });
  }

  async cleanupOld(targetId: string, keepCount: number): Promise<number> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not initialized');

    const count = await this.getRequestsCount(targetId);
    if (count <= keepCount) return 0;

    const toDelete = count - keepCount;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('targetId_timestamp');

      const requestsToDelete: string[] = [];
      let deleted = 0;

      // Get oldest requests (ascending timestamp)
      const range = IDBKeyRange.bound([targetId, 0], [targetId, Date.now()]);
      const cursor = index.openCursor(range, 'next');

      cursor.onsuccess = (event) => {
        const cursor_ = (event.target as IDBRequest).result;
        if (!cursor_ || deleted >= toDelete) {
          // Delete all collected requests
          const deleteTransaction = this.db!.transaction([STORE_NAME], 'readwrite');
          const deleteStore = deleteTransaction.objectStore(STORE_NAME);
          let completed = 0;

          requestsToDelete.forEach((id) => {
            const req = deleteStore.delete(id);
            req.onsuccess = () => {
              completed++;
              if (completed === requestsToDelete.length) {
                resolve(deleted);
              }
            };
            req.onerror = () => {
              // Continue even if one fails
              completed++;
              if (completed === requestsToDelete.length) {
                resolve(deleted);
              }
            };
          });

          if (requestsToDelete.length === 0) resolve(0);
          return;
        }

        const value = cursor_.value as StoredRequest;
        requestsToDelete.push(value.id);
        deleted++;
        cursor_.continue();
      };

      cursor.onerror = () => reject(cursor.error);
    });
  }

  async deleteTarget(targetId: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('targetId');
      const range = IDBKeyRange.only(targetId);
      const cursor = index.openCursor(range);

      cursor.onsuccess = (event) => {
        const cursor_ = (event.target as IDBRequest).result;
        if (!cursor_) {
          resolve();
          return;
        }
        cursor_.delete();
        cursor_.continue();
      };

      cursor.onerror = () => reject(cursor.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.ensureReady();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const requestStorage = new IndexedDBStorage();
