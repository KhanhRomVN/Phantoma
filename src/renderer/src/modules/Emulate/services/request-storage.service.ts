/**
 * ------------------------------------------------------------------
 * Request Storage Service
 * ------------------------------------------------------------------
 * Lưu trữ network requests vào IndexedDB theo từng target. Hỗ trợ
 * nén/giải nén response body (gzip) cho request > 10KB để tiết kiệm
 * dung lượng. Cung cấp API phân trang (limit/offset).
 *
 * Các hàm chính:
 * - saveRequest()     : Lưu một request vào DB (tự động nén response body nếu > 10KB)
 * - getRequests()     : Lấy danh sách request của target (phân trang, mới nhất trước)
 * - getRequestsCount(): Đếm tổng số request của một target
 * - deleteTarget()    : Xóa toàn bộ request của một target
 * ------------------------------------------------------------------
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
  responseBody: string;
  responseBodyCompressed?: boolean;
  initiator?: string;
  securityIssues?: any[];
  requestCookies?: Record<string, string>;
  responseCookies?: Record<string, string>;
}

export class RequestStorage {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;
  private compressThreshold = 10240; // 10KB

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

      const uint8Array = new Uint8Array(compressed);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      return btoa(binary);
    } catch {
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

    if (stored.responseBody && stored.responseBody.length > this.compressThreshold) {
      try {
        stored.responseBody = await this.compress(stored.responseBody);
        stored.responseBodyCompressed = true;
      } catch {
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

      const finalize = async () => {
        for (const r of requests) {
          if (r.responseBodyCompressed && r.responseBody) {
            try {
              r.responseBody = await this.decompress(r.responseBody, true);
              r.responseBodyCompressed = false;
            } catch {
              // Keep as-is
            }
          }
        }
        resolve(requests);
      };

      const range = IDBKeyRange.bound([targetId, 0], [targetId, Date.now()]);
      const cursor = index.openCursor(range, 'prev');

      cursor.onsuccess = (event) => {
        const cursor_ = (event.target as IDBRequest).result;
        if (!cursor_) {
          finalize();
          return;
        }

        if (skipped < offset) {
          skipped++;
          cursor_.continue();
          return;
        }

        if (collected < limit) {
          const value = cursor_.value as StoredRequest;
          requests.push(value);
          collected++;
          cursor_.continue();
        } else {
          finalize();
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
}

// Singleton instance
export const requestStorage = new RequestStorage();
