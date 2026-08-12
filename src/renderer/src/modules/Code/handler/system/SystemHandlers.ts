/**
 * ------------------------------------------------------------------
 * System Handlers
 * ------------------------------------------------------------------
 * IPC message handlers for system-level operations within the Code
 * module. Adapted from Zen's VSCode API to window.api.invoke + emit
 * event pattern.
 *
 * Main handlers:
 * - FileOpenHandler  : Open a file in the editor with optional jump-to-line
 * - DiffViewHandler  : Open diff view for file comparisons
 * - PreviewHandler   : Preview images, file content, and replace history
 * ------------------------------------------------------------------
 */

// ─── Types ──────────────────────────────────────────────────────────────

interface BaseParams {
  requestId?: string;
  [key: string]: any;
}

interface BaseResult {
  command: string;
  requestId?: string;
  error?: string;
  [key: string]: any;
}

// ─── FileOpenHandler ────────────────────────────────────────────────────

export class FileOpenHandler {
  /** Mở file trong Code editor, hỗ trợ jump to line */
  public handleOpenFile(message: BaseParams): BaseResult {
    const filePath = message.path;
    if (!filePath) {
      return { command: 'openFileInEditor', requestId: message.requestId, error: 'No path provided' };
    }

    // Emit event để Code module mở file trong Monaco editor
    return {
      command: 'openFileInEditor',
      requestId: message.requestId,
      path: filePath,
      line: message.line,
      selection: message.selection,
    };
  }

  /** Mở thư mục trong OS file manager */
  public async handleOpenFolder(message: BaseParams): Promise<BaseResult> {
    const folderPath = message.path;
    if (!folderPath) {
      return { command: 'openFolder', requestId: message.requestId, error: 'No path provided' };
    }

    try {
      const api = (window as any).api;
      if (api?.invoke) {
        await api.invoke('shell:open-path', folderPath);
      }
      return { command: 'openFolder', requestId: message.requestId, success: true };
    } catch (e: any) {
      return { command: 'openFolder', requestId: message.requestId, error: e.message || String(e) };
    }
  }
}

// ─── DiffViewHandler ────────────────────────────────────────────────────

export class DiffViewHandler {
  /** Mở diff view cho thao tác file (replace, revert...) */
  public handleFileDiff(message: BaseParams): BaseResult {
    return {
      command: 'openFileDiff',
      requestId: message.requestId,
      filePath: message.filePath,
      oldContent: message.oldContent,
      newContent: message.newContent,
    };
  }

  /** Mở git diff view cho file */
  public handleShowGitDiff(message: BaseParams): BaseResult {
    return {
      command: 'showGitDiff',
      requestId: message.requestId,
      filePath: message.filePath,
    };
  }
}

// ─── PreviewHandler ─────────────────────────────────────────────────────

export class PreviewHandler {
  /** Mở ảnh base64 trong editor/viewer */
  public async handleOpenTempImage(message: BaseParams): Promise<BaseResult> {
    // TODO: Implement preview ảnh base64
    return {
      command: 'openTempImage',
      requestId: message.requestId,
      content: message.content,
    };
  }

  /** Mở preview nội dung file sẽ được ghi */
  public handleOpenWriteToFile(message: BaseParams): BaseResult {
    return {
      command: 'openWriteToFile',
      requestId: message.requestId,
      filePath: message.filePath,
      content: message.content,
    };
  }

  /** Mở nội dung của version cụ thể trong lịch sử replace */
  public handleOpenViewReplaceHistoryVersion(message: BaseParams): BaseResult {
    return {
      command: 'openViewReplaceHistoryVersion',
      requestId: message.requestId,
      filePath: message.filePath,
      version: message.version,
    };
  }
}