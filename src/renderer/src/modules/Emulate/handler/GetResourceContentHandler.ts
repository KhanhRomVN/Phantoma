/**
 * ------------------------------------------------------------------
 * GetResourceContentHandler
 * ------------------------------------------------------------------
 * Xem nội dung file resource với line range (start_line, end_line).
 * Hỗ trợ text-based resources, binary resources trả về metadata.
 *
 * Các methods chính:
 * - handle() : Lấy nội dung resource theo filename và line range
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import { NetworkRequest } from '../types/inspector';
import { ResourceItem } from '../types/resource.types';

// ── Constants ──
import { detectResourceType } from '../constants/resource';

// ── Utils ──
import { detectWasm } from '../utils/wasm-detector.util';

// ─── Types ──────────────────────────────────────────────────────────────
export interface GetResourceContentOptions {
  startLine?: number; // 1-indexed, inclusive
  endLine?: number; // 1-indexed, inclusive
}

export interface GetResourceContentResult {
  text: string;
  found: boolean;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class GetResourceContentHandler {
  /**
   * Get resource content by filename with optional line range.
   * @param requests  - All requests array
   * @param filename  - Filename from list_resources output
   * @param options   - Optional line range { startLine, endLine }
   */
  public handle(
    requests: NetworkRequest[],
    filename: string,
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

    // Find item by filename
    const item = items.find((it) => it.filename === filename);

    if (!item) {
      return {
        text: `[get_resource_content] Error: resource file "${filename}" not found. Available files: ${items.map((it) => it.filename).join(', ')}`,
        found: false,
      };
    }

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
          `[get_resource_content] Resource: ${filename}`,
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
          `[get_resource_content] Resource: ${filename}`,
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
      `[get_resource_content] Resource: ${filename}`,
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
