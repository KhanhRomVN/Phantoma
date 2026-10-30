/**
 * ------------------------------------------------------------------
 * CDP Service
 * ------------------------------------------------------------------
 * Manages connections to Chrome instances via Remote Debugging Port.
 * Listens for Network events and emits them internally or to clients.
 * Requires 'chrome-remote-interface' package.
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';

let CDP: any;
try {
  // Dynamic require to avoid build error if package missing during typecheck
  CDP = require('chrome-remote-interface');
} catch (e) {
  console.warn(
    '[CdpService] Package chrome-remote-interface not found. Install it with: npm install chrome-remote-interface',
  );
}

export interface CdpEvent {
  method: string;
  params: any;
}

class CdpService extends EventEmitter {
  private clients: Map<string, any> = new Map(); // targetId -> CDP Client

  // Store active SSE connections per targetId to broadcast events
  // Key: targetId, Value: Set of Express Response objects
  private sseConnections: Map<string, Set<any>> = new Map();

  constructor() {
    super();
  }

  /**
   * Register an SSE connection for a specific target.
   */
  public addSseConnection(targetId: string, res: any) {
    if (!this.sseConnections.has(targetId)) {
      this.sseConnections.set(targetId, new Set());
    }
    this.sseConnections.get(targetId)!.add(res);
  }

  /**
   * Unregister an SSE connection.
   */
  public removeSseConnection(targetId: string, res: any) {
    const set = this.sseConnections.get(targetId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        this.sseConnections.delete(targetId);
      }
    }
  }

  /**
   * Broadcast a CDP event to all SSE listeners of a specific target.
   */
  private broadcastToTarget(targetId: string, eventType: string, data: any) {
    const set = this.sseConnections.get(targetId);
    if (!set || set.size === 0) return;

    const payload = JSON.stringify({ type: eventType, ...data });

    // Send to all active connections for this target
    for (const res of set) {
      try {
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${payload}\n\n`);
      } catch (err) {
        // If write fails, the connection might be closed. Clean up later via 'close' handler in route.
        console.warn(`[CdpService] Failed to send SSE to target ${targetId}:`, err);
      }
    }
  }

  /**
   * Connect to a Chrome instance running on specific port.
   * @param port The remote debugging port (e.g., 9222)
   * @param targetId Unique identifier for tracking this session
   * @param expectedUrl Optional hint to find the correct tab by URL
   */
  async connect(port: number, targetId: string, expectedUrl?: string): Promise<boolean> {
    if (!CDP) {
      throw new Error('CDP Library missing');
    }

    try {
      // Retry mechanism because Chrome might still be initializing the new tab
      let pageTarget: any = null;
      let retries = 5;

      // Helper: Check if a target is likely an internal Electron/Vite window
      const isInternalTarget = (t: any): boolean => {
        const url = (t.url || '').toLowerCase();
        const title = (t.title || '').toLowerCase();

        // Blacklist patterns from Phantoma_temp/src/main/features/cdp/cdp-manager.ts
        if (url.includes('localhost:5173')) return true;
        if (url.includes('http://localhost:') && !url.includes('deepseek')) return true; // Generic localhost dev servers

        // Title-based exclusion (very effective for Electron apps)
        if (title.includes('phantoma')) return true;
        if (title.includes('electron')) return true;

        // Standard browser internals
        if (url.startsWith('chrome://')) return true;
        if (url.startsWith('devtools://')) return true;
        if (url.startsWith('edge://')) return true;
        if (url === 'about:blank') return true;

        return false;
      };

      while (retries > 0 && !pageTarget) {
        const targets = await CDP.List({ port });

        // Filter only 'page' type targets
        let pages = targets.filter((t: any) => t.type === 'page');

        if (pages.length === 0) {
          console.warn('[CdpService] No page targets found yet. Retrying...');
          await new Promise((r) => setTimeout(r, 1000));
          retries--;
          continue;
        }

        // LOG ALL PAGES FOR DEBUGGING
        pages.forEach((p: any) => {
          const internal = isInternalTarget(p);
        });

        // STEP 1: Remove known internal targets (Electron/Vite/DevTools)
        const externalPages = pages.filter((p: any) => !isInternalTarget(p));

        if (externalPages.length === 0) {
          console.warn(
            '[CdpService] All detected pages are internal. Waiting for external target...',
          );
          await new Promise((r) => setTimeout(r, 1000));
          retries--;
          continue;
        }

        // STEP 2: Try to match expectedUrl strictly among EXTERNAL pages
        if (expectedUrl) {
          let expectedHostname = '';
          try {
            expectedHostname = new URL(expectedUrl).hostname.toLowerCase();
          } catch {}

          // Priority 1: Exact Hostname Match
          pageTarget = externalPages.find((t: any) => {
            try {
              const targetHost = new URL(t.url).hostname.toLowerCase();
              return targetHost === expectedHostname;
            } catch {
              return false;
            }
          });

          if (pageTarget) {
            break;
          }

          // Priority 2: Substring Match (for redirects or partial loads)
          pageTarget = externalPages.find((t: any) =>
            t.url.includes(expectedUrl.replace(/\/$/, '')),
          );

          if (pageTarget) {
            break;
          }
        }

        // STEP 3: Fallback - Pick the FIRST EXTERNAL PAGE available
        // This handles cases where URL hasn't fully resolved but the tab is definitely not Electron
        if (!pageTarget && externalPages.length > 0) {
          pageTarget = externalPages[0];
          break;
        }

        // If still nothing, wait and retry
        if (!pageTarget) {
          retries--;
          if (retries > 0) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }

      if (!pageTarget) {
        console.error('[CdpService] Failed to find suitable page target after retries.');
        return false;
      }

      // Create connection to that specific target
      const client = await CDP({ port, target: pageTarget });

      // Enable necessary domains
      await Promise.all([client.Network.enable(), client.Page.enable(), client.Runtime.enable()]);

      // Attach listeners for Network Traffic
      // We emit standardized events that include targetId so the global /events endpoint can route them correctly.

      client.Network.on('requestWillBeSent', (params: any) => {
        const url = params.request.url;
        if (url.startsWith('data:') || url.startsWith('blob:')) return;

        // Format data to match what frontend expects in 'cdp:request' channel
        const cdpRequestData = {
          targetId,
          id: params.requestId,
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          resourceType: params.type,
          timestamp: params.timestamp * 1000, // Convert seconds to ms
          postData: params.request.postData,
          requestBody: params.request.postData,
        };

        // Emit globally for the /events bridge to pick up
        this.emit('cdp:request', cdpRequestData);
      });

      client.Network.on('responseReceived', (params: any) => {
        const resp = params.response;
        const cdpResponseData = {
          targetId,
          id: params.requestId,
          status: resp.status,
          statusCode: resp.status,
          statusText: resp.statusText,
          headers: resp.headers,
          mimeType: resp.mimeType,
          url: resp.url,
          remoteIPAddress: resp.remoteIPAddress,
          fromDiskCache: resp.fromDiskCache,
          encodedDataLength: resp.encodedDataLength,
        };

        this.emit('cdp:response', cdpResponseData);
      });

      client.Network.on('loadingFinished', async (params: any) => {
        this.emit('cdp:finished', { targetId, requestId: params.requestId });

        try {
          const result = await client.Network.getResponseBody({ requestId: params.requestId });
          const body: string = result.body || '';
          this.emit('cdp:response-body', {
            targetId,
            id: params.requestId,
            body,
            size: params.encodedDataLength ?? body.length,
            timestamp: Date.now(),
          });
        } catch (err) {
          // Một số response (redirect, 204, cache) không có body — bỏ qua
        }
      });

      // Handle errors within the session
      client.on('event', (message: any) => {
        // Catch-all for other events if needed
      });

      // Store client reference
      this.clients.set(targetId, client);
      return true;
    } catch (err) {
      console.error('[CdpService] Connection failed:', err);
      return false;
    }
  }

  async disconnect(targetId: string) {
    const client = this.clients.get(targetId);
    if (client) {
      await client.close();
      this.clients.delete(targetId);
    }
  }

  /**
   * Reload the page attached to a given target session.
   */
  async reload(targetId: string): Promise<boolean> {
    const client = this.clients.get(targetId);
    if (!client) {
      throw new Error(`No active CDP session for target: ${targetId}`);
    }
    await client.Page.reload({});
    return true;
  }

  /**
   * Navigate the attached page to a new URL.
   */
  async navigate(targetId: string, url: string): Promise<boolean> {
    if (!url) throw new Error('navigate() requires a non-empty url');
    const client = this.clients.get(targetId);
    if (!client) {
      throw new Error(`No active CDP session for target: ${targetId}`);
    }
    await client.Page.navigate({ url });
    return true;
  }

  /**
   * Inject a colored border overlay onto the page (visual cue that Phantoma
   * is controlling this tab). Implemented via Runtime.evaluate so it works
   * regardless of whether DOM domain was explicitly enabled.
   */
  async injectBorder(targetId: string, color = '#ff3b30'): Promise<boolean> {
    const client = this.clients.get(targetId);
    if (!client) {
      throw new Error(`No active CDP session for target: ${targetId}`);
    }
    const script = `(() => {
      const id = '__phantoma_border__';
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;border:3px solid ${color};box-sizing:border-box;';
        (document.body || document.documentElement).appendChild(el);
      } else {
        el.style.borderColor = '${color}';
      }
    })()`;
    await client.Runtime.evaluate({ expression: script });
    return true;
  }

  /**
   * Return current connection state for a target (or all targets when omitted).
   */
  getState(targetId?: string): { connected: boolean; targets: string[] } {
    const targets = Array.from(this.clients.keys());
    if (targetId) {
      return { connected: this.clients.has(targetId), targets };
    }
    return { connected: targets.length > 0, targets };
  }
}

export const cdpService = new CdpService();
