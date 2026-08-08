/**
 * VS Code LSP Client Service
 * 
 * Uses monaco-languageclient + @codingame/monaco-vscode-api for full VS Code extension compatibility.
 * Replaces custom LSP implementation with official tooling.
 * 
 * Benefits:
 * - Full LSP client implementation from monaco-languageclient (TypeFox)
 * - VS Code extension host simulation via @codingame/monaco-vscode-api
 * - Can reuse real VS Code extensions (Pylance, rust-analyzer, Tailwind CSS, etc.)
 * - Automatic textDocument/publishDiagnostics → monaco.editor.setModelMarkers()
 */

import 'vscode/localExtensionHost';
import { MonacoLanguageClient } from 'monaco-languageclient';
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from 'vscode-ws-jsonrpc';

// Import Message transports type
type MessageTransports = {
  reader: any;
  writer: any;
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VSCodeLSPClientConfig {
  languageId: string;
  serverName: string;
  rootUri: string;
  wsUrl?: string; // WebSocket URL for language server (optional, defaults to IPC)
}

// ─── VS Code LSP Client Manager ─────────────────────────────────────────────

class VSCodeLSPClientManager {
  private clients: Map<string, MonacoLanguageClient> = new Map();
  private monacoInstance: any = null;

  /**
   * Initialize with Monaco instance
   */
  initialize(monacoInstance: any): void {
    this.monacoInstance = monacoInstance;
    console.log('[VSCodeLSPClient] ✅ Initialized with Monaco');
  }

  /**
   * Create and start a language client for a specific language
   */
  async createLanguageClient(config: VSCodeLSPClientConfig): Promise<MonacoLanguageClient> {
    const { languageId, serverName, rootUri, wsUrl } = config;

    // Check if client already exists
    const existingClient = this.clients.get(languageId);
    if (existingClient) {
      console.log(`[VSCodeLSPClient] ♻️  Reusing existing client for ${languageId}`);
      return existingClient;
    }

    console.log(`[VSCodeLSPClient] 🚀 Creating new client for ${languageId}`, {
      serverName,
      rootUri,
      wsUrl,
    });

    try {
      // Connect via WebSocket or IPC
      const messageTransports = await this.createMessageTransports(languageId, wsUrl);

      // Create Monaco Language Client with proper error handlers
      const client = new MonacoLanguageClient({
        name: serverName,
        clientOptions: {
          documentSelector: [{ language: languageId }],
          errorHandler: {
            error: () => ({ action: 1 }), // ErrorAction.Continue = 1
            closed: () => ({ action: 1 }), // CloseAction.DoNotRestart = 1
          },
workspaceFolder: {
            uri: rootUri as any,
            name: 'workspace',
            index: 0,
          },
          initializationOptions: {},
        },
      } as any);

      // Start the client
      await client.start();
      console.log(`[VSCodeLSPClient] ✅ Client started for ${languageId}`);

      // Store client
      this.clients.set(languageId, client);

      return client;
    } catch (error) {
      console.error(`[VSCodeLSPClient] ❌ Failed to create client for ${languageId}:`, error);
      throw error;
    }
  }

  /**
   * Create message transports (WebSocket or IPC)
   */
  private async createMessageTransports(
    languageId: string,
    wsUrl?: string,
  ): Promise<MessageTransports> {
    if (wsUrl) {
      // Use WebSocket connection
      console.log(`[VSCodeLSPClient] 🔌 Connecting via WebSocket: ${wsUrl}`);
      const webSocket = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        webSocket.onopen = () => resolve();
        webSocket.onerror = (err) => reject(err);
      });

      const socket = toSocket(webSocket);
      const reader = new WebSocketMessageReader(socket);
      const writer = new WebSocketMessageWriter(socket);

      return { reader, writer };
    } else {
      // Use IPC connection (Electron Main Process)
      console.log(`[VSCodeLSPClient] 🔌 Connecting via IPC for ${languageId}`);

      // Create IPC-based message transports
      // This will communicate with Main Process LSP servers
      const { reader, writer } = await this.createIPCTransports(languageId);

      return { reader, writer };
    }
  }

  /**
   * Create IPC-based message transports (Electron)
   */
  private async createIPCTransports(languageId: string): Promise<MessageTransports> {
    // Create custom message reader/writer that uses Electron IPC
    const { IPCMessageReader, IPCMessageWriter } = await import('./ipc-message-transport');

    const reader = new IPCMessageReader(languageId);
    const writer = new IPCMessageWriter(languageId);

    return { reader, writer };
  }

  /**
   * Get client for a language
   */
  getClient(languageId: string): MonacoLanguageClient | undefined {
    return this.clients.get(languageId);
  }

  /**
   * Stop and dispose a client
   */
  async disposeClient(languageId: string): Promise<void> {
    const client = this.clients.get(languageId);
    if (!client) return;

    console.log(`[VSCodeLSPClient] 🗑️  Disposing client for ${languageId}`);
    await client.stop();
    this.clients.delete(languageId);
  }

  /**
   * Dispose all clients
   */
  async disposeAll(): Promise<void> {
    console.log('[VSCodeLSPClient] 🗑️  Disposing all clients');
    const disposePromises = Array.from(this.clients.keys()).map((languageId) =>
      this.disposeClient(languageId),
    );
    await Promise.all(disposePromises);
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const vscodeClientManager = new VSCodeLSPClientManager();

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Auto-start language client for a file
 */
export async function autoStartVSCodeLanguageClient(
  languageId: string,
  workspaceRoot: string,
): Promise<void> {
  try {
    await vscodeClientManager.createLanguageClient({
      languageId,
      serverName: `${languageId}-language-server`,
      rootUri: workspaceRoot,
    });
    console.log(`[VSCodeLSPClient] ✅ Auto-started client for ${languageId}`);
  } catch (error) {
    console.error(`[VSCodeLSPClient] ❌ Failed to auto-start client for ${languageId}:`, error);
  }
}
