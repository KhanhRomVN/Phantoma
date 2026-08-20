/**
 * ------------------------------------------------------------------
 * Trình xử lý sự kiện hội thoại
 * ------------------------------------------------------------------
 * IPC handler để lưu trữ bền vững các hội thoại chat trong tiến trình chính.
 * Lưu hội thoại dưới dạng file JSON trong thư mục home của người dùng,
 * hỗ trợ đầy đủ thao tác CRUD cùng lịch sử và giới hạn kích thước.
 *
 * Hàm chính:
 * - setupConversationHandlers() : Đăng ký tất cả IPC handler chat:
 * - getProjectDir()             : Xác định thư mục lưu trữ hội thoại
 * - ensureDir()                 : Tạo thư mục lưu trữ nếu thiếu
 * - enforceLimit()              : Giới hạn lịch sử còn MAX_HISTORY mục
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Electron ──
import { ipcMain } from 'electron';

// ── Node.js ──
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Internal ──
import { logger } from '../../utils/logger';

// ─── Constants ──────────────────────────────────────────────────────────
const CONTEXT_ROOT = path.join(os.homedir(), 'khanhromvn-phantoma');
const MAX_HISTORY = 50;

// ─── Functions ──────────────────────────────────────────────────────────
function getProjectDir(): string {
  // No workspace concept in Electron — use a single global dir
  return path.join(CONTEXT_ROOT, 'conversations');
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function setupConversationHandlers() {
  // Save / append a message to a conversation file
  ipcMain.handle('chat:logMessage', async (_e, conversationId: string, message: any) => {
    try {
      const dir = getProjectDir();
      ensureDir(dir);
      const filePath = path.join(dir, `${conversationId}.json`);
      let messages: any[] = [];
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        messages = Array.isArray(parsed) ? parsed : parsed.messages || [];
      } catch {
        logger.warn(`[Conversation] Failed to read existing conversation ${conversationId}, starting fresh`);
      }
      messages.push({ ...message, timestamp: message.timestamp || Date.now() });
      fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
      enforceLimit(dir);
      return { success: true };
    } catch (e: any) {
      logger.error('[Conversation] Failed to log message:', e);
      return { success: false, error: String(e) };
    }
  });

  // Save full conversation (overwrite)
  ipcMain.handle(
    'chat:save',
    async (_e, conversationId: string, data: { messages: any[]; metadata: any }) => {
      try {
        const dir = getProjectDir();
        ensureDir(dir);
        const filePath = path.join(dir, `${conversationId}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        enforceLimit(dir);
        return { success: true };
      } catch (e: any) {
        logger.error('[Conversation] Failed to save conversation:', e);
        return { success: false, error: String(e) };
      }
    },
  );

  // Get full conversation
  ipcMain.handle('chat:get', async (_e, conversationId: string) => {
    try {
      const dir = getProjectDir();
      const filePath = path.join(dir, `${conversationId}.json`);
      if (!fs.existsSync(filePath)) return { success: false, error: 'Not found' };
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        success: true,
        data: {
          messages: Array.isArray(parsed) ? parsed : parsed.messages || [],
          metadata: Array.isArray(parsed) ? null : parsed.metadata || null,
        },
      };
    } catch (e: any) {
      logger.error('[Conversation] Failed to get conversation:', e);
      return { success: false, error: String(e) };
    }
  });

  // Get history list
  ipcMain.handle('chat:getHistory', async () => {
    try {
      const dir = getProjectDir();
      ensureDir(dir);
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      const history: any[] = [];
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
          const parsed = JSON.parse(raw);
          const id = file.replace('.json', '');
          if (!Array.isArray(parsed) && parsed.metadata) {
            history.push({ ...parsed.metadata, id, messageCount: parsed.messages?.length || 0 });
          } else if (Array.isArray(parsed) && parsed.length > 0) {
            const userMsgs = parsed.filter((m: any) => m.role === 'user');
            const title = (userMsgs[0]?.content || '').replace(/\n/g, ' ').trim().substring(0, 100);
            const lastTs = parsed[parsed.length - 1]?.timestamp || 0;
            history.push({
              id,
              title: title || 'Conversation',
              timestamp: lastTs,
              lastModified: lastTs,
              messageCount: parsed.length,
            });
          }
        } catch {
          logger.warn(`[Conversation] Failed to read history file: ${file}`);
        }
      }
      history.sort(
        (a, b) => (b.lastModified || b.timestamp || 0) - (a.lastModified || a.timestamp || 0),
      );
      return { success: true, data: history };
    } catch (e: any) {
      logger.error('[Conversation] Failed to get history:', e);
      return { success: false, error: String(e) };
    }
  });

  // Delete one conversation
  ipcMain.handle('chat:delete', async (_e, conversationId: string) => {
    try {
      const filePath = path.join(getProjectDir(), `${conversationId}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { success: true };
    } catch (e: any) {
      logger.error('[Conversation] Failed to delete conversation:', e);
      return { success: false, error: String(e) };
    }
  });

  // Delete all conversations
  ipcMain.handle('chat:deleteAll', async () => {
    try {
      const dir = getProjectDir();
      if (!fs.existsSync(dir)) return { success: true };
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      for (const f of files) fs.unlinkSync(path.join(dir, f));
      return { success: true };
    } catch (e: any) {
      logger.error('[Conversation] Failed to delete all conversations:', e);
      return { success: false, error: String(e) };
    }
  });
}

function enforceLimit(dir: string) {
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (files.length <= MAX_HISTORY) return;
    for (const f of files.slice(MAX_HISTORY)) {
      fs.unlinkSync(path.join(dir, f.name));
    }
  } catch {
    logger.warn('[Conversation] Failed to enforce history limit');
  }
}