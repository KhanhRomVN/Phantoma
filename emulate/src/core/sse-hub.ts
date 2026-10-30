/**
 * ------------------------------------------------------------------
 * SSE Hub for Interceptor
 * ------------------------------------------------------------------
 * Manages Server-Sent Events connections to broadcast proxy events
 * to clients (Main Server or Frontend).
 * ------------------------------------------------------------------
 */

import { Response } from 'express';
import { logger } from '../utils/logger';

interface SseClient {
  id: string;
  res: Response;
}

class SseHub {
  private clients: Map<string, SseClient> = new Map();
  private counter = 0;

  /**
   * Register a new SSE connection.
   */
  addClient(res: Response): () => void {
    const clientId = `sse-${++this.counter}`;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.clients.set(clientId, { id: clientId, res });

    // Return cleanup function
    return () => {
      this.removeClient(clientId);
    };
  }

  removeClient(id: string) {
    if (this.clients.has(id)) {
      this.clients.delete(id);
    }
  }

  /**
   * Broadcast an event to all connected clients.
   */
  broadcast(channel: string, data: any) {
    if (this.clients.size === 0) return;

    const message = JSON.stringify({ channel, data, timestamp: Date.now() });

    for (const [_, client] of this.clients) {
      try {
        client.res.write(`data: ${message}\n\n`);
      } catch (err) {
        logger.error(`[SSE] Failed to send to ${client.id}`, { err: String(err) });
        this.removeClient(client.id);
      }
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const sseHub = new SseHub();
