/**
 * LSP Client Service
 * Manages Language Server Protocol client connections for Monaco Editor
 * Supports all programming languages via their respective language servers
 */

import { useDiagnosticsStore } from '../stores/diagnosticsStore';

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Map Monaco/LSP language IDs to their corresponding language server
 * TypeScript Language Server handles both .ts and .tsx files
 * JavaScript Server handles both .js and .jsx files
 */
function getServerLanguage(languageId: string): string {
  const mapping: Record<string, string> = {
    typescriptreact: 'typescript',
    javascriptreact: 'javascript',
  };

  return mapping[languageId] || languageId;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LSPClientConfig {
  language: string;
  serverCommand: string;
  serverArgs: string[];
  workspaceRoot?: string;
}

interface ActiveServer {
  language: string;
  process: any; // Node.js child process or WebSocket connection
  capabilities: any;
}

// ─── LSP Client Manager ─────────────────────────────────────────────────────

class LSPClientManager {
  private activeServers: Map<string, ActiveServer> = new Map();
  private monaco: any = null;
  private diagnosticsEnabled = true;
  private pendingChanges: Map<string, { timer: ReturnType<typeof setTimeout>; version: number }> =
    new Map();
  private readonly DEBOUNCE_DELAY = 300; // ms

  /**
   * Initialize LSP client with Monaco instance
   */
  initialize(monacoInstance: any) {
    this.monaco = monacoInstance;
  }

  /**
   * Start a language server for a specific language
   * Progress is based on real milestones, not simulated time.
   */
  async startLanguageServer(config: LSPClientConfig): Promise<void> {
    const emit = (progress: number) => {
      window.dispatchEvent(new CustomEvent('lsp:init:progress', { detail: { progress } }));
    };

    window.dispatchEvent(
      new CustomEvent('lsp:init:start', {
        detail: { language: config.language, file: config.workspaceRoot },
      }),
    );
    emit(5);

    if (this.activeServers.has(config.language)) {
      emit(100);
      window.dispatchEvent(new CustomEvent('lsp:init:complete'));
      return;
    }

    try {
      emit(10); // Sending IPC to main process

      const result = await window.api.invoke('lsp:start-server', {
        language: config.language,
        command: config.serverCommand,
        args: config.serverArgs,
        workspaceRoot: config.workspaceRoot || process.cwd(),
      });

      if (result.success) {
        emit(50); // Server spawned + initialized

        this.activeServers.set(config.language, {
          language: config.language,
          process: result.serverId,
          capabilities: result.capabilities || {},
        });

        this.setupLanguageFeatures(config.language, result.capabilities);
        emit(80); // Monaco features registered

        emit(95); // Server ready — 100% only when diagnostics arrive
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('lsp:init:complete'));
        }, 100);
      } else {
        console.error(`[LSPClient] ❌ Failed to start server:`, result.error);
        window.dispatchEvent(new CustomEvent('lsp:init:complete'));
        throw new Error(`Failed to start language server: ${result.error}`);
      }
    } catch (error) {
      console.error(`[LSPClient] ❌ Exception starting server for ${config.language}:`, error);
      window.dispatchEvent(new CustomEvent('lsp:init:complete'));
      if (error instanceof Error) {
        console.error('[LSPClient] Stack:', error.stack);
      }
    }
  }

  /**
   * Setup Monaco language features based on LSP capabilities
   */
  private setupLanguageFeatures(language: string, capabilities: any) {
    if (!this.monaco) {
      console.error('[LSPClient] ❌ Monaco not initialized!');
      return;
    }

    const monacoLanguage = this.getMonacoLanguageId(language);

    // Register completion provider
    if (capabilities.completionProvider) {
      this.monaco.languages.registerCompletionItemProvider(monacoLanguage, {
        triggerCharacters: capabilities.completionProvider.triggerCharacters || ['.', ':', '<'],
        provideCompletionItems: async (model: any, position: any) => {
          return this.getCompletionItems(language, model, position);
        },
      });
    } else {
      console.warn('[LSPClient] ⚠️  No completion provider capability');
    }

    // Register hover provider
    if (capabilities.hoverProvider) {
      this.monaco.languages.registerHoverProvider(monacoLanguage, {
        provideHover: async (model: any, position: any) => {
          return this.getHover(language, model, position);
        },
      });
    } else {
      console.warn('[LSPClient] ⚠️  No hover provider capability');
    }

    // Register definition provider
    if (capabilities.definitionProvider) {
      this.monaco.languages.registerDefinitionProvider(monacoLanguage, {
        provideDefinition: async (model: any, position: any) => {
          return this.getDefinition(language, model, position);
        },
      });
    } else {
      console.warn('[LSPClient] ⚠️  No definition provider capability');
    }

    // Register signature help provider
    if (capabilities.signatureHelpProvider) {
      this.monaco.languages.registerSignatureHelpProvider(monacoLanguage, {
        signatureHelpTriggerCharacters: capabilities.signatureHelpProvider.triggerCharacters || [
          '(',
          ',',
        ],
        provideSignatureHelp: async (model: any, position: any) => {
          return this.getSignatureHelp(language, model, position);
        },
      });
    } else {
      console.warn('[LSPClient] ⚠️  No signature help provider capability');
    }

    // Register document formatting provider
    if (capabilities.documentFormattingProvider) {
      this.monaco.languages.registerDocumentFormattingEditProvider(monacoLanguage, {
        provideDocumentFormattingEdits: async (model: any, options: any) => {
          return this.formatDocument(language, model, options);
        },
      });
    } else {
      console.warn('[LSPClient] ⚠️  No formatting provider capability');
    }

    // Register diagnostics (errors/warnings)
    if (this.diagnosticsEnabled) {
      this.setupDiagnostics(language);
    }
  }

  /**
   * Get completion items from language server
   */
  private async getCompletionItems(language: string, model: any, position: any): Promise<any> {
    try {
      const result = await window.api.invoke('lsp:completion', {
        language,
        uri: model.uri.toString(),
        position: { line: position.lineNumber - 1, character: position.column - 1 },
        text: model.getValue(),
      });

      if (!result || !result.items) {
        return { suggestions: [] };
      }

      const suggestions = result.items.map((item: any) => this.convertCompletionItem(item));
      return { suggestions };
    } catch (error) {
      console.error('[LSPClient] Completion error:', error);
      return { suggestions: [] };
    }
  }

  /**
   * Convert LSP completion item to Monaco completion item
   */
  private convertCompletionItem(item: any): any {
    if (!this.monaco) {
      return item;
    }

    const CompletionItemKind = this.monaco.languages.CompletionItemKind;
    const kindMap: Record<number, any> = {
      1: CompletionItemKind.Text,
      2: CompletionItemKind.Method,
      3: CompletionItemKind.Function,
      4: CompletionItemKind.Constructor,
      5: CompletionItemKind.Field,
      6: CompletionItemKind.Variable,
      7: CompletionItemKind.Class,
      8: CompletionItemKind.Interface,
      9: CompletionItemKind.Module,
      10: CompletionItemKind.Property,
      11: CompletionItemKind.Unit,
      12: CompletionItemKind.Value,
      13: CompletionItemKind.Enum,
      14: CompletionItemKind.Keyword,
      15: CompletionItemKind.Snippet,
      16: CompletionItemKind.Color,
      17: CompletionItemKind.File,
      18: CompletionItemKind.Reference,
      19: CompletionItemKind.Folder,
      20: CompletionItemKind.EnumMember,
      21: CompletionItemKind.Constant,
      22: CompletionItemKind.Struct,
      23: CompletionItemKind.Event,
      24: CompletionItemKind.Operator,
      25: CompletionItemKind.TypeParameter,
    };

    return {
      label: item.label,
      kind: kindMap[item.kind] || CompletionItemKind.Text,
      insertText: item.insertText || item.label,
      detail: item.detail,
      documentation: item.documentation,
      sortText: item.sortText,
      filterText: item.filterText,
      range: item.range,
    };
  }

  /**
   * Get hover information from language server
   */
  private async getHover(language: string, model: any, position: any): Promise<any> {
    try {
      const result = await window.api.invoke('lsp:hover', {
        language,
        uri: model.uri.toString(),
        position: { line: position.lineNumber - 1, character: position.column - 1 },
        text: model.getValue(),
      });

      if (!result || !result.contents) {
        return null;
      }

      return {
        contents: Array.isArray(result.contents)
          ? result.contents.map((c: any) => ({ value: c.value || c }))
          : [{ value: result.contents.value || result.contents }],
        range: result.range,
      };
    } catch (error) {
      console.error('[LSPClient] Hover error:', error);
      return null;
    }
  }

  /**
   * Get definition from language server
   */
  private async getDefinition(language: string, model: any, position: any): Promise<any> {
    try {
      const result = await window.api.invoke('lsp:definition', {
        language,
        uri: model.uri.toString(),
        position: { line: position.lineNumber - 1, character: position.column - 1 },
        text: model.getValue(),
      });

      if (!result) {
        return null;
      }

      if (Array.isArray(result)) {
        return result.map((loc: any) => ({
          uri: this.monaco.Uri.parse(loc.uri),
          range: loc.range,
        }));
      }

      return {
        uri: this.monaco.Uri.parse(result.uri),
        range: result.range,
      };
    } catch (error) {
      console.error('[LSPClient] Definition error:', error);
      return null;
    }
  }

  /**
   * Get signature help from language server
   */
  private async getSignatureHelp(language: string, model: any, position: any): Promise<any> {
    try {
      const result = await window.api.invoke('lsp:signature-help', {
        language,
        uri: model.uri.toString(),
        position: { line: position.lineNumber - 1, character: position.column - 1 },
        text: model.getValue(),
      });

      if (!result) {
        return null;
      }

      return {
        value: {
          signatures: result.signatures || [],
          activeSignature: result.activeSignature || 0,
          activeParameter: result.activeParameter || 0,
        },
        dispose: () => {},
      };
    } catch (error) {
      console.error('[LSPClient] Signature help error:', error);
      return null;
    }
  }

  /**
   * Format document using language server
   */
  private async formatDocument(language: string, model: any, options: any): Promise<any> {
    try {
      const result = await window.api.invoke('lsp:format', {
        language,
        uri: model.uri.toString(),
        text: model.getValue(),
        options,
      });

      if (!result) {
        return null;
      }

      return result;
    } catch (error) {
      console.error('[LSPClient] Format error:', error);
      return null;
    }
  }

  /**
   * Setup diagnostics (errors/warnings) from language server
   * NOTE: This is now handled by LSP Manager for better centralization
   * We keep this for backward compatibility with Monaco markers
   */
  private setupDiagnostics(language: string) {
    if (!this.monaco) return;
    // Diagnostics are managed by LSP Manager
  }

  /**
   * Convert LSP diagnostic severity to Monaco marker severity
   */
  private convertDiagnosticSeverity(severity: number): any {
    if (!this.monaco) return 8; // Error as default

    const MarkerSeverity = this.monaco.MarkerSeverity;
    switch (severity) {
      case 1:
        return MarkerSeverity.Error;
      case 2:
        return MarkerSeverity.Warning;
      case 3:
        return MarkerSeverity.Info;
      case 4:
        return MarkerSeverity.Hint;
      default:
        return MarkerSeverity.Error;
    }
  }

  /**
   * Map language to Monaco language ID
   */
  private getMonacoLanguageId(language: string): string {
    const langMap: Record<string, string> = {
      typescript: 'typescript',
      javascript: 'javascript',
      python: 'python',
      rust: 'rust',
      go: 'go',
      css: 'css',
      html: 'html',
      json: 'json',
      markdown: 'markdown',
      yaml: 'yaml',
      bash: 'shell',
      php: 'php',
      java: 'java',
      csharp: 'csharp',
    };
    return langMap[language] || language;
  }

  /**
   * Stop a language server
   */
  async stopLanguageServer(language: string): Promise<void> {
    const server = this.activeServers.get(language);
    if (!server) return;

    try {
      await window.api.invoke('lsp:stop-server', { language });
      this.activeServers.delete(language);
    } catch (error) {
      console.error(`[LSPClient] Failed to stop server for ${language}:`, error);
    }
  }

  /**
   * Stop all language servers
   */
  async stopAllServers(): Promise<void> {
    const languages = Array.from(this.activeServers.keys());

    // Clear all pending changes
    this.pendingChanges.forEach(({ timer }) => clearTimeout(timer));
    this.pendingChanges.clear();

    await Promise.all(languages.map((lang) => this.stopLanguageServer(lang)));
  }

  /**
   * Check if a language server is running
   */
  isServerRunning(language: string): boolean {
    return this.activeServers.has(language);
  }

  /**
   * Get all running servers
   */
  getRunningServers(): string[] {
    return Array.from(this.activeServers.keys());
  }

  /**
   * Notify language server that a document was opened.
   * Should be called by document manager only.
   */
  notifyDocumentOpened(
    language: string,
    uri: string,
    languageId: string,
    text: string,
    version: number = 1,
  ): Promise<void> {
    const serverLanguage = getServerLanguage(language);

    try {
      return window.api
        .invoke('lsp:didOpen', {
          language: serverLanguage,
          uri,
          languageId,
          text,
          version,
        })
        .catch((err: Error) => {
          console.error(`[LSPClient] ❌ didOpen failed:`, err);
          throw err;
        });
    } catch (error) {
      console.error(`[LSPClient] ❌ didOpen exception:`, error);
      return Promise.reject(error);
    }
  }

  /**
   * Notify language server that a document was changed.
   */
  notifyDocumentChanged(language: string, uri: string, text: string, version: number): void {
    const serverLanguage = getServerLanguage(language);
    const key = `${language}:${uri}`;

    // Cancel pending notification for this document
    const pending = this.pendingChanges.get(key);
    if (pending) {
      clearTimeout(pending.timer);
    }

    const OPTIMIZED_DEBOUNCE_DELAY = 500;

    // Schedule new notification
    const timer = setTimeout(() => {
      try {
        window.api
          .invoke('lsp:didChange', {
            language: serverLanguage,
            uri,
            text,
            version,
          })
          .catch((err: Error) => {
            console.error(`[LSPClient] ❌ didChange failed:`, err);
          });
      } catch (error) {
        console.error(`[LSPClient] ❌ didChange exception:`, error);
      }

      this.pendingChanges.delete(key);
    }, OPTIMIZED_DEBOUNCE_DELAY);

    this.pendingChanges.set(key, { timer, version });
  }

  /**
   * Notify language server that a document was saved.
   */
  notifyDocumentSaved(language: string, uri: string, text: string): void {
    const serverLanguage = getServerLanguage(language);

    try {
      window.api
        .invoke('lsp:didSave', {
          language: serverLanguage,
          uri,
          text,
        })
        .catch((err: Error) => {
          console.error(`[LSPClient] ❌ didSave failed:`, err);
        });
    } catch (error) {
      console.error(`[LSPClient] ❌ didSave exception:`, error);
    }
  }

  /**
   * Notify language server that a document was closed.
   * Should be called by document manager only.
   */
  notifyDocumentClosed(language: string, uri: string): void {
    const serverLanguage = getServerLanguage(language);

    try {
      window.api
        .invoke('lsp:didClose', {
          language: serverLanguage,
          uri,
        })
        .catch((err: Error) => {
          console.error(`[LSPClient] ❌ didClose failed:`, err);
        });
    } catch (error) {
      console.error(`[LSPClient] ❌ didClose exception:`, error);
    }
  }
}

// ─── Singleton Instance ─────────────────────────────────────────────────────

export const lspClientManager = new LSPClientManager();

// ─── Auto-start Configuration ───────────────────────────────────────────────

/**
 * Language server configurations
 * Automatically start these servers when files are opened
 */
export const LSP_SERVER_CONFIGS: Record<string, LSPClientConfig> = {
  typescript: {
    language: 'typescript',
    serverCommand: '/home/khanhromvn/.npm-global/bin/typescript-language-server',
    serverArgs: ['--stdio'],
  },
  javascript: {
    language: 'javascript',
    serverCommand: 'typescript-language-server',
    serverArgs: ['--stdio'],
  },
  python: {
    language: 'python',
    serverCommand: 'pyright-langserver',
    serverArgs: ['--stdio'],
  },
  rust: {
    language: 'rust',
    serverCommand: 'rust-analyzer',
    serverArgs: [],
  },
  go: {
    language: 'go',
    serverCommand: 'gopls',
    serverArgs: [],
  },
  css: {
    language: 'css',
    serverCommand: 'vscode-css-language-server',
    serverArgs: ['--stdio'],
  },
  html: {
    language: 'html',
    serverCommand: 'vscode-html-language-server',
    serverArgs: ['--stdio'],
  },
  json: {
    language: 'json',
    serverCommand: 'vscode-json-language-server',
    serverArgs: ['--stdio'],
  },
  yaml: {
    language: 'yaml',
    serverCommand: 'yaml-language-server',
    serverArgs: ['--stdio'],
  },
  bash: {
    language: 'bash',
    serverCommand: 'bash-language-server',
    serverArgs: ['start'],
  },
  php: {
    language: 'php',
    serverCommand: 'intelephense',
    serverArgs: ['--stdio'],
  },
};

/**
 * Cache in-flight start promises để dedup khi nhiều CodeBlock mount cùng lúc
 */
const startingServers = new Map<string, Promise<void>>();

/**
 * Auto-start language server when opening a file
 */
export async function autoStartLanguageServer(
  language: string,
  workspaceRoot?: string,
): Promise<void> {
  // Map React variants to base languages
  // TypeScript Language Server handles both .ts and .tsx files
  // We need to start the "typescript" server for "typescriptreact" files
  const serverLanguage =
    language === 'typescriptreact'
      ? 'typescript'
      : language === 'javascriptreact'
        ? 'javascript'
        : language;

  const config = LSP_SERVER_CONFIGS[serverLanguage];
  if (!config) {
    return;
  }

  if (lspClientManager.isServerRunning(serverLanguage)) {
    return;
  }

  const existingPromise = startingServers.get(serverLanguage);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = lspClientManager.startLanguageServer({
    ...config,
    workspaceRoot,
  });
  startingServers.set(serverLanguage, promise);

  try {
    await promise;
  } finally {
    startingServers.delete(serverLanguage);
  }
}
