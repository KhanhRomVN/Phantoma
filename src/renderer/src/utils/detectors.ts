import { NetworkRequest } from '../types/inspector';

export interface WasmItem {
  id: string;
  filename: string;
  url: string;
  detectionMethod: 'URL Extension' | 'MIME Type' | 'JS Heuristic';
}

/**
 * Detects WebAssembly modules from network requests
 * @param requests - Array of NetworkRequest objects
 * @returns Array of detected WasmItem objects
 */
export function detectWasmModules(requests: NetworkRequest[]): WasmItem[] {
  const wasmItems: WasmItem[] = [];
  const seenUrls = new Set<string>();

  for (const request of requests) {
    const url = request.url;
    if (seenUrls.has(url)) continue;

    let detectionMethod: WasmItem['detectionMethod'] | null = null;
    let filename = '';

    // Method 1: Check URL extension
    if (url.toLowerCase().includes('.wasm')) {
      detectionMethod = 'URL Extension';
      const urlParts = url.split('/');
      filename = urlParts[urlParts.length - 1].split('?')[0];
      if (!filename.endsWith('.wasm')) filename += '.wasm';
    }
    // Method 2: Check content-type header
    else if (request.responseHeaders) {
      const contentType = request.responseHeaders['content-type'] || request.contentType || '';
      if (contentType.toLowerCase().includes('application/wasm')) {
        detectionMethod = 'MIME Type';
        const urlParts = url.split('/');
        let rawFilename = urlParts[urlParts.length - 1].split('?')[0];
        if (!rawFilename) rawFilename = 'module.wasm';
        filename = rawFilename.endsWith('.wasm') ? rawFilename : rawFilename + '.wasm';
      }
    }

    // Method 3: JS Heuristic - check response body for WebAssembly hints
    if (!detectionMethod && request.responseBody) {
      const body = request.responseBody.toLowerCase();
      if (body.includes('webassembly') || body.includes('wasm') || body.includes('instantiatestreaming')) {
        detectionMethod = 'JS Heuristic';
        filename = 'wasm-module.wasm';
      }
    }

    if (detectionMethod) {
      seenUrls.add(url);
      wasmItems.push({
        id: request.id || `wasm-${Date.now()}-${wasmItems.length}`,
        filename,
        url,
        detectionMethod,
      });
    }
  }

  return wasmItems;
}