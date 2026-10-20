/**
 * ------------------------------------------------------------------
 * Dangerous Command Detector
 * ------------------------------------------------------------------
 * Phát hiện các shell command có khả năng phá hủy dữ liệu hệ thống
 * hoặc Git history. Kết quả dùng để hiển thị UI cảnh báo trước khi
 * chạy (DESTRUCTIVE-COMMAND-CONFIRM enforcement).
 *
 * Nguyên tắc: whitelist không khả thi — dùng regex pattern matching
 * trên các lệnh nguy hiểm đã biết. False positive có thể xảy ra với
 * các lệnh chứa chuỗi tương tự trong quotes — user luôn có thể Cancel.
 * ------------------------------------------------------------------
 */

export interface DangerousCommandInfo {
  actionId: string;
  commandText: string;
  folderPath?: string;
  reason: string;
}

interface PatternRule {
  pattern: RegExp;
  reason: string;
}

const RULES: PatternRule[] = [
  // Filesystem destructive
  { pattern: /\brm\s+(-[rRfF]+\s+)+/, reason: 'Xoá file/thư mục đệ quy (rm -rf)' },
  { pattern: /\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*)\s+[\/]/, reason: 'Xoá thư mục gốc hoặc đường dẫn tuyệt đối' },
  { pattern: /\bdd\s+if=.*\bof=\/dev\//, reason: 'Ghi trực tiếp vào thiết bị block' },
  { pattern: /\bmkfs(\.[a-z0-9]+)?\b/, reason: 'Format ổ đĩa (mkfs)' },
  { pattern: /\b(shred|wipefs)\b/, reason: 'Ghi đè/Xoá vĩnh viễn dữ liệu ổ đĩa' },

  // Permission destructive
  { pattern: /\bchmod\s+(-R\s+)?[0-7]*7[0-7]*7\s+\//, reason: 'Chmod 777 đệ quy trên đường dẫn hệ thống' },
  { pattern: /\bchown\s+(-R\s+)?\S+\s+\//, reason: 'Chown đệ quy trên đường dẫn hệ thống' },

  // Git destructive
  { pattern: /\bgit\s+push\s+.*--force(-with-lease)?\b/, reason: 'Force push lên remote (git push --force)' },
  { pattern: /\bgit\s+push\s+-f\b/, reason: 'Force push lên remote (git push -f)' },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: 'Reset cứng, mất mọi thay đổi chưa commit' },
  { pattern: /\bgit\s+clean\s+-[a-zA-Z]*[fdx]+/, reason: 'Xoá file untracked (git clean -fd)' },
  { pattern: /\bgit\s+checkout\s+--\s+\./, reason: 'Discard toàn bộ thay đổi' },

  // Database destructive
  { pattern: /\bdrop\s+(database|table|schema)\b/i, reason: 'Xoá database/table/schema' },
  { pattern: /\btruncate\s+table\b/i, reason: 'Xoá toàn bộ dữ liệu trong bảng' },

  // System shutdown/reboot
  { pattern: /\b(shutdown|reboot|halt|poweroff)\b/, reason: 'Tắt/khởi động lại hệ thống' },

  // Process kill toàn bộ
  { pattern: /\bkillall\s+(-9\s+)?\S+/, reason: 'Kill toàn bộ process theo tên' },
  { pattern: /\bpkill\s+-9\s+/, reason: 'Kill cứng process' },
];

/**
 * Kiểm tra một command text có nguy hiểm không.
 * @returns Chuỗi lý do nếu nguy hiểm, null nếu an toàn.
 */
export function detectDangerousCommand(commandText: string): string | null {
  if (!commandText || typeof commandText !== 'string') return null;
  for (const rule of RULES) {
    if (rule.pattern.test(commandText)) return rule.reason;
  }
  return null;
}

/**
 * Duyệt danh sách tool actions và trả về map actionId → info cho
 * các run_command action nguy hiểm.
 */
export function buildDangerousCommandMap(
  messageId: string,
  actions: Array<{ type: string; params: Record<string, any> }>,
): Record<string, DangerousCommandInfo> {
  const result: Record<string, DangerousCommandInfo> = {};
  actions.forEach((action, index) => {
    if (action.type !== 'run_command') return;
    const commandText = action.params?.command;
    if (!commandText) return;
    const reason = detectDangerousCommand(commandText);
    if (!reason) return;
    const actionId = `${messageId}-action-${index}`;
    result[actionId] = {
      actionId,
      commandText,
      folderPath: action.params?.folder_path,
      reason,
    };
  });
  return result;
}