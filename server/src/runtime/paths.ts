/**
 * ------------------------------------------------------------------
 * Runtime Paths
 * ------------------------------------------------------------------
 * Thay thế `app.getPath('userData')` / `app.getPath('temp')` của Electron.
 * Mọi dữ liệu runtime nằm dưới app data dir (~/.phantoma/), nhất quán
 * với DB_PATH mặc định trong server.config.ts. Có thể override bằng
 * PHANTOMA_RUNTIME_DIR.
 * ------------------------------------------------------------------
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAppDataDir } from '../config/server.config';

/** Thư mục gốc cho toàn bộ dữ liệu runtime. */
export const RUNTIME_DIR = process.env.PHANTOMA_RUNTIME_DIR || getAppDataDir();

export const PROFILES_DIR = path.join(RUNTIME_DIR, 'profiles');
export const SANDBOX_DIR = path.join(RUNTIME_DIR, 'cli-sandboxes');
export const TMP_DIR = path.join(RUNTIME_DIR, 'tmp');
export const CERTS_DIR = path.join(RUNTIME_DIR, 'certs');
export const MEDIA_CACHE_DIR = path.join(RUNTIME_DIR, 'media_cache');
export const FRIDA_DIR = path.join(RUNTIME_DIR, 'frida-servers');

/** Tạo toàn bộ thư mục runtime nếu chưa tồn tại. */
export function ensureRuntimeDirs(): void {
  for (const dir of [
    RUNTIME_DIR,
    PROFILES_DIR,
    SANDBOX_DIR,
    TMP_DIR,
    CERTS_DIR,
    MEDIA_CACHE_DIR,
    FRIDA_DIR,
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}