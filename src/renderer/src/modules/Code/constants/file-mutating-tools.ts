/**
 * ------------------------------------------------------------------
 * File Mutating Tools
 * ------------------------------------------------------------------
 * Tự động build danh sách các tool types làm thay đổi file trên disk
 * từ CODE_TAG_REGISTRY bằng cách lọc các tool có features.isFileMutation.
 * Dùng trong revert preview builder để xác định file nào bị ảnh hưởng.
 *
 * Main exports:
 * - FILE_MUTATING_TOOLS : Set chứa tool types mutate files
 * ------------------------------------------------------------------
 */

import { CODE_TAG_REGISTRY } from './tag-registry';

export const FILE_MUTATING_TOOLS = new Set(
  Object.entries(CODE_TAG_REGISTRY)
    .filter(([_, def]) => def.features?.isFileMutation)
    .map(([id]) => id),
);