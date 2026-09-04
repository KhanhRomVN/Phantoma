/**
 * ------------------------------------------------------------------
 * Utils Barrel Export
 * ------------------------------------------------------------------
 * Re-export tất cả utility functions của module Emulate.
 * Import từ đây thay vì import trực tiếp từ từng file.
 *
 * Usage:
 *   import { buildSourceTree, getRequestCategory, generatePayloads } from '../utils';
 * ------------------------------------------------------------------
 */

// ─── Exports ────────────────────────────────────────────────────────────
// ── Source tree ──
export {
  buildSourceTree,
  parseUrl,
  findNodeByUrl,
  getAllFiles,
  searchFiles,
  getTreeStats,
  exportTreeAsJson,
  formatSize,
} from './source-tree.util';
export type { SourceNode, SourceTreeData } from './source-tree.util';

// ── Fuzzer payload ──
export { generatePayloads, applyPayload, parseHeaders, countPayloads } from './fuzzer-payload.util';

// ── Request classifier ──
export { getRequestCategory } from './request-classifier.util';

// ── Network event parser ──
export {
  CDP_RESOURCE_TYPE_MAP,
  parseUrlParts,
  detectTypeFromRequest,
  buildCdpRequest,
  parseProxyRequest,
  decodeBinaryBody,
  formatElapsedTime,
  formatResponseSize,
  buildPlaceholderRequest,
} from './network-event-parser.util';
export type { CdpRequestInput, ProxyRequestInput } from './network-event-parser.util';