/**
 * ------------------------------------------------------------------
 * Proxy Event Bridge
 * ------------------------------------------------------------------
 * Forward event của mọi MITM proxy session và CDP tới WebSocket hub.
 * Các event network (request/response/body) đi qua NetworkNormalizer
 * để renderer nhận data đã chuẩn hóa (net:request / net:update);
 * các event khác (breakpoint, ws:*...) được forward nguyên bản.
 * ------------------------------------------------------------------
 */

import { proxyManager } from '../services/proxy/proxy-manager.service';
import { cdpService } from '../services/browser/cdp.service';
import { wssHub } from '../services/realtime/wss-hub.service';
import { networkNormalizer } from '../services/realtime/network-normalizer.service';

interface ProxyServerEvent {
  channel: string;
  data: unknown;
  timestamp: number;
}

export function bridgeProxyEventsToHub(): void {
  proxyManager.onSessionCreated((_sessionId, session) => {
    session.server.on('event', (evt: ProxyServerEvent) => {
      if (networkNormalizer.handle(evt.channel, evt.data)) return;
      wssHub.broadcast({ type: evt.channel, data: evt.data });
    });
  });

  for (const channel of ['cdp:request', 'cdp:response', 'cdp:response-body']) {
    cdpService.on(channel, (data) => {
      networkNormalizer.handle(channel, data);
    });
  }
}