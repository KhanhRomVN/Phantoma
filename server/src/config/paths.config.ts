/**
 * ------------------------------------------------------------------
 * Paths Config
 * ------------------------------------------------------------------
 * Mọi đường dẫn file/thư mục dữ liệu của server tập trung tại đây.
 * ------------------------------------------------------------------
 */

import os from 'os';
import path from 'path';

const expandHome = (p: string): string =>
  p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;

const homeDir = path.join(os.homedir(), '.phantoma');

export const paths = {
  homeDir,
  preferencesFile: path.join(homeDir, 'preferences.json'),
  // ASSUMED: giữ nguyên thư mục cũ của profile server để các bản browser đã cài vẫn dùng được
  dataDir: expandHome(process.env.PROFILE_DATA_DIR || '~/.phantoma/profile'),
} as const;
