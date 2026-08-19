/**
 * ListResourcesHandler — Lấy danh sách toàn bộ file resources thu thập được (images, videos, fonts, etc.)
 *
 * Usage:
 *   const handler = new ListResourcesHandler();
 *   const result = handler.handle(requests, { type: 'image' });
 *
 * Filter hỗ trợ: type (image, video, audio, font, document, wasm)
 * Kết quả trả về dạng text table với stable index.
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { ResourceItem, ResourceType } from '../types/resource.types';

// UTIL
import { detectResourceType } from '../constants/resource';
import { detectWasm } from '../utils/wasm-detector.util';

export interface ListResourcesFilter {
  type?: ResourceType;
}

export interface ListResourcesResult {
  total: number;
  filtered: number;
  text: string;
}

export class ListResourcesHandler {
  /**
   * Lấy danh sách resources theo filter.
   * @param requests - Danh sách requests đã capture
   * @param filter   - Điều kiện lọc (type)
   */
  public handle(requests: NetworkRequest[], filter: ListResourcesFilter = {}): ListResourcesResult {
    // Build resource items (similar logic to ResourcesPanel)
    const items: ResourceItem[] = [];
    const seen = new Set<string>();

    // Detect WASM modules
    const wasmItems = detectWasm(requests);
    wasmItems.forEach((wasm) => {
      const request = requests.find((r) => r.id === wasm.id);
      if (request) {
        const key = request.url;
        if (!seen.has(key)) {
          seen.add(key);
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
            responseBody:
              typeof request.responseBody === 'string' ? request.responseBody : undefined,
            isWasm: true,
            wasmItem: wasm,
          });
        }
      }
    });

    // Add other resources from requests
    requests.forEach((req) => {
      const type = detectResourceType(
        req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '',
        req.path,
      );

      if (type === 'other' || type === 'wasm') return;

      const key = req.url;
      if (seen.has(key)) return;
      seen.add(key);

      items.push({
        id: req.id,
        filename: req.path.split('/').pop()?.split('?')[0] || 'unknown',
        url: req.url,
        path: req.path,
        type,
        contentType:
          req.responseHeaders?.['content-type'] ||
          req.responseHeaders?.['Content-Type'] ||
          'unknown',
        size: String(req.size || 'Unknown'),
        timestamp: req.timestamp || Date.now(),
        source: req.url.split('?')[0].substring(0, req.url.split('?')[0].lastIndexOf('/') + 1),
        responseBody: typeof req.responseBody === 'string' ? req.responseBody : undefined,
      });
    });

    // Sort by timestamp (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Assign stable 1-indexed IDs
    const stableIndexMap = new Map<string, number>();
    items.forEach((item, idx) => {
      stableIndexMap.set(item.id, idx + 1);
    });

    // Apply filter
    const filterType = filter.type?.toLowerCase();
    const filtered = filterType
      ? items.filter((item) => item.type.toLowerCase() === filterType)
      : items;

    // Build text table
    const header = `| stt | type     | filename | size | content-type |`;
    const separator = `|-----|----------|----------|------|--------------|`;
    const rows = filtered.map((item) => {
      const stableIndex = stableIndexMap.get(item.id) || 0;
      const type = item.type.padEnd(8);
      const filename = item.filename.substring(0, 40).padEnd(40);
      const size = String(item.size).padEnd(10);
      const contentType = item.contentType.substring(0, 30);
      return `| ${String(stableIndex).padEnd(3)} | ${type} | ${filename} | ${size} | ${contentType} |`;
    });

    const text = [
      `[list_resources] Total: ${items.length}, Filtered: ${filtered.length}`,
      header,
      separator,
      ...rows,
    ].join('\n');

    return {
      total: items.length,
      filtered: filtered.length,
      text,
    };
  }
}
