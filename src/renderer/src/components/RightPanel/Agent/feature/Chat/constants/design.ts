/**
 * ------------------------------------------------------------------
 * Design Tool Tag Registry
 * ------------------------------------------------------------------
 * Định nghĩa metadata cho các tool thuộc module Design.
 * Design folder phẳng và nằm trong sandbox, nên mọi tool đều allow.
 *
 * Main exports:
 * - DESIGN_TAG_REGISTRY : Registry chứa định nghĩa các design tools
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
import type { TagDefinition } from '../types/tag-types';

// ─── Constants ──────────────────────────────────────────────────────────
// create_file / update_file: tên tag XML mà AI viết — scanner chỉ nhận tag có trong registry.
// design_*: action type sau khi parse với feature 'design' — dùng để tra title/permission/timeout.
export const DESIGN_TAG_REGISTRY: Record<string, TagDefinition> = {
  create_file: {
    id: 'create_file',
    title: 'CREATE FILE',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  update_file: {
    id: 'update_file',
    title: 'UPDATE FILE',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  design_read_file: {
    id: 'design_read_file',
    title: 'READ FILE',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  design_create_file: {
    id: 'design_create_file',
    title: 'CREATE FILE',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  design_update_file: {
    id: 'design_update_file',
    title: 'UPDATE FILE',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  design_list_files: {
    id: 'design_list_files',
    title: 'LIST FILES',
    category: 'tool',
    timeout: 10000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
  design_grep: {
    id: 'design_grep',
    title: 'GREP',
    category: 'tool',
    timeout: 15000,
    permissions: { approval: 'allow', fullAccess: 'allow' },
  },
};