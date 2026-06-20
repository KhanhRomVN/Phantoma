import { protocol, net, BrowserWindow } from 'electron';
import { getCachedHeaders } from './proxy/headerCache';
import { mediaCache } from './proxy/mediaCache';
import * as path from 'path';
import * as fs from 'fs';

export function registerMediaProtocol() {
  // Register 'media' protocol for serving local and remote files (bypassing CORS/CORP)
  protocol.handle('media', async (request) => {
    const requestId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const mainWindow = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

    try {
      // 1. Extract and normalize the URL
      // Remove media:// prefix
      let target = request.url.replace(/^media:\/\/+/i, '');

      // Handle mangled prefix (e.g., https// -> https://)
      target = target.replace(/^(https?)\/+/i, '$1://');

      // Parse as URL to handle query parameters cleanly
      let actualUrl = target;
      let cachedRequestId = '';
      let refererOverride = '';
      let originOverride = '';
      try {
        const parsed = new URL(target);
        refererOverride = parsed.searchParams.get('_referer') || '';
        originOverride = parsed.searchParams.get('_origin') || '';
        cachedRequestId = parsed.searchParams.get('_requestId') || '';

        // Remove Phantoma-specific parameters
        parsed.searchParams.delete('_referer');
        parsed.searchParams.delete('_origin');
        parsed.searchParams.delete('_requestId');
        actualUrl = parsed.toString();
      } catch (e) {
        // Fallback for non-URL targets (like local file paths)
        actualUrl = target.startsWith('http')
          ? target
          : `file://${target.startsWith('/') ? '' : '/'}${target}`;
      }

      // 2. Check Disk Cache first if we have a requestId
      if (cachedRequestId) {
        const cachedMedia = mediaCache.get(cachedRequestId);
        if (cachedMedia) {
          const cleanHeaders = new Headers();
          cleanHeaders.set('content-type', cachedMedia.contentType);
          cleanHeaders.set('access-control-allow-origin', '*');
          cleanHeaders.set('x-phantoma-cached', 'true');
          cleanHeaders.set('x-phantoma-size', cachedMedia.buffer.length.toString());

          return new Response(cachedMedia.buffer, {
            status: 200,
            headers: cleanHeaders,
          });
        }
      }

      // Log request to inspector
      if (mainWindow) {
        mainWindow.webContents.send('proxy:request', {
          id: requestId,
          url: request.url,
          method: request.method,
          headers: request.headers,
          timestamp: Date.now(),
          isIntercepted: false,
        });
      }

      const fetchHeaders = new Headers();
      // Only forward essential headers to avoid conflicts with net.fetch internal logic
      const headersToForward = [
        'user-agent',
        'referer',
        'cookie',
        'authorization',
        'range',
        'accept',
        'accept-language',
      ];
      // 1. Use original headers if we have a requestId
      if (cachedRequestId) {
        const cached = getCachedHeaders(cachedRequestId);
        if (cached) {
          Object.entries(cached).forEach(([key, value]) => {
            // Forward everything except Host and a few sensitive ones that might conflict
            const k = key.toLowerCase();
            if (
              !['host', 'connection', 'content-length', 'upgrade-insecure-requests'].includes(k)
            ) {
              fetchHeaders.set(key, value);
            }
          });
        }
      }

      // 2. Overlay with current request headers from browser
      request.headers.forEach((value, key) => {
        if (headersToForward.includes(key.toLowerCase())) {
          fetchHeaders.set(key, value);
        }
      });

      // Apply overrides if provided (critical for HLS segments in separate windows)
      if (refererOverride) fetchHeaders.set('referer', refererOverride);
      if (originOverride) fetchHeaders.set('origin', originOverride);

      const response = await net.fetch(actualUrl, {
        method: request.method,
        headers: fetchHeaders,
        bypassCustomProtocolHandlers: true,
      });

      // Extract headers for logging
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Log response to inspector
      if (mainWindow) {
        mainWindow.webContents.send('proxy:response', {
          id: requestId,
          url: request.url,
          statusCode: response.status,
          headers: responseHeaders,
          timestamp: Date.now(),
        });
      }

      if (!response.ok && response.status !== 304) {
        console.error(`[Protocol Media] Upstream error ${response.status} for ${actualUrl}`);
      }

      // 3. Create a response with stripped restrictive headers to fix CORS/CORP/COEP/COOP
      const cleanHeaders = new Headers(response.headers);
      const headersToRemove = [
        'cross-origin-resource-policy',
        'content-security-policy',
        'cross-origin-embedder-policy',
        'cross-origin-opener-policy',
      ];
      headersToRemove.forEach((h) => cleanHeaders.delete(h));
      cleanHeaders.set('access-control-allow-origin', '*');

      const buffer = await response.arrayBuffer();
      const bufferObj = Buffer.from(buffer);

      // 4. Save to Disk Cache if it's a media segment and we have a requestId
      if (cachedRequestId && response.ok) {
        // Save ALL media to cache unconditionally
        const fileName = actualUrl.split('/').pop()?.split('?')[0] || 'file.bin';
        mediaCache.save(
          cachedRequestId,
          bufferObj,
          responseHeaders['content-type'] || 'application/octet-stream',
          fileName,
        );
        cleanHeaders.set('x-phantoma-cached', 'saved');
        cleanHeaders.set('x-phantoma-size', bufferObj.length.toString());
      }

      if (mainWindow) {
        const contentType = responseHeaders['content-type'] || '';
        const isBinary = !contentType.includes('text') && !contentType.includes('json');
        const bodyContent = isBinary ? bufferObj.toString('base64') : bufferObj.toString('utf8');

        mainWindow.webContents.send('proxy:response-body', {
          id: requestId,
          body: bodyContent,
          size: `${(buffer.byteLength / 1024).toFixed(1)} KB`,
          isBinary,
          contentType,
        });
      }

      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: cleanHeaders,
      });
    } catch (error: any) {
      console.error(`[Protocol Media] Load Error for ${request.url}:`, error);

      if (mainWindow) {
        mainWindow.webContents.send('proxy:response', {
          id: requestId,
          url: request.url,
          statusCode: 500,
          headers: {},
          timestamp: Date.now(),
        });
      }

      return new Response(`Media Load Error: ${error.message}`, { status: 500 });
    }
  });
}

export function registerMediaScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}