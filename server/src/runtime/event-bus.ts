/**
 * ------------------------------------------------------------------
 * Runtime EventBus
 * ------------------------------------------------------------------
 * Thay thế cho `webContents.send(channel, data)` của Electron main.
 * Các module runtime (ProxyServer, capture/*, cdp-manager, app-launcher)
 * emit event vào bus; SSE hub subscribe và đẩy xuống renderer.
 *
 * Giữ NGUYÊN shape payload như IPC cũ để parser phía renderer không
 * phải sửa (cdp:request, proxy:response-body, ws:message, ...).
 * ------------------------------------------------------------------
 */

import { EventEmitter } from 'events';

export interface RuntimeEvent {
  channel: string;
  data: unknown;
  timestamp: number;
}

class RuntimeEventBus extends EventEmitter {
  /** Phát một event tới tất cả subscriber (SSE clients). */
  emitEvent(channel: string, data: unknown): void {
    const evt: RuntimeEvent = { channel, data, timestamp: Date.now() };
    this.emit('event', evt);
  }

  /** Đăng ký nhận mọi event runtime. Trả về hàm hủy đăng ký. */
  subscribe(listener: (evt: RuntimeEvent) => void): () => void {
    this.on('event', listener);
    return () => this.off('event', listener);
  }
}

/** Singleton EventBus dùng chung cho toàn express-server. */
export const runtimeBus = new RuntimeEventBus();