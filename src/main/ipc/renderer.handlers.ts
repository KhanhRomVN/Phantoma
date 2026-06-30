// ─── Renderer IPC Handlers ──────────────────────────────────────────────
// Handles commands sent from the renderer process via window.api.invoke()
// Previously handled by VS Code extension host.
// ──────────────────────────────────────────────────────────────────────────

import { ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec as execCallback } from 'child_process';

// ─── Helpers ────────────────────────────────────────────────────────────

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

/**
 * Send a response back to the renderer via the 'messageResponse' channel.
 * Used by messageDispatcher.register() pattern.
 */
function sendToRenderer(channel: string, data: any) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

// ─── File System Utilities ─────────────────────────────────────────────

function generateTreeView(dirPath: string, maxDepth: number, depth = 0): string {
  if (depth >= maxDepth) return '';
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const lines: string[] = [];
    const prefix = '  '.repeat(depth);

    // Filter out hidden and node_modules
    const filtered = entries.filter((e) => {
      if (e.name.startsWith('.')) return false;
      if (e.name === 'node_modules') return false;
      if (e.name === '.git') return false;
      return true;
    });

    // Sort: directories first, then files
    const sorted = filtered.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const limit = 50;
    const shown = sorted.slice(0, limit);

    for (const entry of shown) {
      if (entry.isDirectory()) {
        lines.push(`${prefix}${entry.name}/`);
        const subtree = generateTreeView(path.join(dirPath, entry.name), maxDepth, depth + 1);
        if (subtree) lines.push(subtree);
      } else {
        lines.push(`${prefix}${entry.name}`);
      }
    }

    if (sorted.length > limit) {
      lines.push(`${prefix}... and ${sorted.length - limit} more entries`);
    }

    return lines.join('\n');
  } catch {
    return `${'  '.repeat(depth)}[Error reading directory]`;
  }
}

function searchFiles(
  dirPath: string,
  pattern: string,
  results: Array<{ file: string; line: number; content: string }> = [],
  maxResults = 100,
): Array<{ file: string; line: number; content: string }> {
  if (results.length >= maxResults) return results;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxResults) break;
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        searchFiles(fullPath, pattern, results, maxResults);
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;
            try {
              if (new RegExp(pattern, 'i').test(lines[i])) {
                results.push({
                  file: fullPath,
                  line: i + 1,
                  content: lines[i].trim().substring(0, 200),
                });
              }
            } catch {
              // Skip regex errors
            }
          }
        } catch {
          // Skip binary/unreadable files
        }
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return results;
}

async function execCommand(
  command: string,
  cwd: string,
): Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }> {
  return new Promise((resolve) => {
    execCallback(command, { cwd, timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message, stdout, stderr });
      } else {
        resolve({ success: true, stdout, stderr });
      }
    });
  });
}

// ─── Generic handler for all renderer commands ──────────────────────────

async function handleRendererCommand(command: string, payload: any): Promise<any> {
  const requestId = payload?.requestId || '';

  switch (command) {
    // ─── System Info ────────────────────────────────────────────────
    case 'getSystemInfo': {
      const homeDir = os.homedir();
      const cwd = process.cwd();
      return {
        data: {
          os: `${os.platform()} ${os.release()}`,
          ide: 'Phantoma (Electron)',
          shell: process.env.SHELL || (os.platform() === 'win32' ? 'powershell' : '/bin/bash'),
          homeDir,
          cwd,
        },
      };
    }

    // ─── Project Context ────────────────────────────────────────────
    case 'getProjectContext': {
      const cwd = process.cwd();
      const treeView = generateTreeView(cwd, 3);

      sendToRenderer('projectContextResult', {
        requestId,
        data: {
          rootPath: cwd,
          homedir: os.homedir(),
          workspace: cwd,
          treeView,
        },
      });
      return { success: true };
    }

    // ─── History ────────────────────────────────────────────────────
    case 'getHistory': {
      sendToRenderer('historyResult', {
        requestId,
        history: [],
      });
      return { success: true };
    }

    case 'deleteConversation': {
      const { conversationId } = payload;
      sendToRenderer('deleteConversationResult', {
        requestId,
        success: true,
        conversationId,
      });
      return { success: true };
    }

    // ─── Theme ──────────────────────────────────────────────────────
    case 'requestTheme': {
      sendToRenderer('themeResult', {
        requestId,
        theme: 'dark',
      });
      return { success: true };
    }

    // ─── File Operations ────────────────────────────────────────────
    case 'openFile': {
      const { path: filePath } = payload;
      if (filePath && fs.existsSync(filePath)) {
        try {
          const { shell } = await import('electron');
          await shell.openPath(filePath);
        } catch (e) {
          console.error('[RendererHandler] Failed to open file:', e);
        }
      }
      return { success: true };
    }

    case 'openWorkspaceFile': {
      const { path: filePath } = payload;
      if (filePath) {
        try {
          const { shell } = await import('electron');
          await shell.openPath(filePath);
        } catch (e) {
          console.error('[RendererHandler] Failed to open workspace file:', e);
        }
      }
      return { success: true };
    }

    case 'openWorkspaceFolder': {
      const { path: folderPath } = payload;
      if (folderPath) {
        try {
          const { shell } = await import('electron');
          await shell.openPath(folderPath);
        } catch (e) {
          console.error('[RendererHandler] Failed to open folder:', e);
        }
      }
      return { success: true };
    }

    case 'openTempImage': {
      const { content, filename } = payload;
      if (content && filename) {
        try {
          const tmpDir = path.join(os.tmpdir(), 'phantoma-images');
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          const tmpPath = path.join(tmpDir, filename);
          const base64Data = content.replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(tmpPath, Buffer.from(base64Data, 'base64'));
          const { shell } = await import('electron');
          await shell.openPath(tmpPath);
        } catch (e) {
          console.error('[RendererHandler] Failed to open temp image:', e);
        }
      }
      return { success: true };
    }

    // ─── Terminal ───────────────────────────────────────────────────
    case 'focusTerminal': {
      sendToRenderer('terminalResult', {
        requestId,
        terminalId: payload?.terminalId,
      });
      return { success: true };
    }

    // ─── Chat / Draft ───────────────────────────────────────────────
    case 'createEmptyChatLog': {
      const { chatUuid } = payload;
      sendToRenderer('chatLogCreated', {
        requestId,
        chatUuid,
      });
      return { success: true };
    }

    // ─── Import Accounts ────────────────────────────────────────────
    case 'importAccounts': {
      return { success: true };
    }

    // ─── Tool Execution (read_file, write_to_file, list_files, etc.) ──
    case 'read_file': {
      try {
        const filePath = payload?.path || payload?.filePath || '';
        if (!filePath || !fs.existsSync(filePath)) {
          sendToRenderer('messageResponse', {
            requestId,
            command: 'read_file',
            error: `File not found: ${filePath}`,
          });
          return { success: false };
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        sendToRenderer('messageResponse', {
          requestId,
          command: 'read_file',
          content,
          path: filePath,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'read_file',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'write_to_file': {
      try {
        const filePath = payload?.path || payload?.filePath || '';
        const content = payload?.content || '';
        if (!filePath) throw new Error('No file path provided');
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, content, 'utf-8');
        sendToRenderer('messageResponse', {
          requestId,
          command: 'write_to_file',
          path: filePath,
          success: true,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'write_to_file',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'replace_in_file': {
      try {
        const filePath = payload?.path || payload?.filePath || '';
        const search = payload?.search || '';
        const replace = payload?.replace || '';
        if (!filePath) throw new Error('No file path provided');
        if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
        let content = fs.readFileSync(filePath, 'utf-8');
        if (!content.includes(search)) {
          sendToRenderer('messageResponse', {
            requestId,
            command: 'replace_in_file',
            error: `Search string not found in ${filePath}`,
          });
          return { success: true };
        }
        content = content.replace(search, replace);
        fs.writeFileSync(filePath, content, 'utf-8');
        sendToRenderer('messageResponse', {
          requestId,
          command: 'replace_in_file',
          path: filePath,
          success: true,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'replace_in_file',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'list_files': {
      try {
        const dirPath = payload?.path || payload?.folderPath || process.cwd();
        const depth = payload?.depth || 2;
        if (!fs.existsSync(dirPath)) {
          sendToRenderer('messageResponse', {
            requestId,
            command: 'list_files',
            error: `Directory not found: ${dirPath}`,
          });
          return { success: true };
        }
        const tree = generateTreeView(dirPath, depth);
        sendToRenderer('messageResponse', {
          requestId,
          command: 'list_files',
          tree,
          path: dirPath,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'list_files',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'search_files': {
      try {
        const dirPath = payload?.path || payload?.folderPath || process.cwd();
        const pattern = payload?.pattern || payload?.search_term || '';
        const results = searchFiles(dirPath, pattern);
        sendToRenderer('messageResponse', {
          requestId,
          command: 'search_files',
          results,
          pattern,
          path: dirPath,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'search_files',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'run_command': {
      try {
        const command = payload?.command || '';
        if (!command) throw new Error('No command provided');
        const cwd = payload?.cwd || process.cwd();
        const result = await execCommand(command, cwd);
        sendToRenderer('messageResponse', {
          requestId,
          command: 'run_command',
          ...result,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'run_command',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'move_file': {
      try {
        const source = payload?.source || payload?.filePath || '';
        const target = payload?.target || payload?.targetFolderPath || '';
        if (!source || !target) throw new Error('Source and target paths required');
        const targetPath = path.join(target, path.basename(source));
        fs.renameSync(source, targetPath);
        sendToRenderer('messageResponse', {
          requestId,
          command: 'move_file',
          path: targetPath,
          success: true,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'move_file',
          error: e.message,
        });
      }
      return { success: true };
    }

    // ─── Delete Conversation Result ─────────────────────────────────
    case 'deleteConversationResult': {
      sendToRenderer('deleteConversationResult', payload);
      return { success: true };
    }

    // ─── Confirm Delete ─────────────────────────────────────────────
    case 'confirmDelete': {
      sendToRenderer('deleteConfirmed', {
        conversationId: payload?.conversationId,
      });
      return { success: true };
    }

    // ─── Terminal ───────────────────────────────────────────────────
    case 'listTerminals': {
      sendToRenderer('listTerminalsResult', {
        requestId,
        terminals: [],
      });
      return { success: true };
    }

    case 'stopCommand':
    case 'stopTerminal': {
      sendToRenderer('messageResponse', {
        requestId,
        command,
        success: true,
      });
      return { success: true };
    }

    case 'terminalInput': {
      sendToRenderer('messageResponse', {
        requestId,
        command: 'terminalInput',
        success: true,
      });
      return { success: true };
    }

    // ─── Folder Tree ────────────────────────────────────────────────
    case 'getFolderTree': {
      const dirPath = payload?.path || process.cwd();
      const tree = generateTreeView(dirPath, 3);
      sendToRenderer('messageResponse', {
        requestId,
        command: 'getFolderTree',
        tree,
        path: dirPath,
      });
      return { success: true };
    }

    // ─── Conversation ───────────────────────────────────────────────
    case 'getConversation': {
      sendToRenderer('messageResponse', {
        requestId,
        command: 'getConversation',
        conversation: null,
        error: 'Conversation not found in Electron mode',
      });
      return { success: true };
    }

    case 'restoreSingleLineReviewActions': {
      sendToRenderer('messageResponse', {
        requestId,
        command: 'restoreSingleLineReviewActions',
        actions: [],
      });
      return { success: true };
    }

    case 'revertConversation': {
      sendToRenderer('messageResponse', {
        requestId,
        command: 'revertConversation',
        success: true,
      });
      return { success: true };
    }

    case 'confirmClearChat': {
      sendToRenderer('messageResponse', {
        requestId,
        command: 'confirmClearChat',
        confirmed: true,
      });
      return { success: true };
    }

    // ─── Notifications / Info ───────────────────────────────────────
    case 'showError': {
      console.error('[RendererHandler] showError:', payload?.message || payload?.error);
      return { success: true };
    }

    case 'showInformation': {
      console.log('[RendererHandler] showInformation:', payload?.message);
      return { success: true };
    }

    // ─── Git Operations ─────────────────────────────────────────────
    case 'runGitStatus': {
      try {
        const cwd = payload?.cwd || process.cwd();
        const result = await execCommand('git status --porcelain', cwd);
        const branchResult = await execCommand('git branch --show-current', cwd);
        const branch = branchResult.success ? (branchResult.stdout || '').trim() : 'unknown';
        const items = result.success
          ? (result.stdout || '')
              .split('\n')
              .filter(Boolean)
              .map((line: string) => {
                const status = line.substring(0, 2).trim();
                const file = line.substring(3).trim();
                return { status, file };
              })
          : [];
        sendToRenderer('messageResponse', {
          requestId,
          command: 'runGitStatus',
          items,
          branch,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'runGitStatus',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'gitCommitAndPush': {
      try {
        const cwd = payload?.cwd || process.cwd();
        const message = payload?.message || 'Auto commit';
        await execCommand('git add -A', cwd);
        const commitResult = await execCommand(`git commit -m "${message.replace(/"/g, '\\"')}"`, cwd);
        const pushResult = await execCommand('git push', cwd);
        sendToRenderer('messageResponse', {
          requestId,
          command: 'gitCommitAndPush',
          success: commitResult.success,
          commit: commitResult.stdout || commitResult.stderr,
          push: pushResult.stdout || pushResult.stderr,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'gitCommitAndPush',
          error: e.message,
        });
      }
      return { success: true };
    }

    case 'showGitDiff': {
      try {
        const filePath = payload?.path || payload?.filePath || '';
        const cwd = payload?.cwd || process.cwd();
        const cmd = filePath ? `git diff ${filePath}` : 'git diff';
        const result = await execCommand(cmd, cwd);
        sendToRenderer('messageResponse', {
          requestId,
          command: 'showGitDiff',
          diff: result.success ? result.stdout : '',
          error: result.error,
        });
      } catch (e: any) {
        sendToRenderer('messageResponse', {
          requestId,
          command: 'showGitDiff',
          error: e.message,
        });
      }
      return { success: true };
    }

    // ─── File Navigation ────────────────────────────────────────────
    case 'openFileAtLine': {
      const { path: filePath } = payload;
      if (filePath && fs.existsSync(filePath)) {
        try {
          const { shell } = await import('electron');
          await shell.openPath(filePath);
        } catch (e) {
          console.error('[RendererHandler] Failed to open file at line:', e);
        }
      }
      return { success: true };
    }

    case 'openFolder': {
      const { path: folderPath } = payload;
      if (folderPath && fs.existsSync(folderPath)) {
        try {
          const { shell } = await import('electron');
          await shell.openPath(folderPath);
        } catch (e) {
          console.error('[RendererHandler] Failed to open folder:', e);
        }
      }
      return { success: true };
    }

    // ─── Snapshot / Diff ────────────────────────────────────────────
    case 'getSnapshot': {
      sendToRenderer('messageResponse', {
        requestId,
        command: 'getSnapshot',
        snapshot: null,
        error: 'Snapshot not available in Electron mode',
      });
      return { success: true };
    }

    case 'openSnapshotDiff': {
      sendToRenderer('messageResponse', {
        requestId,
        command: 'openSnapshotDiff',
        success: false,
        error: 'Snapshot diff not available in Electron mode',
      });
      return { success: true };
    }

    // ─── Workspace ──────────────────────────────────────────────────
    case 'getWorkspaceFiles': {
      const dirPath = payload?.path || process.cwd();
      const tree = generateTreeView(dirPath, 5);
      sendToRenderer('messageResponse', {
        requestId,
        command: 'getWorkspaceFiles',
        tree,
        path: dirPath,
      });
      return { success: true };
    }

    case 'getWorkspaceFolders': {
      const cwd = process.cwd();
      sendToRenderer('messageResponse', {
        requestId,
        command: 'getWorkspaceFolders',
        folders: [{ uri: { fsPath: cwd }, name: path.basename(cwd), index: 0 }],
      });
      return { success: true };
    }

    case 'loadProjectContext': {
      const cwd = process.cwd();
      sendToRenderer('projectContextResult', {
        requestId,
        data: {
          rootPath: cwd,
          homedir: os.homedir(),
          workspace: cwd,
          treeView: generateTreeView(cwd, 3),
        },
      });
      return { success: true };
    }

    // ─── Action Rejected ────────────────────────────────────────────
    case 'markActionRejected': {
      return { success: true };
    }

    default:
      console.debug(`[RendererHandler] Unknown command: ${command}`);
      return { success: false, error: `Unknown command: ${command}` };
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────

export function setupRendererHandlers() {
  const commands = [
    'getSystemInfo',
    'getProjectContext',
    'getHistory',
    'deleteConversation',
    'deleteConversationResult',
    'confirmDelete',
    'requestTheme',
    'openFile',
    'openWorkspaceFile',
    'openWorkspaceFolder',
    'openTempImage',
    'focusTerminal',
    'createEmptyChatLog',
    'importAccounts',
    'read_file',
    'write_to_file',
    'replace_in_file',
    'list_files',
    'search_files',
    'run_command',
    'move_file',
    // Terminal
    'listTerminals',
    'stopCommand',
    'stopTerminal',
    'terminalInput',
    // Folder / Workspace
    'getFolderTree',
    'getWorkspaceFiles',
    'getWorkspaceFolders',
    'loadProjectContext',
    // Conversation
    'getConversation',
    'restoreSingleLineReviewActions',
    'revertConversation',
    'confirmClearChat',
    // Notifications
    'showError',
    'showInformation',
    // Git
    'runGitStatus',
    'gitCommitAndPush',
    'showGitDiff',
    // File Navigation
    'openFileAtLine',
    'openFolder',
    // Snapshot
    'getSnapshot',
    'openSnapshotDiff',
    // Actions
    'markActionRejected',
  ];

  for (const cmd of commands) {
    ipcMain.handle(cmd, async (_event, payload) => {
      try {
        return await handleRendererCommand(cmd, payload || {});
      } catch (e: any) {
        console.error(`[RendererHandler] Error handling ${cmd}:`, e);
        return { success: false, error: e.message };
      }
    });
  }

  console.log('[RendererHandler] Registered', commands.length, 'IPC handlers');
}