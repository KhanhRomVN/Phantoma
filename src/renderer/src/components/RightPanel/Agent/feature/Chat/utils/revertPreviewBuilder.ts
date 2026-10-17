/**
 * ------------------------------------------------------------------
 * Revert Preview Builder
 * ------------------------------------------------------------------
 * Xây dựng danh sách file bị ảnh hưởng khi revert conversation về
 * message X. Duyệt tất cả assistant message sau message X, parse tool
 * actions, và lấy action cuối cùng cho mỗi file path.
 *
 * Main functions:
 * - buildRevertPreview()  : Trả về RevertFileEntry[]
 * - classifyFile()        : Phân loại actionType → group
 * ------------------------------------------------------------------
 */

import type { Message } from '../types/message';
import type { RevertFileEntry, RevertGroupKey } from '../types/revert';
import { parseAIResponse } from '../services/ResponseParser';

/** Các tool làm thay đổi file trên disk — map sang actionType chuẩn cho preview. */
const FILE_MUTATING_TOOLS = new Set([
  'write_to_file',
  'create_file',
  'replace_in_file',
  'delete_file',
  'rename_file',
  'move_file',
]);

/**
 * Phân loại một action thành nhóm revert.
 * - delete_file → restore (file sẽ được khôi phục lại)
 * - write_to_file / create_file → remove (file mới tạo sẽ bị xóa)
 * - còn lại → undo (file bị sửa sẽ được revert)
 */
export function classifyFile(entry: RevertFileEntry): RevertGroupKey {
  if (entry.actionType === 'delete_file') return 'restore';
  if (entry.actionType === 'write_to_file' || entry.actionType === 'create_file') {
    return 'remove';
  }
  return 'undo';
}

/**
 * Xây dựng revert preview từ danh sách messages.
 *
 * @param messages       Toàn bộ messages trong conversation (theo thứ tự thời gian).
 * @param targetMessageId ID của message mốc — revert sẽ về TRƯỚC message này.
 * @returns Danh sách file bị ảnh hưởng, sorted theo path.
 */
export function buildRevertPreview(
  messages: Message[],
  targetMessageId: string,
): RevertFileEntry[] {
  if (!messages.length) return [];

  const targetIndex = messages.findIndex((m) => m.id === targetMessageId);
  if (targetIndex === -1) return [];

  // Map: filePath → actionType của lần cuối cùng chạm vào file đó.
  // Nếu một file bị tác động nhiều lần, chỉ giữ action cuối (đúng với
  // semantics của revert: file sẽ về trạng thái trước targetMessageId).
  const finalActionByPath = new Map<string, string>();

  for (let i = targetIndex; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== 'assistant' || !msg.content) continue;

    let parsed = msg.parsed;
    if (!parsed) {
      try {
        parsed = parseAIResponse(msg.content);
      } catch {
        continue;
      }
    }

    if (!parsed?.actions?.length) continue;

    for (const action of parsed.actions) {
      if (action.isError) continue;
      if (!FILE_MUTATING_TOOLS.has(action.type)) continue;

      const filePath = action.params?.file_path || action.params?.path;
      if (!filePath || typeof filePath !== 'string') continue;

      finalActionByPath.set(filePath, action.type);
    }
  }

  const entries: RevertFileEntry[] = [];
  for (const [filePath, actionType] of finalActionByPath.entries()) {
    entries.push({
      filePath,
      actionType,
      additions: 0,
      deletions: 0,
    });
  }

  entries.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return entries;
}