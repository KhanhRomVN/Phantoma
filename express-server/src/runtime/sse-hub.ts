/**
 * ------------------------------------------------------------------
 * SSE Hub
 * ------------------------------------------------------------------
 * Quản lý các kết nối Server-Sent Events từ renderer. Mỗi client
 * đăng ký nhận event runtime từ EventBus; event được ghi dưới dạng
 * `event: <channel>` + `data: <json>`.
 *
 * Đây là kênh 1 chiều server → client (đúng nhu cầu stream traffic).
 * Các lệnh (start/stop/launch) đi qua REST endpoints riêng.
 * ------------------------------------------------------------------
 */

import type { Request, Response } from 'express';
import { runtimeBus, RuntimeEvent } from './event-bus';
import { createLogger } from '../utils/logger';

const logger = createLogger('SSE');

interface SseClient {
  id: number;
  res: Response;
}

class SseHub {
  private clients: Map<number, SseClient> = new Map();
  private nextId = 1;
  private unsub: (() => void) | null = null;

  private ensureSubscribed(): void {
    if (this.unsub) return;
    this.unsub = runtimeBus.subscribe((evt: RuntimeEvent) => this.broadcast(evt));
  }

  private broadcast(evt: RuntimeEvent): void {
    const payload = `event: ${evt.channel}\ndata: ${JSON.stringify(evt.data)}\n\n`;
    for (const client of this.clients.values()) {
      try {
        client.res.write(payload);
      } catch (err) {
        logger.warn('SSE write failed, dropping client', { id: client.id, err: String(err) });
        this.clients.delete(client.id);
      }
    }
  }

  handleConnection(req: Request, res: Response): void {
    this.ensureSubscribed();

    const id = this.nextId++;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        // sẽ bị dọn ở lần broadcast/close tiếp theo
      }
    }, 15_000);

    this.clients.set(id, { id, res });
    logger.info('SSE client connected', { id, total: this.clients.size });

    req.on('close', () => {
      clearInterval(ping);
      this.clients.delete(id);
      logger.info('SSE client disconnected', { id, total: this.clients.size });
    });
  }

  get clientCount(): number {
    return this.clients.size;
  }
}

export const sseHub = new SseHub();