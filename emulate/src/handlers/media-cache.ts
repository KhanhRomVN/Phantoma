/**
 * ------------------------------------------------------------------
 * Media Cache
 * ------------------------------------------------------------------
 * Caches binary responses (images, videos) to disk for later retrieval.
 * Uses a dedicated directory within the interceptor's home.
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

// Define cache directory relative to this service's root or home
const CACHE_BASE_DIR = path.join(process.env.HOME || '~', '.phantoma', 'interceptor-media');
const MANIFEST_FILE = path.join(CACHE_BASE_DIR, 'manifest.json');

class MediaCache {
  private manifest: Record<string, { contentType: string; filename: string; timestamp: number; size?: number }> = {};

  constructor() {
    if (!fs.existsSync(CACHE_BASE_DIR)) {
      fs.mkdirSync(CACHE_BASE_DIR, { recursive: true });
    }

    if (fs.existsSync(MANIFEST_FILE)) {
      try {
        this.manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
      } catch (e) {
        logger.error('Failed to load manifest', { err: String(e) });
        this.manifest = {};
      }
    }
  }

  private saveManifest() {
    try {
      fs.writeFileSync(MANIFEST_FILE, JSON.stringify(this.manifest, null, 2));
    } catch (e) {
      logger.error('Failed to save manifest', { err: String(e) });
    }
  }

  public has(requestId: string): boolean {
    const entry = this.manifest[requestId];
    if (!entry) return false;
    return fs.existsSync(path.join(CACHE_BASE_DIR, requestId));
  }

  public get(requestId: string): { buffer: Buffer; contentType: string } | null {
    const entry = this.manifest[requestId];
    if (!entry) return null;

    const filePath = path.join(CACHE_BASE_DIR, requestId);
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
    const filePath = path.join(CACHE_BASE_DIR, requestId);
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
      const files = fs.readdirSync(CACHE_BASE_DIR);
      for (const file of files) {
        if (file !== 'manifest.json') {
          fs.unlinkSync(path.join(CACHE_BASE_DIR, file));
        }
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