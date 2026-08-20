/**
 * ------------------------------------------------------------------
 * Cache media
 * ------------------------------------------------------------------
 * Lưu trữ bền vững cho các phân đoạn media (ví dụ file .ts) để chúng
 * vẫn khả dụng ngay cả sau khi URL gốc hết hạn. Duy trì
 * một manifest JSON của nội dung đã cache.
 *
 * Hàm chính:
 * - has()        : Kiểm tra xem ID yêu cầu có trong cache
 * - get()        : Lấy nội dung đã cache theo ID yêu cầu
 * - save()       : Lưu nội dung media vào cache
 * - clear()      : Xóa tất cả media đã cache
 * - getManifest(): Trả về manifest cache đầy đủ
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { app } from 'electron';

// ── Node.js ──
import * as fs from 'fs';
import * as path from 'path';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Class ──────────────────────────────────────────────────────────────
class MediaCache {
  private cacheDir: string;
  private manifestFile: string;
  private manifest: Record<
    string,
    { contentType: string; filename: string; timestamp: number; size?: number }
  >;

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'media_cache');
    this.manifestFile = path.join(this.cacheDir, 'manifest.json');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    if (fs.existsSync(this.manifestFile)) {
      try {
        this.manifest = JSON.parse(fs.readFileSync(this.manifestFile, 'utf-8'));
      } catch (e) {
        logger.error('[MediaCache] Failed to load manifest:', e);
        this.manifest = {};
      }
    } else {
      this.manifest = {};
    }
  }

  private saveManifest() {
    try {
      fs.writeFileSync(this.manifestFile, JSON.stringify(this.manifest, null, 2));
    } catch (e) {
      logger.error('[MediaCache] Failed to save manifest:', e);
    }
  }

  /**
   * Checks if a request ID exists in the cache.
   */
  public has(requestId: string): boolean {
    const entry = this.manifest[requestId];
    if (!entry) return false;
    return fs.existsSync(path.join(this.cacheDir, requestId));
  }

  /**
   * Retrieves cached media content.
   */
  public get(requestId: string): { buffer: Buffer; contentType: string } | null {
    const entry = this.manifest[requestId];
    if (!entry) return null;

    const filePath = path.join(this.cacheDir, requestId);
    if (!fs.existsSync(filePath)) return null;

    try {
      const buffer = fs.readFileSync(filePath);
      return { buffer, contentType: entry.contentType };
    } catch (e) {
      logger.error(`[MediaCache] Failed to read cached file ${requestId}:`, e);
      return null;
    }
  }

  /**
   * Saves media content to the cache.
   */
  public save(requestId: string, buffer: Buffer, contentType: string, filename: string) {
    const filePath = path.join(this.cacheDir, requestId);
    try {
      fs.writeFileSync(filePath, buffer);
      this.manifest[requestId] = {
        contentType,
        filename,
        timestamp: Date.now(),
        size: buffer.length,
      };
      this.saveManifest();
    } catch (e) {
      logger.error(`[MediaCache] Failed to save media ${requestId}:`, e);
    }
  }

  /**
   * Clears all cached media.
   */
  public clear() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
      this.manifest = {};
      this.saveManifest();
    } catch (e) {
      logger.error('[MediaCache] Failed to clear cache:', e);
    }
  }

  /**
   * Returns the entire cache manifest.
   */
  public getManifest() {
    return this.manifest;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const mediaCache = new MediaCache();
