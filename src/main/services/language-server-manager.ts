/**
 * ------------------------------------------------------------------
 * Quản lý Language Server
 * ------------------------------------------------------------------
 * Quản l�� các language server TypeScript/JavaScript/Python trong
 * tiến trình chính. Chuyển tiếp thông điệp LSP giữa renderer và
 * language server qua IPC.
 *
 * Hàm chính:
 * - initialize()          : Thiết lập IPC handler
 * - startLanguageServer() : Khởi động language server cho một ngôn ngữ
 * - stopLanguageServer()  : Dừng một language server
 * - stopAll()             : Dừng tất cả language server đang hoạt động
 * ------------------------------------------------------------------
 */

// ─── Imports ────────────────────────────────────────────────────────────
// ── Node.js ──
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ── Electron ──
import { ipcMain, BrowserWindow } from 'electron';

// ── Internal ──
import { logger } from '../utils/logger';

// ─── Interfaces ─────────────────────────────────────────────────────────
interface LanguageServerConfig {
  languageId: string;
  command: string;
  args: string[];
  cwd?: string;
}

interface LSPMessage {
  jsonrpc: string;
  id?: number | string;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

class LanguageServerProcess {
  private process: ChildProcess | null = null;
  private languageId: string;
  private config: LanguageServerConfig;
  private messageBuffer = '';
  private mainWindow: BrowserWindow | null = null;

  constructor(languageId: string, config: LanguageServerConfig) {
    this.languageId = languageId;
    this.config = config;
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if command exists
      if (!fs.existsSync(this.config.command)) {
        reject(new Error(`Language server binary not found: ${this.config.command}`));
        return;
      }

      try {
        this.process = spawn(this.config.command, this.config.args, {
          cwd: this.config.cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            NODE_ENV: 'production',
          },
        });

        // Handle stdout (LSP messages)
        this.process.stdout?.on('data', (data: Buffer) => {
          this.handleServerMessage(data);
        });

        // Handle stderr (logs/errors)
        this.process.stderr?.on('data', (data: Buffer) => {
          logger.error(`[LanguageServer:${this.languageId}] Error:`, data.toString());
        });

        // Handle process exit
        this.process.on('exit', () => {
          this.process = null;
        });

        // Handle process error
        this.process.on('error', (error) => {
          logger.error(`[LanguageServer:${this.languageId}] Process error:`, error);
          reject(error);
        });

        resolve();
      } catch (error) {
        logger.error(`[LanguageServer] Failed to start ${this.languageId} server:`, error);
        reject(error);
      }
    });
  }

  /**
   * Handle messages from language server (LSP responses)
   */
  private handleServerMessage(data: Buffer): void {
    this.messageBuffer += data.toString();

    // Parse LSP messages (Content-Length header format)
    while (true) {
      const lengthMatch = this.messageBuffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!lengthMatch) break;

      const contentLength = parseInt(lengthMatch[1], 10);
      const headerLength = lengthMatch[0].length;
      const totalLength = headerLength + contentLength;

      if (this.messageBuffer.length < totalLength) break;

      const messageContent = this.messageBuffer.substring(headerLength, totalLength);
      this.messageBuffer = this.messageBuffer.substring(totalLength);

      try {
        const message: LSPMessage = JSON.parse(messageContent);
        this.sendMessageToRenderer(message);
      } catch (error) {
        logger.error(`[LanguageServer:${this.languageId}] Failed to parse message:`, error);
      }
    }
  }

  /**
   * Send LSP message to Renderer Process
   */
  private sendMessageToRenderer(message: LSPMessage): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send(`lsp:message:${this.languageId}`, message);
  }

  /**
   * Send message from Renderer to Language Server
   */
  sendMessageToServer(message: LSPMessage): void {
    if (!this.process || !this.process.stdin) {
      logger.error(`[LanguageServer:${this.languageId}] Server process not available`);
      return;
    }

    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content, 'utf8')}\r\n\r\n`;
    const fullMessage = header + content;

    this.process.stdin.write(fullMessage, 'utf8');
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}

// ─── Language Server Manager ────────────────────────────────────────────────

class LanguageServerManager {
  private servers: Map<string, LanguageServerProcess> = new Map();
  private mainWindow: BrowserWindow | null = null;

  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.setupIPCHandlers();
  }

  /**
   * Setup IPC handlers for LSP communication
   */
  private setupIPCHandlers(): void {
    // Handle messages from Renderer to Language Server
    ipcMain.handle('lsp:send-message', async (_event, { languageId, message }) => {
      const server = this.servers.get(languageId);
      if (!server || !server.isRunning()) {
        throw new Error(`Language server not running: ${languageId}`);
      }

      server.sendMessageToServer(message);
    });

    // Handle language server start request
    ipcMain.handle('lsp:start-server', async (_event, { languageId, workspaceRoot }) => {
      return this.startLanguageServer(languageId, workspaceRoot);
    });

    // Handle language server stop request
    ipcMain.handle('lsp:stop-server', async (_event, { languageId }) => {
      return this.stopLanguageServer(languageId);
    });
  }

  /**
   * Start language server for a specific language
   */
  async startLanguageServer(languageId: string, workspaceRoot: string): Promise<void> {
    // Check if already running
    if (this.servers.has(languageId) && this.servers.get(languageId)!.isRunning()) {
      return;
    }

    const config = this.getLanguageServerConfig(languageId, workspaceRoot);
    if (!config) {
      throw new Error(`No language server configuration for: ${languageId}`);
    }

    const server = new LanguageServerProcess(languageId, config);
    if (this.mainWindow) {
      server.setMainWindow(this.mainWindow);
    }

    await server.start();
    this.servers.set(languageId, server);
  }

  /**
   * Stop language server for a specific language
   */
  async stopLanguageServer(languageId: string): Promise<void> {
    const server = this.servers.get(languageId);
    if (!server) {
      return;
    }

    server.stop();
    this.servers.delete(languageId);
  }

  /**
   * Get language server configuration for a language
   */
  private getLanguageServerConfig(
    languageId: string,
    workspaceRoot: string,
  ): LanguageServerConfig | null {
    switch (languageId) {
      case 'typescript':
      case 'javascript':
        return this.getTypeScriptServerConfig(workspaceRoot);
      case 'python':
        return this.getPythonServerConfig(workspaceRoot);
      default:
        return null;
    }
  }

  /**
   * TypeScript/JavaScript language server config
   */
  private getTypeScriptServerConfig(workspaceRoot: string): LanguageServerConfig {
    // Use typescript-language-server (npm package)
    // Command: typescript-language-server --stdio
    const tsServerPath = this.findNodeModule(
      'typescript-language-server',
      'bin/typescript-language-server',
    );

    if (!tsServerPath) {
      throw new Error(
        'typescript-language-server not found. Install: npm install -g typescript-language-server',
      );
    }

    return {
      languageId: 'typescript',
      command: tsServerPath,
      args: ['--stdio'],
      cwd: workspaceRoot,
    };
  }

  /**
   * Python language server config
   */
  private getPythonServerConfig(workspaceRoot: string): LanguageServerConfig {
    // Use pylsp (python-lsp-server)
    // Command: pylsp
    return {
      languageId: 'python',
      command: 'pylsp', // Assumes pylsp is in PATH
      args: [],
      cwd: workspaceRoot,
    };
  }

  /**
   * Find node_modules binary
   */
  private findNodeModule(moduleName: string, binPath: string): string | null {
    // Check global node_modules
    const globalPaths = [
      path.join(process.env.HOME || '', '.nvm/versions/node', process.version, 'lib/node_modules'),
      '/usr/local/lib/node_modules',
      '/usr/lib/node_modules',
    ];

    for (const basePath of globalPaths) {
      const fullPath = path.join(basePath, moduleName, binPath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Check local node_modules (in app)
    const localPath = path.join(__dirname, '../../node_modules', moduleName, binPath);
    if (fs.existsSync(localPath)) {
      return localPath;
    }

    return null;
  }

  /**
   * Stop all language servers
   */
  stopAll(): void {
    this.servers.forEach((server) => server.stop());
    this.servers.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────
export const languageServerManager = new LanguageServerManager();
