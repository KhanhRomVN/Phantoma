/**
 * ------------------------------------------------------------------
 * Memory Storage
 * ------------------------------------------------------------------
 * Lưu trữ memory toàn cục trong file markdown duy nhất:
 *   ~/.phantoma/memory.md
 *
 * Memory là cross-project, chia sẻ giữa mọi conversation.
 *
 * Hàm chính:
 * - readMemory()   : Đọc nội dung memory (trả về exists=false nếu chưa có)
 * - updateMemory() : Replace old_content bằng new_content (exact match)
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────
export interface MemoryReadResult {
  exists: boolean;
  content: string;
}

export interface MemoryUpdateResult {
  created: boolean;
  content: string;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class MemoryStorage {
  private readonly filePath: string;

  constructor() {
    this.filePath = path.join(os.homedir(), '.phantoma', 'memory.md');
  }

  /**
   * Read current memory content.
   */
  readMemory(): MemoryReadResult {
    if (!fs.existsSync(this.filePath)) {
      return { exists: false, content: '' };
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return { exists: true, content };
    } catch (err: any) {
      logger.error('[MemoryStorage] Read failed:', err.message);
      throw err;
    }
  }

  /**
   * Replace old_content with new_content. First write uses old_content = ''.\
   * Exact-match semantics (same as replace_in_file but simpler).
   */
  updateMemory(oldContent: string, newContent: string): MemoryUpdateResult {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // First initialization
    if (oldContent === '') {
      const created = !fs.existsSync(this.filePath);
      const existing = created ? '' : fs.readFileSync(this.filePath, 'utf-8');
      const merged = existing ? existing + newContent : newContent;
      fs.writeFileSync(this.filePath, merged, 'utf-8');
      return { created, content: merged };
    }

    if (!fs.existsSync(this.filePath)) {
      throw new Error('Memory file does not exist. Use old_content="" to initialize.');
    }

    const content = fs.readFileSync(this.filePath, 'utf-8');
    const idx = content.indexOf(oldContent);
    if (idx === -1) {
      throw new Error('old_content not found in memory.md');
    }

    const updated = content.slice(0, idx) + newContent + content.slice(idx + oldContent.length);
    fs.writeFileSync(this.filePath, updated, 'utf-8');
    return { created: false, content: updated };
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const memoryStorage = new MemoryStorage();