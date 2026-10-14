/**
 * ------------------------------------------------------------------
 * WSS Hub Service
 * ------------------------------------------------------------------
 * Manages WebSocket connections for streaming runtime events (CDP, Proxy, etc.)
 * to connected Electron Renderers.
 * 
 * Replaces the previous SSE-based approach for better performance and binary support.
 * ------------------------------------------------------------------
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { cdpService } from './cdp.service';
import { processManager } from './process-manager.service';
import { logger } from '../utils/logger';

export interface WssMessage {
  type: string; // Event channel name e.g., 'cdp:request'
  data: any;    // Payload
}

class WssHubService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  /**
   * Initialize the WebSocket server attached to an existing HTTP server.
   */
  public init(httpServer: http.Server): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ server: httpServer, path: '/ws/events' });
    logger.info('[WssHub] WebSocket server initialized on /ws/events');

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    // Subscribe to global CDP events emitted by cdpService
    this.subscribeToCdpEvents();
  }

  private handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
    const clientId = Math.random().toString(36).substring(7);
    logger.info(`[WssHub] New client connected: ${clientId}`);
    
    this.clients.add(ws);

    // Send initial handshake/welcome message
    this.sendToClient(ws, {
      type: 'connected',
      data: { clientId, timestamp: Date.now(), status: 'ready' }
    });

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        this.handleClientCommand(clientId, parsed);
      } catch (err) {
        logger.warn(`[WssHub] Invalid message from ${clientId}:`, err);
      }
    });

    const handleDisconnect = () => {
      if (!this.clients.has(ws)) return; // Prevent double execution
      
      logger.info(`[WssHub] Client disconnected: ${clientId}. Remaining clients: ${this.clients.size - 1}`);
      this.clients.delete(ws);

      // CRITICAL CLEANUP LOGIC:
      // If no WebSocket clients are left connected, it implies the Renderer 
      // has crashed, refreshed, or closed. We must terminate all orphaned 
      // browser processes to prevent resource leaks and zombie windows.
      if (this.clients.size === 0 && processManager.hasActiveProcesses()) {
        logger.warn('[WssHub] All clients disconnected. Auto-terminating active browser processes...');
        processManager.terminateAll().catch(err => {
          logger.error('[WssHub] Failed during auto-cleanup:', err);
        });
      }
    };

    ws.on('close', handleDisconnect);
    ws.on('error', (err) => {
      logger.error(`[WssHub] Socket error for ${clientId}:`, err);
      handleDisconnect();
    });
  }

  /**
   * Handle commands sent FROM the renderer TO the server via WebSocket.
   */
  private handleClientCommand(clientId: string, command: any): void {
    switch (command.action) {
      case 'PING':
        this.broadcast({ type: 'pong', data: { timestamp: Date.now() } }, clientId);
        break;
      
      case 'SUBSCRIBE_TARGET':
        logger.info(`[WssHub] Client ${clientId} subscribed to target: ${command.targetId}`);
        break;

      default:
        logger.debug(`[WssHub] Unknown action from ${clientId}: ${command.action}`);
    }
  }

  /**
   * Attach listeners to cdpService EventEmitter to forward events to all WS clients.
   */
  private subscribeToCdpEvents(): void {
    // Forward Network Requests
    cdpService.on('cdp:request', (data) => {
      this.broadcast({ type: 'cdp:request', data });
    });

    // Forward Network Responses
    cdpService.on('cdp:response', (data) => {
      this.broadcast({ type: 'cdp:response', data });
    });

    // Forward Loading Finished
    cdpService.on('cdp:finished', (data) => {
      this.broadcast({ type: 'cdp:finished', data });
    });
  }

  /**
   * Broadcast a message to all connected clients.
   */
  public broadcast(message: WssMessage, excludeClientId?: string): void {
    if (!this.wss || this.clients.size === 0) {
      // logger.warn(`[WssHub] No active clients to broadcast ${message.type}`);
      return;
    }

    const payload = JSON.stringify(message);
    
    let sentCount = 0;
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
          sentCount++;
        } catch (err) {
          logger.error(`[WssHub] Failed to send to client:`, err);
        }
      }
    }
    
    // Debug log only for high-value events to avoid spamming console too much
    if (sentCount > 0 && (message.type === 'cdp:request' || message.type === 'cdp:response')) {
       // Uncomment below if you want to see every single packet in backend logs
       // logger.info(`[WssHub] Broadcasted ${message.type} to ${sentCount} client(s)`);
    }
  }

  /**
   * Send message to a specific socket instance.
   */
  private sendToClient(ws: WebSocket, message: WssMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public shutdown(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      logger.info('[WssHub] WebSocket server shut down.');
    }
  }
}

export const wssHub = new WssHubService();