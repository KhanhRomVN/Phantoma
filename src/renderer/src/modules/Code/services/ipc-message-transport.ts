/**
 * ------------------------------------------------------------------
 * IPC Message Transport
 * ------------------------------------------------------------------
 * Implements communication between Monaco Editor (renderer) and LSP
 * server (main process) via Electron IPC. Provides two main classes:
 * - IPCMessageReader: Receives messages from main process, emits via event
 * - IPCMessageWriter: Sends messages to main process via IPC invoke
 *
 * Main functions (IPCMessageReader):
 * - listen()    : Register a callback to receive messages, returns Disposable
 * - dispose()   : Dispose the reader, remove IPC listener
 *
 * Main functions (IPCMessageWriter):
 * - write()     : Send an LSP message to the main process
 * - end()       : Fire onClose event, signal end of writing
 * - dispose()   : Dispose the writer, clean up emitter
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Types ──
import type { Message } from 'vscode-languageserver-protocol';

// ─── Internal Interfaces ────────────────────────────────────────────────
interface DataCallback {
  (data: Message): void;
}

interface Disposable {
  dispose(): void;
}

interface Event<T> {
  (listener: (e: T) => void): Disposable;
}

// ─── Emitter ────────────────────────────────────────────────────────────
class Emitter<T> {
  private listeners: Set<(e: T) => void> = new Set();

  get event(): Event<T> {
    return (listener) => {
      this.listeners.add(listener);
      return {
        dispose: () => {
          this.listeners.delete(listener);
        },
      };
    };
  }

  fire(event: T): void {
    this.listeners.forEach((listener) => {
      listener(event);
    });
  }

  dispose(): void {
    this.listeners.clear();
  }
}

// ─── Message Transport Interfaces ───────────────────────────────────────
interface MessageReader {
  readonly onError: Event<Error>;
  readonly onClose: Event<void>;
  listen(callback: DataCallback): Disposable;
  dispose(): void;
}

interface MessageWriter {
  readonly onError: Event<[Error, Message | undefined, number | undefined]>;
  readonly onClose: Event<void>;
  write(msg: Message): Promise<void>;
  end(): void;
  dispose(): void;
}

// ─── IPC Message Reader ─────────────────────────────────────────────────

export class IPCMessageReader implements MessageReader {
  private onMessageEmitter = new Emitter<Message>();
  private onErrorEmitter = new Emitter<Error>();
  private onCloseEmitter = new Emitter<void>();
  private languageId: string;
  private disposed = false;

  constructor(languageId: string) {
    this.languageId = languageId;
    this.setupIPCListener();
  }

  get onError(): Event<Error> {
    return this.onErrorEmitter.event;
  }

  get onClose(): Event<void> {
    return this.onCloseEmitter.event;
  }

  listen(callback: DataCallback): Disposable {
    // Subscribe to messages
    const subscription = this.onMessageEmitter.event(callback);

    return {
      dispose: () => {
        subscription.dispose();
      },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.onMessageEmitter.dispose();
    this.onErrorEmitter.dispose();
    this.onCloseEmitter.dispose();

    // Remove IPC listener
    window.api.off(`lsp:message:${this.languageId}`);
  }

  /**
   * Setup IPC listener for messages from Main Process
   */
  private setupIPCListener(): void {
    const eventName = `lsp:message:${this.languageId}`;

    window.api.on(eventName, (_event: any, message: Message) => {
      if (this.disposed) return;

      try {
        this.onMessageEmitter.fire(message);
      } catch (error) {
        this.onErrorEmitter.fire(error as Error);
      }
    });
  }
}

// ─── IPC Message Writer ─────────────────────────────────────────────────

export class IPCMessageWriter implements MessageWriter {
  private onErrorEmitter = new Emitter<[Error, Message | undefined, number | undefined]>();
  private onCloseEmitter = new Emitter<void>();
  private languageId: string;
  private disposed = false;

  constructor(languageId: string) {
    this.languageId = languageId;
  }

  get onError(): Event<[Error, Message | undefined, number | undefined]> {
    return this.onErrorEmitter.event;
  }

  get onClose(): Event<void> {
    return this.onCloseEmitter.event;
  }

  async write(msg: Message): Promise<void> {
    if (this.disposed) {
      throw new Error('Writer is disposed');
    }

    try {
      // Send message to Main Process via IPC
      await window.api.invoke('lsp:send-message', {
        languageId: this.languageId,
        message: msg,
      });
    } catch (error) {
      this.onErrorEmitter.fire([error as Error, msg, 0]);
      throw error;
    }
  }

  end(): void {
    if (this.disposed) return;
    this.onCloseEmitter.fire();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.onErrorEmitter.dispose();
    this.onCloseEmitter.dispose();
  }
}