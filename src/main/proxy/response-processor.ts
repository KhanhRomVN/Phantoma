import * as zlib from 'zlib';
import { decompress } from '@mongodb-js/zstd';
import { INJECT_SCRIPT } from './injection';
import { mediaCache } from './mediaCache';

export interface ResponseProcessingResult {
  body: string;
  size: string;
  isBinary: boolean;
  contentType: string;
}

export function decompressResponseBody(
  buffer: Buffer,
  contentEncoding: string,
  zstdInstance?: any,
): string {
  try {
    if (contentEncoding === 'gzip') {
      return zlib.gunzipSync(buffer).toString('utf8');
    } else if (contentEncoding === 'br') {
      return zlib.brotliDecompressSync(buffer).toString('utf8');
    } else if (contentEncoding === 'deflate') {
      return zlib.inflateSync(buffer).toString('utf8');
    } else if (contentEncoding === 'zstd' && zstdInstance) {
      try {
        return Buffer.from(zstdInstance.decompress(buffer)).toString('utf8');
      } catch (e) {
        return `[Phantoma Error] Failed to decompress zstd content: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else if (!contentEncoding || contentEncoding === 'identity') {
      // Check for GZIP magic bytes (0x1f 0x8b) even if header is missing
      if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        try {
          return zlib.gunzipSync(buffer).toString('utf8');
        } catch (e) {
          return `[Phantoma Error] Detected GZIP magic bytes but failed to decompress.\nError: ${e instanceof Error ? e.message : String(e)}`;
        }
      } else {
        // Binary detection: Check for NULL bytes in the first 1024 bytes
        const checkLen = Math.min(buffer.length, 1024);
        let isBinary = false;
        for (let i = 0; i < checkLen; i++) {
          if (buffer[i] === 0x00) {
            isBinary = true;
            break;
          }
        }

        if (isBinary) {
          return buffer.toString('base64');
        } else {
          return buffer.toString('utf8');
        }
      }
    } else {
      return `[Phantoma Info] Content encoded with '${contentEncoding}' which is currently not supported for preview.`;
    }
  } catch (err) {
    return `[Phantoma Error] Failed to decode response body.\nEncoding: ${contentEncoding}\nError: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export function processResponseBody(
  buffer: Buffer,
  contentEncoding: string,
  contentType: string,
  requestId: string,
  url: string,
  zstdInstance?: any,
): ResponseProcessingResult {
  const size = buffer.length;
  const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;

  const body = decompressResponseBody(buffer, contentEncoding, zstdInstance);

  // Auto-save media
  const isMedia =
    contentType.startsWith('image/') ||
    contentType.startsWith('video/') ||
    contentType.startsWith('audio/');

  if (isMedia && requestId) {
    const fileName = url.split('/').pop()?.split('?')[0] || 'media_file';
    mediaCache.save(requestId, buffer, contentType, fileName);
  }

  // Check if body is binary (if decompression returned base64)
  const isBinary = body.startsWith('[Phantoma') ? false : buffer.length > 0 && buffer[0] === 0x00;

  return {
    body,
    size: sizeStr,
    isBinary,
    contentType,
  };
}

export function injectHTMLScript(
  buffer: Buffer,
  contentEncoding: string,
  port: number,
  wsPort: number,
  zstdInstance?: any,
): { buffer: Buffer; modified: boolean } {
  try {
    let body = '';
    // Decompress if needed
    if (contentEncoding === 'gzip') {
      body = zlib.gunzipSync(buffer).toString('utf8');
    } else if (contentEncoding === 'br') {
      body = zlib.brotliDecompressSync(buffer).toString('utf8');
    } else if (contentEncoding === 'deflate') {
      body = zlib.inflateSync(buffer).toString('utf8');
    } else if (contentEncoding === 'zstd' && zstdInstance) {
      body = Buffer.from(zstdInstance.decompress(buffer)).toString('utf8');
    } else {
      body = buffer.toString('utf8');
    }

    // Inject Phantoma script
    const script = `<script>${INJECT_SCRIPT.replace('__PROXY_PORT__', String(port)).replace('__WS_PORT__', String(wsPort))}<\/script>`;
    const headIdx = body.indexOf('<head');
    const headEndIdx = headIdx !== -1 ? body.indexOf('>', headIdx) + 1 : -1;
    if (headEndIdx > 0) {
      body = body.slice(0, headEndIdx) + script + body.slice(headEndIdx);
    } else {
      body = script + body;
    }

    return { buffer: Buffer.from(body, 'utf8'), modified: true };
  } catch (e) {
    console.error('[Proxy] Injection failed:', e);
    return { buffer, modified: false };
  }
}