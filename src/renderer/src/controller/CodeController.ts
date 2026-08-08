/**
 * CodeController — Singleton controller điều phối các handler cho Code module.
 *
 * ?Usage:
 *   // Từ Agent panel (qua tool-executors):
 *   const result = await CodeController.executeTool('read_file', { path: 'src/main.ts' });
 *
 *   // Từ Code UI:
 *   CodeController.getInstance().handleMessage({ command: 'readFile', requestId: 'r1', path: 'x.ts' });
 *   CodeController.getInstance().onResult((result) => { ... });
 */
import { extensionService } from '../components/RightPanel/Agent/services/ExtensionService';
import { useCodeStore } from '../modules/Code/hooks/useCodeStore';

// HANDLERS — Tool
import { ReadFileHandler } from '../modules/Code/handler/tool/ReadFileHandler';
import { WriteToFileHandler } from '../modules/Code/handler/tool/WriteToFileHandler';
import { ReplaceInFileHandler } from '../modules/Code/handler/tool/ReplaceInFileHandler';
import {
  DeleteFileHandler, ListFilesHandler, FindFilesHandler,
  RevertFileHandler, ViewReplaceHistoryHandler, FileMiscHandler,
} from '../modules/Code/handler/tool/FileHandlers';
import { GrepHandler } from '../modules/Code/handler/tool/GrepHandler';
import { GitStatusHandler, GitDiffHandler, GitCommitHandler } from '../modules/Code/handler/tool/GitHandlers';
import { FileOpenHandler, DiffViewHandler, PreviewHandler } from '../modules/Code/handler/system/SystemHandlers';
import { RunCommandHandler, TerminalInputHandler, CloseTerminalHandler } from '../modules/Code/handler/terminal/TerminalHandlers';
import { StorageHandler } from '../modules/Code/handler/storage/StorageHandler';
import { FileLockManager } from '../modules/Code/managers/FileLockManager';

// ─── Types ────────────────────────────────────────────────────────────

export interface CodeControllerMessage {
  command: string;
  requestId?: string;
  actionId?: string;
  conversationId?: string;
  chatUuid?: string;
  [key: string]: any;
}

export interface CodeControllerResult {
  command: string;
  requestId?: string;
  success?: boolean;
  error?: string;
  [key: string]: any;
}

type ResultListener = (result: CodeControllerResult) => void;

// ─── CodeController ───────────────────────────────────────────────────

export class CodeController {
  private static instance: CodeController;
  private resultListeners: Set<ResultListener> = new Set();

  // Handlers
  private fileLockManager: FileLockManager;
  private readFileHandler: ReadFileHandler;
  private writeToFileHandler: WriteToFileHandler;
  private replaceInFileHandler: ReplaceInFileHandler;
  private deleteFileHandler: DeleteFileHandler;
  private listFilesHandler: ListFilesHandler;
  private findFilesHandler: FindFilesHandler;
  private revertFileHandler: RevertFileHandler;
  private viewReplaceHistoryHandler: ViewReplaceHistoryHandler;
  private fileMiscHandler: FileMiscHandler;
  private grepHandler: GrepHandler;
  private gitStatusHandler: GitStatusHandler;
  private gitDiffHandler: GitDiffHandler;
  private gitCommitHandler: GitCommitHandler;
  private fileOpenHandler: FileOpenHandler;
  private diffViewHandler: DiffViewHandler;
  private previewHandler: PreviewHandler;
  private runCommandHandler: RunCommandHandler;
  private terminalInputHandler: TerminalInputHandler;
  private closeTerminalHandler: CloseTerminalHandler;
  private storageHandler: StorageHandler;

  private constructor() {
    this.fileLockManager = new FileLockManager();
    this.readFileHandler = new ReadFileHandler();
    this.writeToFileHandler = new WriteToFileHandler(this.fileLockManager);
    this.replaceInFileHandler = new ReplaceInFileHandler(this.fileLockManager);
    this.deleteFileHandler = new DeleteFileHandler();
    this.listFilesHandler = new ListFilesHandler();
    this.findFilesHandler = new FindFilesHandler();
    this.revertFileHandler = new RevertFileHandler();
    this.viewReplaceHistoryHandler = new ViewReplaceHistoryHandler();
    this.fileMiscHandler = new FileMiscHandler();
    this.grepHandler = new GrepHandler(this.getCurrentProjectPath());
    this.gitStatusHandler = new GitStatusHandler();
    this.gitDiffHandler = new GitDiffHandler();
    this.gitCommitHandler = new GitCommitHandler();
    this.fileOpenHandler = new FileOpenHandler();
    this.diffViewHandler = new DiffViewHandler();
    this.previewHandler = new PreviewHandler();
    this.runCommandHandler = new RunCommandHandler();
    this.terminalInputHandler = new TerminalInputHandler();
    this.closeTerminalHandler = new CloseTerminalHandler();
    this.storageHandler = new StorageHandler();
  }

  // ── Singleton ─────────────────────────────────────────────────────

  public static getInstance(): CodeController {
    if (!CodeController.instance) CodeController.instance = new CodeController();
    return CodeController.instance;
  }

  // ── Static: execute tool (thay thế CodeControllerBridge) ──────────

  private static readonly TOOL_MAP: Record<string, string> = {
    read_file: 'readFile', write_to_file: 'writeFile', replace_in_file: 'replaceInFile',
    delete_file: 'deleteFile', revert_file: 'revertFile', view_replace_history: 'viewReplaceHistory',
    list_files: 'listFiles', find_files: 'findFiles', run_command: 'runCommand',
    grep: 'executeGrep', git_diff: 'gitDiff', git_status: 'gitStatus', git_commit: 'gitCommit',
  };

  /** Thực thi tool command, trả về Promise. Dùng bởi tool-executors. */
  public static async executeTool(
    toolName: string,
    params: Record<string, any> = {},
    options?: { skipDiagnostics?: boolean; conversationId?: string; actionId?: string },
    timeoutMs: number = 30000,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const command = CodeController.TOOL_MAP[toolName];
    if (!command) return { success: false, error: 'No mapping for: ' + toolName };

    return new Promise((resolve) => {
      const requestId = command + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      const controller = CodeController.getInstance();

      const timer = setTimeout(() => {
        unsubscribe();
        resolve({ success: false, error: 'Timeout: ' + command + ' (' + timeoutMs + 'ms)' });
      }, timeoutMs);

      const unsubscribe = controller.onResult((result: CodeControllerResult) => {
        if (result.requestId !== requestId) return;
        clearTimeout(timer);
        unsubscribe();
        if (result.error) resolve({ success: false, error: result.error, data: result });
        else resolve({ success: true, data: result });
      });

      const msg: any = { command, requestId, ...params };
      if (options?.skipDiagnostics !== undefined) msg.skipDiagnostics = options.skipDiagnostics;
      if (options?.conversationId) msg.conversationId = options.conversationId;
      if (options?.actionId) msg.actionId = options.actionId;

      controller.handleMessage(msg).catch((err: any) => {
        clearTimeout(timer);
        unsubscribe();
        resolve({ success: false, error: err.message || String(err) });
      });
    });
  }

  // ── Instance methods ──────────────────────────────────────────────

  public onResult(listener: ResultListener): () => void {
    this.resultListeners.add(listener);
    return () => { this.resultListeners.delete(listener); };
  }

  private emitResult(result: CodeControllerResult): void {
    extensionService.postMessage(result);
    this.resultListeners.forEach((fn) => { try { fn(result); } catch (e) { console.error('[CodeController] listener error:', e); } });
  }

  private getCurrentProjectPath(): string {
    const state = useCodeStore.getState();
    const project = state.projects.find((p) => p.id === state.currentProjectId);
    return project?.path || '';
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN MESSAGE HANDLER
  // ═══════════════════════════════════════════════════════════════════

  public async handleMessage(message: CodeControllerMessage): Promise<void> {
    const command = message.command;
    const msg = message as any;

    try {
      switch (command) {
        case 'readFile': case 'getFileContent': {
          this.emitResult(await this.readFileHandler.handle(msg)); break;
        }
        case 'writeFile': {
          this.emitResult(await this.writeToFileHandler.handle(msg)); break;
        }
        case 'replaceInFile': {
          this.emitResult(await this.replaceInFileHandler.handle(msg)); break;
        }
        case 'deleteFile': {
          this.emitResult(await this.deleteFileHandler.handle(msg)); break;
        }
        case 'revertFile': {
          this.emitResult(await this.revertFileHandler.handle(msg)); break;
        }
        case 'viewReplaceHistory': {
          this.emitResult(await this.viewReplaceHistoryHandler.handleHistory(msg)); break;
        }
        case 'getHistoryVersion': {
          this.emitResult(await this.viewReplaceHistoryHandler.handleHistoryVersion(msg)); break;
        }
        case 'listFiles': {
          this.emitResult(await this.listFilesHandler.handle(msg)); break;
        }
        case 'findFiles': {
          this.emitResult(await this.findFilesHandler.handle(msg)); break;
        }
        case 'validateFuzzyMatch': {
          this.emitResult(await this.replaceInFileHandler.handleValidateFuzzy(msg)); break;
        }
        case 'getFileStats': {
          this.emitResult(await this.fileMiscHandler.handleGetFileStats(msg)); break;
        }
        case 'getDiagnostics': {
          this.emitResult(await this.fileMiscHandler.handleGetDiagnostics(msg)); break;
        }
        case 'openFile': {
          this.emitResult(this.fileOpenHandler.handleOpenFile(msg)); break;
        }
        case 'openFolder': {
          this.emitResult(await this.fileOpenHandler.handleOpenFolder(msg)); break;
        }
        case 'openTempImage': {
          this.emitResult(await this.previewHandler.handleOpenTempImage(msg)); break;
        }
        case 'openFileDiff': {
          this.emitResult(this.diffViewHandler.handleFileDiff(msg)); break;
        }
        case 'openWriteToFile': {
          this.emitResult(this.previewHandler.handleOpenWriteToFile(msg)); break;
        }
        case 'openViewReplaceHistoryVersion': {
          this.emitResult(this.previewHandler.handleOpenViewReplaceHistoryVersion(msg)); break;
        }
        case 'runCommand': {
          this.emitResult(this.runCommandHandler.handle(msg)); break;
        }
        case 'terminalInput': {
          this.emitResult(this.terminalInputHandler.handle(msg)); break;
        }
        case 'closeTerminal': {
          this.emitResult(this.closeTerminalHandler.handle(msg)); break;
        }
        case 'gitStatus': {
          this.emitResult(await this.gitStatusHandler.handle(msg)); break;
        }
        case 'gitDiff': {
          this.emitResult(await this.gitDiffHandler.handle(msg)); break;
        }
        case 'showGitDiff': {
          this.emitResult(this.diffViewHandler.handleShowGitDiff(msg)); break;
        }
        case 'gitCommit': {
          this.emitResult(await this.gitCommitHandler.handle(msg)); break;
        }
        case 'executeGrep': {
          const grepResult = await this.grepHandler.handle(msg.action || msg);
          this.emitResult({ command: 'agentActionResult', requestId: msg.action?.requestId || msg.requestId, result: grepResult });
          break;
        }
        case 'storageGet': case 'storageSet': case 'storageDelete': case 'storageList': {
          this.emitResult(await this.storageHandler.handle(msg)); break;
        }
        case 'getProjectContext': {
          const state = useCodeStore.getState();
          const project = state.projects.find((p) => p.id === state.currentProjectId);
          this.emitResult({ command: 'projectContext', requestId: msg.requestId,
            project: project ? { name: project.name, path: project.path, template: project.template, fileCount: project.files.length, serviceCount: project.services.length } : null });
          break;
        }
        case 'getSystemInfo': {
          try {
            const info = await extensionService.getSystemInfo();
            this.emitResult({ command: 'systemInfo', requestId: msg.requestId, ...info });
          } catch (e: any) {
            this.emitResult({ command: 'systemInfo', requestId: msg.requestId, error: e.message || String(e) });
          }
          break;
        }
        case 'requestTheme': {
          this.emitResult({ command: 'themeInfo', requestId: msg.requestId, theme: 'dark' }); break;
        }
        case 'showError': console.error('[CodeController] showError:', msg.message); break;
        default:
          console.warn('[CodeController] Unknown command: ' + command);
          this.emitResult({ command: 'error', requestId: msg.requestId, error: 'Unknown command: ' + command });
      }
    } catch (error: any) {
      console.error('[CodeController] handleMessage error for "' + command + '":', error);
      this.emitResult({ command: 'error', requestId: msg.requestId, error: error.message || String(error) });
    }
  }
}