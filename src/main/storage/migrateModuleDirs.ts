import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logger } from '../utils/logger';

const MODULE_DIR_PATTERN = /^(emulate|recon|code):(.+)$/;

export function migrateModuleDirs(): void {
  const root = path.join(os.homedir(), '.phantoma');
  if (!fs.existsSync(root)) return;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const match = MODULE_DIR_PATTERN.exec(entry.name);
    if (!match) continue;

    const [, moduleName, id] = match;
    const from = path.join(root, entry.name);
    const to = path.join(root, moduleName, id);
    try {
      if (fs.existsSync(to)) continue;
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
    } catch (err: any) {
      logger.error(`[migrateModuleDirs] Failed to move ${entry.name}:`, err.message);
    }
  }
}