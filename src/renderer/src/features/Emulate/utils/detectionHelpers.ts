import { NetworkRequest } from '../../types/inspector';

export interface WasmItem {
  id: string;
  filename: string;
  url: string;
  detectionMethod: 'Content-Type' | 'File Extension' | 'JS Heuristic';
}

export function detectWasmModules(requests: NetworkRequest[]): WasmItem[] {
  const items: WasmItem[] = [];

  requests.forEach((req) => {
    let detectionMethod: WasmItem['detectionMethod'] | null = null;

    // Check Content-Type header
    const contentType = req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '';
    if (contentType.toLowerCase().includes('application/wasm')) {
      detectionMethod = 'Content-Type';
    }

    // Check file extension
    if (!detectionMethod && req.path && /\.wasm(\?|#|$)/i.test(req.path)) {
      detectionMethod = 'File Extension';
    }

    // JS heuristic (detected via JS code that loads wasm)
    if (!detectionMethod && req.type === 'JS' && req.responseBody?.includes('WebAssembly')) {
      detectionMethod = 'JS Heuristic';
    }

    if (detectionMethod) {
      items.push({
        id: req.id,
        filename: req.path.split('/').pop()?.split('?')[0] || 'unknown.wasm',
        url: req.url,
        detectionMethod,
      });
    }
  });

  return items;
}

export function getMediaType(contentType: string): 'image' | 'video' | 'audio' | null {
  const ct = contentType.toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  return null;
}

export function isSourceFile(path: string): boolean {
  return !!path?.match(/\.(js|ts|jsx|tsx|css|html|json|xml)$/i);
}

export function getSourceFileType(path: string): 'js' | 'ts' | 'html' | 'css' | 'json' | 'xml' {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts': case 'tsx': return 'ts';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'json': return 'json';
    case 'xml': return 'xml';
    default: return 'js';
  }
}