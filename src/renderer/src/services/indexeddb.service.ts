/**
 * ------------------------------------------------------------------
 * IndexedDB Service
 * ------------------------------------------------------------------
 * Wrapper chung cho IndexedDB với API dạng Promise. Dùng trong
 * renderer khi cần lưu trữ dữ liệu có cấu trúc với dung lượng lớn,
 * truy vấn theo index hoặc transaction.
 *
 * Main functions:
 * - open()      : Mở database (tạo/nâng cấp nếu cần)
 * - get()       : Lấy một bản ghi theo key
 * - getAll()    : Lấy toàn bộ bản ghi trong store
 * - getByIndex(): Lấy bản ghi theo index
 * - put()       : Thêm hoặc cập nhật bản ghi
 * - delete()    : Xóa bản ghi theo key
 * - count()     : Đếm số bản ghi trong store
 * - clear()     : Xóa toàn bộ bản ghi trong store
 * - close()     : Đóng kết nối database
 * - deleteDB()  : Xóa toàn bộ database
 * ------------------------------------------------------------------
 */

// ─── Class ───────────────────────────────────────────────────────────────
class IndexedDBService {
  private db: IDBDatabase | null = null;

  async open(
    dbName: string,
    version: number,
    upgradeCallback?: (db: IDBDatabase) => void,
  ): Promise<IDBDatabase> {
    if (this.db && this.db.name === dbName) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        upgradeCallback?.(db);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) throw new Error('Database not opened. Call open() first.');
    return this.db;
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: string | number,
  ): Promise<T[]> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value as any);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async deleteDB(dbName: string): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────
export const indexedDBService = new IndexedDBService();
export default indexedDBService;