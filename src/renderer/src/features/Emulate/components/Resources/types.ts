import { WasmItem } from '../../../../utils/detectors';

export type ResourceType = 'image' | 'video' | 'audio' | 'wasm' | 'font' | 'document' | 'other';

export interface ResourceItem {
  id: string;
  filename: string;
  url: string;
  path: string;
  type: ResourceType;
  contentType: string;
  size: string;
  timestamp: number;
  source: string;
  responseBody?: string;
  isWasm?: boolean;
  wasmItem?: WasmItem;
}

export const TYPE_LABELS: Record<ResourceType, string> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  wasm: 'WASM',
  font: 'Fonts',
  document: 'Documents',
  other: 'Other',
};

export const TYPE_ICONS = {
  image: 'ImageIcon',
  video: 'FileVideo',
  audio: 'FileAudio',
  wasm: 'Cpu',
  font: 'FileType2',
  document: 'FileText',
  other: 'File',
} as const;

export function getFileType(contentType: string, path: string): ResourceType {
  const ct = contentType.toLowerCase();
  const p = path.toLowerCase();

  if (ct.startsWith('image/') || p.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|avif)$/)) {
    return 'image';
  }
  if (ct.startsWith('video/') || p.match(/\.(mp4|webm|ogg|mov|avi|mkv|ts|m3u8)$/)) {
    return 'video';
  }
  if (ct.startsWith('audio/') || p.match(/\.(mp3|wav|aac|flac|m4a|ogg|opus)$/)) {
    return 'audio';
  }
  if (ct === 'application/wasm' || p.endsWith('.wasm')) {
    return 'wasm';
  }
  if (ct.includes('font') || p.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
    return 'font';
  }
  if (p.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|xml|json)$/)) {
    return 'document';
  }
  return 'other';
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}