/**
 * Dựng danh sách ResourceItem (WASM + images/fonts/...) từ requests
 * đã capture, sắp xếp mới nhất trước. Dùng chung cho list_resources
 * và get_resource_content.
 */

import { detectResourceType } from '../constants/resource.constants';

import { NetworkRequest } from '../types/network.types';
import { ResourceItem } from '../types/resource.types';

import { detectWasm } from './wasm-detector.util';

export function buildResourceItems(requests: NetworkRequest[]): ResourceItem[] {
  const items: ResourceItem[] = [];
  const seen = new Set<string>();

  detectWasm(requests).forEach((wasm) => {
    const request = requests.find((r) => r.id === wasm.id);
    if (!request || seen.has(request.url)) return;
    seen.add(request.url);
    items.push({
      id: wasm.id,
      filename: wasm.filename,
      url: request.url,
      path: request.path,
      type: 'wasm',
      contentType: 'application/wasm',
      size: String(request.size || 'Unknown'),
      timestamp: request.timestamp || Date.now(),
      source: request.url.split('?')[0],
      responseBody: typeof request.responseBody === 'string' ? request.responseBody : undefined,
      isWasm: true,
      wasmItem: wasm,
    });
  });

  requests.forEach((req) => {
    const type = detectResourceType(
      req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '',
      req.path,
    );
    if (type === 'other' || type === 'wasm') return;
    if (seen.has(req.url)) return;
    seen.add(req.url);

    items.push({
      id: req.id,
      filename: req.path.split('/').pop()?.split('?')[0] || 'unknown',
      url: req.url,
      path: req.path,
      type,
      contentType:
        req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || 'unknown',
      size: String(req.size || 'Unknown'),
      timestamp: req.timestamp || Date.now(),
      source: req.url.split('?')[0].substring(0, req.url.split('?')[0].lastIndexOf('/') + 1),
      responseBody: typeof req.responseBody === 'string' ? req.responseBody : undefined,
    });
  });

  return items.sort((a, b) => b.timestamp - a.timestamp);
}