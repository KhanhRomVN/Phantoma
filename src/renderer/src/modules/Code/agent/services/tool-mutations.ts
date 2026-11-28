/**
 * ------------------------------------------------------------------
 * Code Tool Mutations
 * ------------------------------------------------------------------
 * Các hàm kiểm tra hành vi thay đổi filesystem của tool trong Code module:
 * nhận diện tool có mutate file không, trích xuất đường dẫn file và
 * tính số dòng thêm/xóa.
 *
 * Main functions:
 * - checkCodeToolMutation()   : Kiểm tra tool có thay đổi filesystem (create/modify/delete)
 * - extractCodeFilePath()     : Trích xuất file_path từ params của tool
 * - checkCodeSingleLineReview(): Kiểm tra write_to_file có nội dung một dòng quá dài
 * - calculateCodeDiff()       : Tính additions/deletions cho write_to_file và replace_in_file
 * ------------------------------------------------------------------
 */

// ─── Imports ─────────────────────────────────────────────────────────────────
// ── Utils ──
import {
  DiffCalculator,
  FilePathExtractor,
  SingleLineReviewChecker,
  ToolMutationChecker,
} from '@renderer/modules/Code/shared/zen/zen-bridge';

// ─── Functions ───────────────────────────────────────────────────────────────
const countLines = (text: string | undefined): number => {
  if (!text) return 0;
  return text.split('\n').length;
};

/**
 * Check if Code tool mutates filesystem.
 */
export const checkCodeToolMutation: ToolMutationChecker = (action) => {
  switch (action.type) {
    case 'write_to_file':
      return { mutates: true, mutationType: 'create' };
    case 'replace_in_file':
      return { mutates: true, mutationType: 'modify' };
    case 'delete_file':
      return { mutates: true, mutationType: 'delete' };
    default:
      return { mutates: false };
  }
};

/**
 * Extract file path from Code tool actions.
 */
export const extractCodeFilePath: FilePathExtractor = (action) => {
  if (
    action.type === 'write_to_file' ||
    action.type === 'replace_in_file' ||
    action.type === 'delete_file' ||
    action.type === 'read_file'
  ) {
    return action.params?.file_path || action.params?.path || null;
  }
  return null;
};

/**
 * Check if write_to_file needs single-line review.
 * Returns true if content is single-line and > 100 chars.
 */
export const checkCodeSingleLineReview: SingleLineReviewChecker = (action) => {
  if (action.type !== 'write_to_file') return false;
  const content = action.params?.content || '';
  return !content.includes('\n') && content.length > 100;
};

/**
 * Calculate diff for write_to_file and replace_in_file.
 */
export const calculateCodeDiff: DiffCalculator = (action) => {
  if (action.type === 'write_to_file') {
    return {
      additions: countLines(action.params?.content),
      deletions: 0,
    };
  }
  if (action.type === 'replace_in_file') {
    return {
      additions: countLines(action.params?.new_content),
      deletions: countLines(action.params?.old_content),
    };
  }
  return null;
};
