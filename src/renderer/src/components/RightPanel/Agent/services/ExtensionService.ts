// ─── ExtensionService — Electron IPC Bridge ────────────────────────────
//
// Previously used VS Code's acquireVsCodeApi + postMessage.
// Now refactored for Electron: uses window.api.invoke / window.api.on
// for IPC, and localStorage for storage operations.
// ────────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────
// window.api is exposed by preload (see src/preload/index.d.ts)

// ─── MessageDispatcher ────────────────────────────────────────────────
// Kept for backward compatibility with code that uses the old
// register(requestId, handler, timeout, onTimeout) pattern.
// Internally bridges to window.api.on for IPC responses.

type MessageHandler = (data: any) => void;

class MessageDispatcher {
  private handlers = new Map<string, MessageHandler>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private started = false;

  private start() {
    if (this.started) return;
    this.started = true;

    const api = getApi();
    if (api) {
      // Listen for response messages from main process
      api.on('messageResponse', (msg: any) => {
        if (!msg?.requestId) return;
        const handler = this.handlers.get(msg.requestId);
        if (handler) {
          this.cleanup(msg.requestId);
          handler(msg);
        }
      });
    } else {
      // Fallback: use window postMessage for browser dev mode
      window.addEventListener('message', (event: MessageEvent) => {
        const msg = event.data;
        if (!msg?.requestId) return;
        const handler = this.handlers.get(msg.requestId);
        if (handler) {
          this.cleanup(msg.requestId);
          handler(msg);
        }
      });
    }
  }

  private cleanup(requestId: string) {
    this.handlers.delete(requestId);
    const timer = this.timers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(requestId);
    }
  }

  public register(
    requestId: string,
    handler: MessageHandler,
    timeoutMs: number,
    onTimeout: () => void,
  ) {
    this.start();
    const timer = setTimeout(() => {
      this.cleanup(requestId);
      onTimeout();
    }, timeoutMs);
    this.timers.set(requestId, timer);
    this.handlers.set(requestId, handler);
  }
}

export const messageDispatcher = new MessageDispatcher();

function getApi() {
  try {
    const api = (window as any).api;
    if (api && typeof api.invoke === 'function') {
      return api;
    }
  } catch {}
  return null;
}

/**
 * Invoke an IPC channel. Returns a Promise that resolves with the result,
 * or rejects after timeoutMs (default 5000ms).
 */
function ipcInvoke(channel: string, payload: any = {}, timeoutMs = 5000): Promise<any> {
  const api = getApi();
  if (!api) {
    return Promise.reject(new Error(`IPC not available (no window.api). Channel: ${channel}`));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`IPC timeout: ${channel}`));
    }, timeoutMs);

    api
      .invoke(channel, payload)
      .then((result: any) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err: any) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Subscribe to push messages from main process on a channel.
 * Returns an unsubscribe function.
 */
function ipcOn(channel: string, listener: (...args: any[]) => void): () => void {
  const api = getApi();
  if (!api) {
    console.warn(`[ExtensionService] IPC not available, cannot listen on channel: ${channel}`);
    return () => {};
  }
  api.on(channel, listener);
  return () => {
    try {
      api.off(channel, listener);
    } catch {}
  };
}

// ─── localStorage-based storage ───────────────────────────────────────

const STORAGE_PREFIX = 'zen_storage:';

function storageGet(key: string): Promise<{ key: string; value: string } | null> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw !== null) {
      return Promise.resolve({ key, value: raw });
    }
  } catch (e) {
    console.warn('[ExtensionService] localStorage get failed:', key, e);
  }
  return Promise.resolve(null);
}

function storageSet(key: string, value: string): Promise<{ key: string; value: string }> {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch (e) {
    console.warn('[ExtensionService] localStorage set failed:', key, e);
  }
  return Promise.resolve({ key, value });
}

function storageDelete(key: string): Promise<{ key: string; deleted: boolean }> {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return Promise.resolve({ key, deleted: true });
  } catch (e) {
    console.warn('[ExtensionService] localStorage delete failed:', key, e);
    return Promise.resolve({ key, deleted: false });
  }
}

function storageList(prefix?: string): Promise<{ keys: string[] }> {
  try {
    const fullPrefix = STORAGE_PREFIX + (prefix || '');
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        keys.push(k.slice(STORAGE_PREFIX.length));
      }
    }
    return Promise.resolve({ keys });
  } catch (e) {
    console.warn('[ExtensionService] localStorage list failed:', prefix, e);
    return Promise.resolve({ keys: [] });
  }
}

// ─── ExtensionService singleton ───────────────────────────────────────

class ExtensionService {
  private static instance: ExtensionService;

  private constructor() {}

  public static getInstance(): ExtensionService {
    if (!ExtensionService.instance) {
      ExtensionService.instance = new ExtensionService();
    }
    return ExtensionService.instance;
  }

  // ─── Fire-and-forget message ──────────────────────────────────────
  // Uses ipcInvoke but caller doesn't need to await.
  // Falls back to no-op if IPC is unavailable.
  public postMessage(message: any): void {
    const api = getApi();
    if (!api) {
      if (message?.command) {
        console.debug(
          `[ExtensionService] postMessage skipped (no IPC): ${message.command}`,
        );
      }
      return;
    }
    const channel = message?.command || 'generic';
    api.invoke(channel, message).catch((err: any) => {
      // Only warn for non-trivial errors (not "no handler")
      if (err?.message && !err.message.includes('No handler')) {
        console.warn(`[ExtensionService] postMessage error on "${channel}":`, err.message);
      }
    });
  }

  // ─── Subscribe to push messages from main process ─────────────────
  // Returns an unsubscribe function.
  public onMessage(command: string, listener: (data: any) => void): () => void {
    return ipcOn(command, (_event: any, data: any) => {
      listener(data);
    });
  }

  // ─── localStorage-based storage (replaces VS Code extension storage) ──
  public getStorage() {
    return {
      get: storageGet,
      set: storageSet,
      delete: storageDelete,
      list: storageList,
    };
  }

  // ─── Get system info ──────────────────────────────────────────────
  public async getSystemInfo(): Promise<any> {
    try {
      const result = await ipcInvoke('getSystemInfo', {}, 3000);
      if (result) return result;
    } catch (e) {
      console.warn('[ExtensionService] getSystemInfo via IPC failed, using fallback:', e);
    }

    // Fallback: collect info from renderer
    const platform = navigator.platform || 'Unknown';
    return {
      data: {
        os: platform.includes('Win') ? 'Windows' : platform.includes('Mac') ? 'macOS' : platform.includes('Linux') ? 'Linux' : platform,
        ide: 'Phantoma (Electron)',
        shell: platform.includes('Win') ? 'powershell' : '/bin/bash',
        homeDir: '~',
        cwd: '.',
      },
    };
  }
}

export const extensionService = ExtensionService.getInstance();

// Also export as named for compatibility
export { ExtensionService };