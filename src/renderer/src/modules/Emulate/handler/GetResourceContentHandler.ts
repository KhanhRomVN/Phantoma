/**
 * GetResourceContentHandler — Xem nội dung file resource với start_line và end_line.
 *
 * Usage:
 *   const handler = new GetResourceContentHandler();
 *   const result = handler.handle(requests, 5, { startLine: 1, endLine: 100 });
 *
 * Hỗ trợ line range cho text-based resources (fonts, SVG, etc.)
 * Binary resources (images, videos) trả về metadata only.
 */

// TYPE
import { NetworkRequest } from '../types/inspector';
import { ResourceItem } from '../types/resource.types';

// UTIL
import { detectResourceType } from '../constants/resource';
import { detectWasm } from '../utils/wasm-detector.util';

export interface GetResourceContentOptions {
  startLine?: number; // 1-indexed, inclusive
  endLine?: number; // 1-indexed, inclusive
}

export interface GetResourceContentResult {
  text: string;
  found: boolean;
}

export class GetResourceContentHandler {
  /**
   * Get resource content by stable index (1-indexed) with optional line range.
   * @param requests     - All requests array
   * @param stableIndex  - 1-indexed position from list_resources output
   * @param options      - Optional line range { startLine, endLine }
   */
  public handle(
    requests: NetworkRequest[],
    stableIndex: number,
    options: GetResourceContentOptions = {},
  ): GetResourceContentResult {
    // Build resource items (same logic as ListResourcesHandler)
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

    // Add other resources
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

    // Sort by timestamp (newest first) to match list_resources order
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Convert 1-indexed stable index to 0-indexed array position
    const arrayIndex = stableIndex - 1;

    if (arrayIndex < 0 || arrayIndex >= items.length) {
      return {
        text: `[get_resource_content] Error: index ${stableIndex} out of range (1-${items.length})`,
        found: false,
      };
    }

    const item = items[arrayIndex];

    // Check if resource has text content
    const isTextResource =
      item.type === 'font' ||
      item.type === 'document' ||
      item.contentType.includes('svg') ||
      item.contentType.includes('text') ||
      item.contentType.includes('xml') ||
      item.contentType.includes('json');

    if (!isTextResource) {
      // Binary resource - return metadata only
      return {
        text: [
          `[get_resource_content] Resource #${stableIndex}`,
          `Type: ${item.type}`,
          `Filename: ${item.filename}`,
          `Content-Type: ${item.contentType}`,
          `Size: ${item.size}`,
          `URL: ${item.url}`,
          ``,
          `Note: This is a binary resource (${item.type}). Content viewing is not supported.`,
          `Use the UI to preview this resource.`,
        ].join('\n'),
        found: true,
      };
    }

    // Get text content
    const request = requests.find((r) => r.id === item.id);
    let content = item.responseBody || request?.responseBody;

    if (!content) {
      return {
        text: [
          `[get_resource_content] Resource #${stableIndex}`,
          `Type: ${item.type}`,
          `Filename: ${item.filename}`,
          `Content-Type: ${item.contentType}`,
          `Size: ${item.size}`,
          `URL: ${item.url}`,
          ``,
          `Content not available (no response body captured).`,
        ].join('\n'),
        found: true,
      };
    }

    if (typeof content !== 'string') {
      content = JSON.stringify(content);
    }

    // Apply line range if specified
    const lines = content.split('\n');
    const totalLines = lines.length;

    let displayContent: string;
    let rangeInfo = '';

    if (options.startLine !== undefined || options.endLine !== undefined) {
      // 1-indexed → 0-indexed
      const start = options.startLine ? Math.max(1, options.startLine) - 1 : 0;
      const end = options.endLine ? Math.min(totalLines, options.endLine) : totalLines;

      displayContent = lines.slice(start, end).join('\n');
      rangeInfo = `Lines: ${start + 1}-${end} of ${totalLines}`;
    } else {
      // No range specified - limit to first 1000 lines
      const maxLines = 1000;
      if (totalLines > maxLines) {
        displayContent = lines.slice(0, maxLines).join('\n');
        rangeInfo = `Lines: 1-${maxLines} of ${totalLines} (truncated)`;
      } else {
        displayContent = content;
        rangeInfo = `Lines: 1-${totalLines}`;
      }
    }

    const text = [
      `[get_resource_content] Resource #${stableIndex}`,
      `Type: ${item.type}`,
      `Filename: ${item.filename}`,
      `Content-Type: ${item.contentType}`,
      `Size: ${item.size}`,
      `URL: ${item.url}`,
      rangeInfo,
      ``,
      displayContent,
    ].join('\n');

    return {
      text,
      found: true,
    };
  }
}
