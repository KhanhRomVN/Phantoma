/**
 * ------------------------------------------------------------------
 * Resource Type Constants
 * ------------------------------------------------------------------
 * Cấu hình loại tài nguyên (resource type) — nguồn dữ liệu duy nhất.
 * Mỗi loại có label, regex khớp extension và content-type.
 *
 * Các exports chính:
 * - RESOURCE_TYPES        : Map cấu hình tất cả resource types
 * - ResourceType          : Type suy ra từ key của RESOURCE_TYPES
 * - detectResourceType()  : Nhận diện loại resource từ content-type/path
 * ------------------------------------------------------------------
 */

// ─── Constants ──────────────────────────────────────────────────────────
export const RESOURCE_TYPES = {
  image: {
    label: 'Images',
    extensions: /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|avif)$/i,
    contentType: /^image\//i,
  },
  video: {
    label: 'Videos',
    extensions: /\.(mp4|webm|ogg|mov|avi|mkv|ts|m3u8)$/i,
    contentType: /^video\//i,
  },
  audio: {
    label: 'Audio',
    extensions: /\.(mp3|wav|aac|flac|m4a|ogg|opus)$/i,
    contentType: /^audio\//i,
  },
  wasm: {
    label: 'WASM',
    extensions: /\.wasm$/i,
    contentType: /^application\/wasm$/i,
  },
  font: {
    label: 'Fonts',
    extensions: /\.(woff|woff2|ttf|otf|eot)$/i,
    contentType: /font/i,
  },
  document: {
    label: 'Documents',
    extensions: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|xml|json)$/i,
    contentType: /^(text|application)\/(json|xml|javascript|html|css|plain)/i,
  },
  other: {
    label: 'Other',
    extensions: /.*/,
    contentType: /.*/,
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────
export type ResourceType = keyof typeof RESOURCE_TYPES;

// ─── Functions ──────────────────────────────────────────────────────────
export function detectResourceType(contentType: string, path: string): ResourceType {
  const ct = contentType.toLowerCase();
  const p = path.toLowerCase();

  // Ưu tiên khớp content-type trước
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct === 'application/wasm') return 'wasm';
  if (ct.includes('font')) return 'font';

  // Fallback khớp theo extension
  if (p.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|avif)$/)) return 'image';
  if (p.match(/\.(mp4|webm|ogg|mov|avi|mkv|ts|m3u8)$/)) return 'video';
  if (p.match(/\.(mp3|wav|aac|flac|m4a|ogg|opus)$/)) return 'audio';
  if (p.endsWith('.wasm')) return 'wasm';
  if (p.match(/\.(woff|woff2|ttf|otf|eot)$/)) return 'font';
  if (p.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|xml|json)$/)) return 'document';

  return 'other';
}