/**
 * LSP IPC Handlers
 * Main process handlers for Language Server Protocol communication
 */

import { ipcMain, BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LSPServer {
  process: ChildProcess;
  language: string;
  workspaceRoot?: string;
  capabilities: any;
  pendingRequests: Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
    }
  >;
  nextRequestId: number;
}

// ─── Active Servers ─────────────────────────────────────────────────────────

const activeServers: Map<string, LSPServer> = new Map();

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Send JSON-RPC request to language server
 */
function sendRequest(server: LSPServer, method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = server.nextRequestId++;

    server.pendingRequests.set(requestId, { resolve, reject });

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params,
    };

    const message = JSON.stringify(request);
    const header = `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n`;

    try {
      server.process.stdin?.write(header + message, 'utf8');
    } catch (error) {
      server.pendingRequests.delete(requestId);
      reject(error);
    }

    // Timeout after 30 seconds
    setTimeout(() => {
      if (server.pendingRequests.has(requestId)) {
        server.pendingRequests.delete(requestId);
        reject(new Error('LSP request timeout'));
      }
    }, 30000);
  });
}

/**
 * Send notification to language server (no response expected)
 */
function sendNotification(server: LSPServer, method: string, params: any): void {
  const notification = {
    jsonrpc: '2.0',
    method,
    params,
  };

  const message = JSON.stringify(notification);
  const header = `Content-Length: ${Buffer.byteLength(message, 'utf8')}\r\n\r\n`;

  try {
    server.process.stdin?.write(header + message, 'utf8');
  } catch (error) {
    console.error('[LSP] Failed to send notification:', error);
  }
}

/**
 * Parse LSP messages from stdout
 */
function setupMessageParser(server: LSPServer, mainWindow: any) {
  let buffer = '';

  server.process.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString('utf8');

    while (true) {
      const headerMatch = buffer.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!headerMatch) break;

      const contentLength = parseInt(headerMatch[1], 10);
      const messageStart = buffer.indexOf('\r\n\r\n') + 4;

      if (buffer.length < messageStart + contentLength) break;

      const messageContent = buffer.substring(messageStart, messageStart + contentLength);
      buffer = buffer.substring(messageStart + contentLength);

      try {
        const message = JSON.parse(messageContent);
        handleMessage(server, message, mainWindow);
      } catch (error) {
        console.error('[LSP] Failed to parse message:', error);
      }
    }
  });

  server.process.stderr?.on('data', (data: Buffer) => {
    console.error(`[LSP:${server.language}]`, data.toString());
  });
}

/**
 * Handle incoming LSP message
 */
function handleMessage(server: LSPServer, message: any, mainWindow: any) {
  // Response to a request we sent
  if (
    message.id !== undefined &&
    message.id !== null &&
    (message.result !== undefined || message.error !== undefined)
  ) {
    const pending = server.pendingRequests.get(message.id);
    if (pending) {
      server.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    }
    return; // Don't process as notification
  }

  // Request from server (has id and method, needs response)
  if (message.id !== undefined && message.id !== null && message.method) {
    handleServerRequest(server, message, mainWindow);
    return;
  }

  // Notification from server (has method, no id, no response needed)
  if (message.method) {
    handleNotification(server, message, mainWindow);
  }
}

/**
 * Handle requests from language server (server asking us for something)
 */
function handleServerRequest(server: LSPServer, message: any, mainWindow: any) {
  switch (message.method) {
    case 'workspace/configuration':
      // Build real configuration based on requested items
      const configs = (message.params?.items || []).map((item: any) => {
        const section = item.section || '';

        // TypeScript configuration
        if (section.includes('typescript') || section.includes('javascript')) {
          return {
            preferences: {
              includePackageJsonAutoImports: 'auto',
              importModuleSpecifierPreference: 'relative',
            },
            suggest: {
              autoImports: true,
            },
            diagnostics: {
              ignoredCodes: [], // Don't ignore any diagnostics
            },
          };
        }

        // Python configuration
        if (section.includes('python')) {
          return {
            analysis: {
              typeCheckingMode: 'basic',
              autoSearchPaths: true,
            },
          };
        }

        // Default: empty config
        return {};
      });

      // Respond with configuration
      const configResponse = {
        jsonrpc: '2.0',
        id: message.id,
        result: configs,
      };

      const responseMessage = JSON.stringify(configResponse);
      const header = `Content-Length: ${Buffer.byteLength(responseMessage, 'utf8')}\r\n\r\n`;

      try {
        server.process.stdin?.write(header + responseMessage, 'utf8');
      } catch (error) {
        console.error(`[LSP:Main] ❌ Failed to send workspace configuration response:`, error);
      }
      break;

    default:
      // Send empty response to avoid blocking server
      const emptyResponse = {
        jsonrpc: '2.0',
        id: message.id,
        result: null,
      };
      const msg = JSON.stringify(emptyResponse);
      const hdr = `Content-Length: ${Buffer.byteLength(msg, 'utf8')}\r\n\r\n`;
      try {
        server.process.stdin?.write(hdr + msg, 'utf8');
      } catch (error) {
        console.error(`[LSP:Main] ❌ Failed to send response:`, error);
      }
      break;
  }
}

/**
 * Handle notifications from language server
 */
function handleNotification(server: LSPServer, message: any, mainWindow: any) {
  switch (message.method) {
    case 'textDocument/publishDiagnostics':
      // Send diagnostics to renderer
      const diagnostics = message.params.diagnostics || [];
      mainWindow?.send(`lsp:diagnostics:${server.language}`, {
        uri: message.params.uri,
        diagnostics: diagnostics,
      });

      if (!mainWindow) {
        console.error(
          '[LSP:Main] ❌ mainWindow is null/undefined - cannot send diagnostics to renderer!',
        );
      }
      break;

    case 'window/logMessage':
      break;

    case 'window/showMessage':
      break;

    default:
      // Forward all other notifications to renderer for monaco-languageclient
      mainWindow?.send(`lsp:message:${server.language}`, message);
      break;
  }
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

/**
 * Start a language server for a specific language
 */
ipcMain.handle('lsp:start-server', async (event, args) => {
  const { language, command, args: serverArgs, workspaceRoot } = args;

  // Check if server exists — only restart if workspaceRoot changed
  const existingServer = activeServers.get(language);
  if (existingServer) {
    if (existingServer.workspaceRoot === workspaceRoot) {
      return {
        success: true,
        serverId: existingServer.process.pid,
        capabilities: existingServer.capabilities,
      };
    }
    try {
      // Send shutdown + exit
      await sendRequest(existingServer, 'shutdown', null);
      sendNotification(existingServer, 'exit', null);
      existingServer.process.kill();
      activeServers.delete(language);
    } catch (e) {
      activeServers.delete(language);
    }
  }

  try {
    // Spawn language server process with full environment
    const serverProcess = spawn(command, serverArgs, {
      cwd: workspaceRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: process.env.PATH + ':/home/khanhromvn/.npm-global/bin',
        // Force TypeScript to use project tsconfig.json
        TS_NODE_PROJECT: join(workspaceRoot, 'tsconfig.json'),
      },
    });

    // Log stderr immediately for early errors
    serverProcess.stderr?.on('data', (data: Buffer) => {
      const errorMsg = data.toString();
      console.error(`[LSP:${language} stderr]`, errorMsg);
    });

    // Handle spawn errors
    serverProcess.on('error', (err) => {
      console.error(`[LSP:Main] ❌ Process spawn error for ${language}:`, err);
      activeServers.delete(language);
    });

    // Handle unexpected exit
    serverProcess.on('exit', (code, signal) => {
      activeServers.delete(language);
    });

    const server: LSPServer = {
      process: serverProcess,
      language,
      workspaceRoot,
      capabilities: {},
      pendingRequests: new Map(),
      nextRequestId: 1,
    };

    activeServers.set(language, server);

    // Setup message parsing - get main window instead of using event.sender
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) {
      console.error('[LSP:Main] ❌ No main window found!');
      throw new Error('No main window available');
    }

    setupMessageParser(server, mainWindow.webContents);

    // Initialize the language server
    const initResult = await sendRequest(server, 'initialize', {
      processId: process.pid,
      clientInfo: {
        name: 'Phantoma IDE',
        version: '1.0.0',
      },
      rootUri: `file://${workspaceRoot}`,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true,
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
            },
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext'],
          },
          signatureHelp: {
            dynamicRegistration: true,
            signatureInformation: {
              documentationFormat: ['markdown', 'plaintext'],
            },
          },
          definition: {
            dynamicRegistration: true,
          },
          references: {
            dynamicRegistration: true,
          },
          formatting: {
            dynamicRegistration: true,
          },
          rangeFormatting: {
            dynamicRegistration: true,
          },
          // ✅ Enable diagnostics (CRITICAL for error/warning display)
          publishDiagnostics: {
            relatedInformation: true,
            tagSupport: {
              valueSet: [1, 2], // Unnecessary + Deprecated
            },
            versionSupport: true,
            codeDescriptionSupport: true,
            dataSupport: true,
          },
        },
        workspace: {
          workspaceFolders: true,
          configuration: true,
        },
      },
    });

    server.capabilities = initResult.capabilities;

    // Send initialized notification
    sendNotification(server, 'initialized', {});

    return {
      success: true,
      serverId: language,
      capabilities: server.capabilities,
    };
  } catch (error: any) {
    console.error(`[LSP:Main] ❌ Failed to start server for ${language}:`, error);
    console.error(`[LSP:Main] Stack:`, error.stack);

    // Remove from active servers on failure
    activeServers.delete(language);

    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Stop a language server
 */
ipcMain.handle('lsp:stop-server', async (event, args) => {
  const { language } = args;

  const server = activeServers.get(language);
  if (!server) {
    return { success: false, error: 'Server not found' };
  }

  try {
    // Send shutdown request
    await sendRequest(server, 'shutdown', null);

    // Send exit notification
    sendNotification(server, 'exit', null);

    // Kill process
    server.process.kill();

    activeServers.delete(language);

    return { success: true };
  } catch (error: any) {
    console.error(`[LSP] Error stopping server for ${language}:`, error);
    return { success: false, error: error.message };
  }
});

/**
 * Get list of active language servers (for renderer refresh recovery)
 * Returns language names only — no sensitive process info
 */
ipcMain.handle('lsp:get-active-servers', async () => {
  try {
    const servers = Array.from(activeServers.keys());
    return { success: true, servers };
  } catch (error: any) {
    console.error('[LSP:Main] ❌ get-active-servers error:', error);
    return { success: false, error: error.message, servers: [] };
  }
});

/**
 * Notify server that a document was opened
 */
ipcMain.handle('lsp:didOpen', async (event, args) => {
  const { language, uri, languageId, text, version } = args;

  const server = activeServers.get(language);
  if (!server) {
    return { success: false, error: 'Server not found' };
  }

  try {
    sendNotification(server, 'textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[LSP:Main] ❌ Error sending didOpen:`, error);
    return { success: false, error: error.message };
  }
});

/**
 * Notify server that a document was saved
 */
ipcMain.handle('lsp:didSave', async (event, args) => {
  const { language, uri, text } = args;

  const server = activeServers.get(language);
  if (!server) {
    return { success: false, error: 'Server not found' };
  }

  try {
    sendNotification(server, 'textDocument/didSave', {
      textDocument: { uri },
      text, // Include text for servers that need it
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[LSP:Main] ❌ Error sending didSave:`, error);
    return { success: false, error: error.message };
  }
});

/**
 * Notify server that a document was closed
 */
ipcMain.handle('lsp:didClose', async (event, args) => {
  const { language, uri } = args;

  const server = activeServers.get(language);
  if (!server) {
    return { success: false, error: 'Server not found' };
  }

  try {
    sendNotification(server, 'textDocument/didClose', {
      textDocument: { uri },
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[LSP:Main] ❌ Error sending didClose:`, error);
    return { success: false, error: error.message };
  }
});

/**
 * Notify server that a document was changed
 * CRITICAL: Many language servers only trigger analysis on didChange, not didOpen!
 */
ipcMain.handle('lsp:didChange', async (event, args) => {
  const { language, uri, text, version } = args;

  const server = activeServers.get(language);
  if (!server) {
    return { success: false, error: 'Server not found' };
  }

  try {
    sendNotification(server, 'textDocument/didChange', {
      textDocument: {
        uri,
        version,
      },
      contentChanges: [
        {
          text, // Full document sync
        },
      ],
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[LSP:Main] ❌ Error sending didChange:`, error);
    return { success: false, error: error.message };
  }
});

/**
 * Get completion items
 */
ipcMain.handle('lsp:completion', async (event, args) => {
  const { language, uri, position, text } = args;

  const server = activeServers.get(language);
  if (!server) {
    return null;
  }

  try {
    // Notify server of document changes
    sendNotification(server, 'textDocument/didChange', {
      textDocument: { uri, version: Date.now() },
      contentChanges: [{ text }],
    });

    // Request completion
    const result = await sendRequest(server, 'textDocument/completion', {
      textDocument: { uri },
      position,
    });

    return result;
  } catch (error) {
    console.error('[LSP] Completion error:', error);
    return null;
  }
});

/**
 * Get hover information
 */
ipcMain.handle('lsp:hover', async (event, args) => {
  const { language, uri, position, text } = args;

  const server = activeServers.get(language);
  if (!server) {
    return null;
  }

  try {
    sendNotification(server, 'textDocument/didChange', {
      textDocument: { uri, version: Date.now() },
      contentChanges: [{ text }],
    });

    const result = await sendRequest(server, 'textDocument/hover', {
      textDocument: { uri },
      position,
    });

    return result;
  } catch (error) {
    console.error('[LSP] Hover error:', error);
    return null;
  }
});

/**
 * Get definition
 */
ipcMain.handle('lsp:definition', async (event, args) => {
  const { language, uri, position, text } = args;

  const server = activeServers.get(language);
  if (!server) {
    return null;
  }

  try {
    sendNotification(server, 'textDocument/didChange', {
      textDocument: { uri, version: Date.now() },
      contentChanges: [{ text }],
    });

    const result = await sendRequest(server, 'textDocument/definition', {
      textDocument: { uri },
      position,
    });

    return result;
  } catch (error) {
    console.error('[LSP] Definition error:', error);
    return null;
  }
});

/**
 * Get signature help
 */
ipcMain.handle('lsp:signature-help', async (event, args) => {
  const { language, uri, position, text } = args;

  const server = activeServers.get(language);
  if (!server) {
    return null;
  }

  try {
    sendNotification(server, 'textDocument/didChange', {
      textDocument: { uri, version: Date.now() },
      contentChanges: [{ text }],
    });

    const result = await sendRequest(server, 'textDocument/signatureHelp', {
      textDocument: { uri },
      position,
    });

    return result;
  } catch (error) {
    console.error('[LSP] Signature help error:', error);
    return null;
  }
});

/**
 * Format document
 */
ipcMain.handle('lsp:format', async (event, args) => {
  const { language, uri, text, options } = args;

  const server = activeServers.get(language);
  if (!server) {
    return null;
  }

  try {
    sendNotification(server, 'textDocument/didChange', {
      textDocument: { uri, version: Date.now() },
      contentChanges: [{ text }],
    });

    const result = await sendRequest(server, 'textDocument/formatting', {
      textDocument: { uri },
      options,
    });

    return result;
  } catch (error) {
    console.error('[LSP] Format error:', error);
    return null;
  }
});

/**
 * Request diagnostics for a document (pull diagnostics - LSP 3.17+)
 */
ipcMain.handle('lsp:pullDiagnostics', async (event, args) => {
  const { language, uri } = args;

  const server = activeServers.get(language);
  if (!server) {
    return { success: false, error: 'Server not found' };
  }

  try {
    const result = await sendRequest(server, 'textDocument/diagnostic', {
      textDocument: { uri },
    });

    // Manually publish diagnostics to renderer if we got items
    if (result && result.items) {
      event.sender.send(`lsp:diagnostics:${language}`, {
        uri,
        diagnostics: result.items,
      });
    }

    return { success: true, diagnostics: result };
  } catch (error: any) {
    console.error(`[LSP:Main] ❌ Error requesting pull diagnostics:`, error);
    return { success: false, error: error.message };
  }
});

/**
 * Send LSP message from renderer (for monaco-languageclient)
 */
ipcMain.handle('lsp:send-message', async (event, args) => {
  const { language, message } = args;

  const server = activeServers.get(language);
  if (!server) {
    throw new Error(`Server not found for ${language}`);
  }

  // Check if it's a request or notification
  if (message.id !== undefined) {
    // Request - wait for response
    return await sendRequest(server, message.method, message.params);
  } else {
    // Notification - no response
    sendNotification(server, message.method, message.params);
    return { success: true };
  }
});

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Stop all servers on app exit
 */
export function stopAllLSPServers() {
  for (const [language, server] of activeServers.entries()) {
    try {
      server.process.kill();
    } catch (error) {
      console.error(`[LSP] Error stopping server for ${language}:`, error);
    }
  }
  activeServers.clear();
}
