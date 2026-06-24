// Resource types configuration for Resources panel
export type ResourceType = 'image' | 'video' | 'audio' | 'wasm' | 'font' | 'document' | 'other';

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  image: 'Images',
  video: 'Videos',
  audio: 'Audio',
  wasm: 'WASM',
  font: 'Fonts',
  document: 'Documents',
  other: 'Other',
};

export const RESOURCE_TYPE_ICONS: Record<ResourceType, string> = {
  image: 'ImageIcon',
  video: 'FileVideo',
  audio: 'FileAudio',
  wasm: 'Cpu',
  font: 'FileType2',
  document: 'FileText',
  other: 'File',
};

export const RESOURCE_TYPE_EXTENSIONS: Record<ResourceType, RegExp> = {
  image: /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|avif)$/i,
  video: /\.(mp4|webm|ogg|mov|avi|mkv|ts|m3u8)$/i,
  audio: /\.(mp3|wav|aac|flac|m4a|ogg|opus)$/i,
  wasm: /\.wasm$/i,
  font: /\.(woff|woff2|ttf|otf|eot)$/i,
  document: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|xml|json)$/i,
  other: /.*/,
};

export const RESOURCE_TYPE_CONTENT_TYPES: Record<ResourceType, RegExp> = {
  image: /^image\//i,
  video: /^video\//i,
  audio: /^audio\//i,
  wasm: /^application\/wasm$/i,
  font: /font/i,
  document: /^(text|application)\/(json|xml|javascript|html|css|plain)/i,
  other: /.*/,
};

export function detectResourceType(contentType: string, path: string): ResourceType {
  const ct = contentType.toLowerCase();
  const p = path.toLowerCase();

  // Check content type first
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct === 'application/wasm') return 'wasm';
  if (ct.includes('font')) return 'font';

  // Check extension
  if (p.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|avif)$/)) return 'image';
  if (p.match(/\.(mp4|webm|ogg|mov|avi|mkv|ts|m3u8)$/)) return 'video';
  if (p.match(/\.(mp3|wav|aac|flac|m4a|ogg|opus)$/)) return 'audio';
  if (p.endsWith('.wasm')) return 'wasm';
  if (p.match(/\.(woff|woff2|ttf|otf|eot)$/)) return 'font';
  if (p.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|xml|json)$/)) return 'document';

  return 'other';
}