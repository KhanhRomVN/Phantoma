/**
 * ------------------------------------------------------------------
 * ElectronWidgetBridge
 * ------------------------------------------------------------------
 * Cầu nối IPC giữa renderer (Electron widget) và Electron main process
 * qua window.api (preload). Chỉ làm transport + storage, KHÔNG phụ thuộc
 * implementation của feature/module nào.
 *
 * Main features:
 * - postMessage()          : Gửi message qua window.api.invoke
 * - onMessage()            : Lắng nghe message từ main process
 * - registerLocalCommand() : Module (vd. Code) đăng ký handler cho command
 *                            chỉ xử lý ở renderer (không có IPC handler)
 * - MessageDispatcher      : Class quản lý handler + timeout theo requestId
 * ------------------------------------------------------------------
 */

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
      api.on('messageResponse', (_event: any, msg: any) => {
        if (!msg?.requestId) return;
        const handler = this.handlers.get(msg.requestId);
        if (handler) {
          this.cleanup(msg.requestId);
          handler(msg);
        }
      });
    } else {
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

  public resolve(requestId: string, msg: any) {
    const handler = this.handlers.get(requestId);
    if (handler) {
      this.cleanup(requestId);
      handler(msg);
    }
  }
}

export const messageDispatcher = new MessageDispatcher();

function getApi() {
  try {
    const api = (window as any).api;
    if (api && typeof api.invoke === 'function') {
      return api;
    }
  } catch {
    console.warn('[ElectronWidgetBridge] window.api not available');
  }
  return null;
}

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

function ipcOn(channel: string, listener: (...args: any[]) => void): () => void {
  const api = getApi();
  if (!api) {
    console.warn(`[ElectronWidgetBridge] IPC not available, cannot listen on channel: ${channel}`);
    return () => {};
  }
  api.on(channel, listener);
  return () => {
    try {
      api.off(channel, listener);
    } catch {
      console.warn('[ElectronWidgetBridge] Failed to remove listener for channel:', channel);
    }
  };
}

const STORAGE_PREFIX = 'zen_storage:';

function storageGet(key: string): Promise<{ key: string; value: string } | null> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw !== null) {
      return Promise.resolve({ key, value: raw });
    }
  } catch (e) {
    console.warn('[ElectronWidgetBridge] localStorage get failed:', key, e);
  }
  return Promise.resolve(null);
}

function storageSet(key: string, value: string): Promise<{ key: string; value: string }> {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch (e) {
    console.warn('[ElectronWidgetBridge] localStorage set failed:', key, e);
  }
  return Promise.resolve({ key, value });
}

function storageDelete(key: string): Promise<{ key: string; deleted: boolean }> {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return Promise.resolve({ key, deleted: true });
  } catch (e) {
    console.warn('[ElectronWidgetBridge] localStorage delete failed:', key, e);
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
    console.warn('[ElectronWidgetBridge] localStorage list failed:', prefix, e);
    return Promise.resolve({ keys: [] });
  }
}

export type LocalCommandHandler = (message: any) => void;

class ElectronWidgetBridge {
  private static instance: ElectronWidgetBridge;
  private localCommandHandlers = new Map<string, LocalCommandHandler>();

  private constructor() {}

  public static getInstance(): ElectronWidgetBridge {
    if (!ElectronWidgetBridge.instance) {
      ElectronWidgetBridge.instance = new ElectronWidgetBridge();
    }
    return ElectronWidgetBridge.instance;
  }

  public registerLocalCommand(command: string, handler: LocalCommandHandler): () => void {
    this.localCommandHandlers.set(command, handler);
    return () => {
      if (this.localCommandHandlers.get(command) === handler) {
        this.localCommandHandlers.delete(command);
      }
    };
  }

  public postMessage(message: any): void {
    const cmd = message?.command;
    if (
      cmd === 'storageGet' ||
      cmd === 'storageSet' ||
      cmd === 'storageDelete' ||
      cmd === 'storageList'
    ) {
      const { requestId, key, value, prefix } = message;
      const reply = (data: any) => {
        if (requestId) {
          messageDispatcher.resolve(requestId, { command: 'storageResult', requestId, data });
        }
      };
      if (cmd === 'storageGet') {
        storageGet(key || '').then((r) => reply({ key, value: r?.value ?? null }));
      } else if (cmd === 'storageSet') {
        storageSet(key || '', value ?? '').then(() => reply({ key, success: true }));
      } else if (cmd === 'storageDelete') {
        storageDelete(key || '').then((r) => reply({ key, success: r.deleted }));
      } else {
        storageList(prefix).then((r) => reply({ keys: r.keys }));
      }
      return;
    }

    const localHandler = this.localCommandHandlers.get(cmd);
    if (localHandler) {
      localHandler(message);
      return;
    }

    const api = getApi();
    if (!api) {
      return;
    }
    const channel = message?.command || 'generic';
    api.invoke(channel, message).catch((err: any) => {
      if (err?.message && !err.message.includes('No handler')) {
        console.warn(`[ElectronWidgetBridge] postMessage error on "${channel}":`, err.message);
      }
    });
  }

  public onMessage(command: string, listener: (data: any) => void): () => void {
    return ipcOn(command, (_event: any, data: any) => {
      listener(data);
    });
  }

  public getStorage() {
    return {
      get: storageGet,
      set: storageSet,
      delete: storageDelete,
      list: storageList,
    };
  }

  public async getSystemInfo(): Promise<any> {
    try {
      const result = await ipcInvoke('system:get-info', {}, 3000);
      if (result) return result;
    } catch (e) {
      console.warn('[ElectronWidgetBridge] getSystemInfo via IPC failed, using fallback:', e);
    }

    const platform = navigator.platform || 'Unknown';
    return {
      data: {
        os: platform.includes('Win')
          ? 'Windows'
          : platform.includes('Mac')
            ? 'macOS'
            : platform.includes('Linux')
              ? 'Linux'
              : platform,
        ide: 'Phantoma (Electron)',
        shell: platform.includes('Win') ? 'powershell' : '/bin/bash',
        homeDir: '~',
        cwd: '.',
      },
    };
  }
}

export const electronWidgetBridge = ElectronWidgetBridge.getInstance();

export { ElectronWidgetBridge };