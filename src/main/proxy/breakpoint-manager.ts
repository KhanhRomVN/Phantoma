/**
 * ------------------------------------------------------------------
 * Quản lý breakpoint
 * ------------------------------------------------------------------
 * Quản lý quy tắc breakpoint proxy và các giải pháp breakpoint đang chờ.
 * Phát sự kiện khi request/response khớp tiêu chí breakpoint.
 *
 * Hàm chính:
 * - setBreakpointRules()       : Cập nhật quy tắc breakpoint đang hoạt động
 * - matchesBreakpoint()        : Kiểm tra xem request có khớp quy tắc
 * - waitForBreakpointResolution(): Chờ renderer giải quyết
 * - forwardRequest()           : Tiếp tục một request đang chờ
 * - dropRequest()              : Hủy một request đang chờ
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import { EventEmitter } from 'events';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Interfaces ─────────────────────────────────────────────────────────
export interface BreakpointRule {
  id: string;
  urlPattern: string; // substring or regex string
  methods: string[]; // empty = all
  phase: 'request' | 'response' | 'both';
  enabled: boolean;
}

export interface PendingBreakpoint {
  id: string; // requestId
  phase: 'request' | 'response';
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  statusCode?: number;
}

// ─── Class ──────────────────────────────────────────────────────────────
export class BreakpointManager extends EventEmitter {
  private breakpointRules: BreakpointRule[] = [];
  private pendingBreakpoints: Map<string, (edited: PendingBreakpoint | null) => void> = new Map();
  private pendingRequests: Map<string, { proceed: () => void; drop: () => void }> = new Map();

  constructor() {
    super();
  }

  public setBreakpointRules(rules: BreakpointRule[]) {
    this.breakpointRules = rules;
  }

  public resolveBreakpoint(requestId: string, edited: PendingBreakpoint | null): boolean {
    const resolve = this.pendingBreakpoints.get(requestId);
    if (resolve) {
      this.pendingBreakpoints.delete(requestId);
      resolve(edited);
      return true;
    }
    return false;
  }

  public matchesBreakpoint(
    url: string,
    method: string,
    phase: 'request' | 'response',
  ): BreakpointRule | undefined {
    return this.breakpointRules.find((rule) => {
      if (!rule.enabled) return false;
      if (rule.phase !== 'both' && rule.phase !== phase) return false;
      if (rule.methods.length > 0 && !rule.methods.includes(method.toUpperCase())) return false;
      try {
        return new RegExp(rule.urlPattern, 'i').test(url);
      } catch {
        logger.warn(`[BreakpointManager] Invalid regex pattern "${rule.urlPattern}", falling back to substring match`);
        return url.includes(rule.urlPattern);
      }
    });
  }

  public waitForBreakpointResolution(
    pending: PendingBreakpoint,
    sendToRenderer: (channel: string, data: any) => void,
  ): Promise<PendingBreakpoint | null> {
    return new Promise((resolve) => {
      this.pendingBreakpoints.set(pending.id, resolve);
      sendToRenderer('proxy:breakpoint-hit', pending);
    });
  }

  public addPendingRequest(
    requestId: string,
    proceed: () => void,
    drop: () => void,
  ): void {
    this.pendingRequests.set(requestId, { proceed, drop });
  }

  public forwardRequest(id: string): boolean {
    const entry = this.pendingRequests.get(id);
    if (entry) {
      entry.proceed();
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }

  public dropRequest(id: string): boolean {
    const entry = this.pendingRequests.get(id);
    if (entry) {
      entry.drop();
      this.pendingRequests.delete(id);
      return true;
    }
    return false;
  }

  public clearPendingRequests(): void {
    this.pendingRequests.forEach(({ proceed }) => proceed());
    this.pendingRequests.clear();
  }

  public getPendingBreakpointsCount(): number {
    return this.pendingBreakpoints.size;
  }

  public getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }
}