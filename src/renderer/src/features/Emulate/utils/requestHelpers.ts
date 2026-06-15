export type PayloadType = 'list' | 'numbers' | 'brute';

export interface FuzzerJobParams {
  payloadType: PayloadType;
  payloadList: string;
  numberFrom: number;
  numberTo: number;
  numberStep: number;
  bruteChars: string;
  bruteLen: number;
}

export function* generatePayloads(job: FuzzerJobParams): Generator<string> {
  if (job.payloadType === 'list') {
    for (const line of job.payloadList.split('\n')) {
      const p = line.trim();
      if (p) yield p;
    }
  } else if (job.payloadType === 'numbers') {
    for (let i = job.numberFrom; i <= job.numberTo; i += job.numberStep) yield String(i);
  } else {
    const chars = job.bruteChars;
    const len = job.bruteLen;
    const total = Math.pow(chars.length, len);
    for (let i = 0; i < total; i++) {
      let n = i,
        word = '';
      for (let j = 0; j < len; j++) {
        word = chars[n % chars.length] + word;
        n = Math.floor(n / chars.length);
      }
      yield word;
    }
  }
}

export function countPayloads(job: FuzzerJobParams): number {
  if (job.payloadType === 'list') {
    return job.payloadList.split('\n').filter((l) => l.trim()).length;
  }
  if (job.payloadType === 'numbers') {
    return Math.max(0, Math.floor((job.numberTo - job.numberFrom) / job.numberStep) + 1);
  }
  return Math.pow(job.bruteChars.length, job.bruteLen);
}

export function applyPayload(template: string, payload: string): string {
  return template.replace(/§[^§]*§/g, payload);
}

export function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) {
      headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return headers;
}

export function getRequestCategory(req: { type?: string; path?: string; protocol?: string }): string {
  const type = (req.type || '').toLowerCase();

  if (type.includes('xhr') || type.includes('fetch')) return 'xhr';
  if (type.includes('js') || type.includes('script') || req.path?.match(/\.js(\?|$)/)) return 'js';
  if (type.includes('css') || req.path?.match(/\.css(\?|$)/)) return 'css';
  if (
    type.includes('img') || type.includes('image') ||
    type.includes('png') || type.includes('jpg') || type.includes('jpeg') ||
    type.includes('gif') || type.includes('svg') || type.includes('ico') ||
    type.includes('webp') || req.path?.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/)
  ) return 'img';
  if (
    type.includes('media') || type.includes('video') || type.includes('audio') ||
    req.path?.match(/\.(mp4|webm|ogg|mp3|wav)(\?|$)/)
  ) return 'media';
  if (
    type.includes('font') || type.includes('woff') || type.includes('ttf') ||
    req.path?.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)
  ) return 'font';
  if (type.includes('ws') || type.includes('websocket') || req.protocol === 'ws' || req.protocol === 'wss') return 'ws';
  if (type.includes('wasm') || req.path?.match(/\.wasm(\?|$)/)) return 'wasm';
  if (type.includes('manifest') || req.path?.match(/manifest\.json(\?|$)/)) return 'manifest';
  if (type.includes('doc') || type.includes('html') || type.includes('document') || (!type && !req.path?.includes('.'))) return 'doc';

  return 'other';
}

export function parseSize(sizeStr: string): number {
  if (!sizeStr || sizeStr === 'Pending') return 0;
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^([\d.]+)\s*([A-Za-z]+)$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase() as keyof typeof units;
  return val * (units[unit] || 1);
}

export function parseTime(timeStr: string): number {
  if (!timeStr || timeStr === 'Pending') return 0;
  return parseFloat(timeStr.replace('ms', '').replace('s', '000'));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}