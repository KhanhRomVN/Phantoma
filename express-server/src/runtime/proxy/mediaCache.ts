/**
 * ------------------------------------------------------------------
 * Media Cache (port từ src/main/proxy/mediaCache.ts)
 * ------------------------------------------------------------------
 * Thay app.getPath('userData') → RUNTIME_DIR/media_cache.
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/logger';
import { RUNTIME_DIR } from '../paths';

const logger = createLogger('MediaCache');

class MediaCache {
  private cacheDir: string;
  private manifestFile: string;
  private manifest: Record<
    string,
    { contentType: string; filename: string; timestamp: number; size?: number }
  >;

  constructor() {
    this.cacheDir = path.join(RUNTIME_DIR, 'media_cache');
    this.manifestFile = path.join(this.cacheDir, 'manifest.json');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    if (fs.existsSync(this.manifestFile)) {
      try {
        this.manifest = JSON.parse(fs.readFileSync(this.manifestFile, 'utf-8'));
      } catch (e) {
        logger.error('Failed to load manifest', { err: String(e) });
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
      logger.error('Failed to save manifest', { err: String(e) });
    }
  }

  public has(requestId: string): boolean {
    const entry = this.manifest[requestId];
    if (!entry) return false;
    return fs.existsSync(path.join(this.cacheDir, requestId));
  }

  public get(requestId: string): { buffer: Buffer; contentType: string } | null {
    const entry = this.manifest[requestId];
    if (!entry) return null;

    const filePath = path.join(this.cacheDir, requestId);
    if (!fs.existsSync(filePath)) return null;

    try {
      const buffer = fs.readFileSync(filePath);
      return { buffer, contentType: entry.contentType };
    } catch (e) {
      logger.error(`Failed to read cached file ${requestId}`, { err: String(e) });
      return null;
    }
  }

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
      logger.error(`Failed to save media ${requestId}`, { err: String(e) });
    }
  }

  public clear() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
      this.manifest = {};
      this.saveManifest();
    } catch (e) {
      logger.error('Failed to clear cache', { err: String(e) });
    }
  }

  public getManifest() {
    return this.manifest;
  }
}

export const mediaCache = new MediaCache();