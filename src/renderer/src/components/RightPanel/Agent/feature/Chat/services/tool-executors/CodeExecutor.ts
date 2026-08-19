import { CodeController } from '@renderer/controller/CodeController';
import {
  DeleteFileParams,
  GrepParams,
  ListFilesParams,
  MoveFileParams,
  ReadFileParams,
  ReplaceInFileParams,
  RevertFileParams,
  RunCommandParams,
  WriteToFileParams,
} from '../../types/tool-types';
import { FindFilesParams } from '../parsers/CodeParser';

// ===== DeleteFileExecutor =====

export const executeDeleteFile = async (params: DeleteFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const result = await CodeController.executeTool('delete_file', { file_path: filePath });

  if (!result.success) {
    return "[delete_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[delete_file for '" + filePath + "'] Result: File deleted successfully";
};

// ===== FindFilesExecutor =====

export interface FindFilesResult {
  fileName: string;
  matches: string[];
}

export async function executeFindFiles(params: FindFilesParams): Promise<{
  output: string;
  results?: FindFilesResult[];
  totalMatches?: number;
} | null> {
  const fileNames = params.file_names || [];
  const fileName =
    fileNames.length > 0
      ? fileNames[0]
      : (params as any).fileName || (params as any).file_name || '';
  const folderPath = (params as any).folderPath || (params as any).folder_path;

  const result = await CodeController.executeTool('find_files', {
    fileName,
    folderPath,
  });

  if (!result.success) {
    return { output: '[find_files] Result: Error - ' + (result.error || '') };
  }

  const data = result.data || {};
  const matches = data.matches || [];
  const totalMatches = data.totalMatches || matches.length;

  let output = '[find_files] Found ' + totalMatches + ' file(s)\n\n';
  if (totalMatches === 0) {
    output += 'No files found.';
  } else {
    matches.forEach((m: any) => {
      output += '- ' + (m.path || m) + '\n';
    });
  }

  return { output, totalMatches };
}

// ===== GitDiffExecutor =====

export async function executeGitDiff(filePath: string, _requestId: string): Promise<string | null> {
  const result = await CodeController.executeTool('git_diff', { filePath });

  if (!result.success) {
    return "[git_diff for '" + filePath + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const diffContent = data.output || data.diff || '';

  // Clean metadata lines
  const cleanLines = diffContent.split('\n').filter((line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('diff')) return false;
    if (trimmed.startsWith('index ')) return false;
    if (trimmed.startsWith('new file mode')) return false;
    if (trimmed.startsWith('deleted file mode')) return false;
    if (trimmed.includes('No newline at end of file')) return false;
    return true;
  });

  return "[git_diff for '" + filePath + "'] Result:\n```diff\n" + cleanLines.join('\n') + '\n```';
}

// ===== GrepExecutor =====

export async function executeGrep(params: GrepParams): Promise<string | null> {
  const searchTerm = params.search_term || params.searchTerm || '';
  const filePath = params.file_path || params.filePath;
  const folderPath = params.folder_path || params.folderPath;
  const targetDesc = filePath || folderPath || 'unknown';

  if ((params as any)._validationError) {
    return (
      "[grep for '" +
      searchTerm +
      "' in '" +
      targetDesc +
      "'] Result: Error - " +
      (params as any)._validationError
    );
  }

  const result = await CodeController.executeTool('grep', {
    action: {
      search_term: searchTerm,
      file_path: filePath,
      folder_path: folderPath,
    },
  });

  if (!result.success) {
    return (
      "[grep for '" +
      searchTerm +
      "' in '" +
      targetDesc +
      "'] Result: Error - " +
      (result.error || '')
    );
  }

  const data = result.data || {};
  const grepData = data.result?.data || data;
  const results = grepData.results || {};
  const totalMatches = grepData.totalMatches || 0;
  const totalFiles = grepData.totalFilesSearched || 0;

  let output = "[grep for '" + searchTerm + "' in '" + targetDesc + "'] Result:\n";
  output += 'Found ' + totalMatches + ' match(es) in ' + totalFiles + ' file(s)\n';

  for (const [fp, fileResult] of Object.entries(results)) {
    const matches = (fileResult as any).matches || [];
    if (matches.length > 0) {
      output += '\n**' + fp + '** (' + matches.length + ' match(es))\n';
      matches.forEach((m: any) => {
        output += '  L' + m.lineNumber + ': ' + m.lineContent + '\n';
      });
    }
  }

  return output;
}

// ===== ListFilesExecutor =====

export async function executeListFiles(
  params: ListFilesParams,
  _bypassIgnore: boolean = false,
): Promise<string | null> {
  const folderPath = params.path || params.folder_path || '';
  const result = await CodeController.executeTool('list_files', {
    path: folderPath,
    depth: params.depth,
    recursive: params.recursive,
  });

  if (!result.success) {
    return "[list_files for '" + folderPath + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const files = data.files || [];
  return JSON.stringify(files, null, 2);
}

// ===== MoveFileExecutor =====

export const executeMoveFile = async (params: MoveFileParams): Promise<string | null> => {
  const filePath = params.file_path;
  const targetFolderPath = params.target_folder_path;

  // move_file chưa có handler riêng trong CodeController → dùng delete + write
  const result = await CodeController.executeTool('delete_file', { file_path: filePath });

  if (!result.success) {
    return (
      "[move_file from '" +
      filePath +
      "' to '" +
      targetFolderPath +
      "'] Result: Error - " +
      (result.error || '')
    );
  }
  return (
    "[move_file from '" +
    filePath +
    "' to '" +
    targetFolderPath +
    "'] Result: File moved successfully"
  );
};

// ===== ReadFileExecutor =====

/**
 * Execute read_file tool — gọi CodeController.executeTool().
 */
export async function executeReadFile(
  params: ReadFileParams,
  _bypassIgnore: boolean = false,
): Promise<{ output: string; diagnostics?: any[] } | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool('read_file', {
    path: filePath,
    start_line: params.start_line,
    end_line: params.end_line,
  });

  if (!result.success) {
    return { output: "[read_file for '" + filePath + "'] Result: Error - " + (result.error || '') };
  }

  const data = result.data || {};
  const content = data.content || '';
  let output = "[read_file for '" + filePath + "'] Result:\n```\n" + content;

  if (data.diagnostics && data.diagnostics.length > 0) {
    const errors = data.diagnostics.filter((d: any) => d.severity === 'Error');
    const warnings = data.diagnostics.filter((d: any) => d.severity === 'Warning');
    output +=
      '\n\n**Summary:** ' + errors.length + ' error(s), ' + warnings.length + ' warning(s)\n\n';
    if (errors.length > 0) {
      output += '### Errors (' + errors.length + ')\n';
      errors.forEach((d: any, i: number) => {
        output +=
          i +
          1 +
          '. `' +
          (d.message || '') +
          '` **Line ' +
          (d.line || 0) +
          '**: ' +
          (d.message || '') +
          '\n';
      });
    }
    if (warnings.length > 0) {
      output += '### Warnings (' + warnings.length + ')\n';
      warnings.forEach((d: any, i: number) => {
        output +=
          i +
          1 +
          '. `' +
          (d.message || '') +
          '` **Line ' +
          (d.line || 0) +
          '**: ' +
          (d.message || '') +
          '\n';
      });
    }
  }

  output += '\n```';
  return { output, diagnostics: data.diagnostics };
}

// ===== ReplaceInFileExecutor =====

export async function executeReplaceInFile(
  params: ReplaceInFileParams,
  skipDiagnostics: boolean = false,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool(
    'replace_in_file',
    {
      path: filePath,
      old_str: params.old_content,
      new_str: params.new_content,
    },
    { skipDiagnostics, conversationId, actionId },
  );

  if (!result.success) {
    return "[replace_in_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[replace_in_file for '" + filePath + "'] Result: File updated successfully";
}

// ===== RevertFileExecutor =====

export async function executeRevertFile(
  params: RevertFileParams,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool(
    'revert_file',
    {
      file_path: filePath,
      version: (params as any).version,
    },
    { conversationId, actionId },
  );

  if (!result.success) {
    return "[revert_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[revert_file for '" + filePath + "'] Result: File reverted successfully";
}

// ===== RunCommandExecutor =====

export const executeRunCommand = async (
  params: RunCommandParams,
  actionId: string,
): Promise<string | null> => {
  const result = await CodeController.executeTool(
    'run_command',
    {
      commandText: params.command,
      folderPath: (params as any).folder_path || (params as any).folderPath,
    },
    { actionId },
  );

  if (!result.success) {
    return '[run_command] Result: Error - ' + (result.error || '');
  }
  // run_command là fire-and-forget, kết quả đến qua listener
  return '[run_command] Result: Command sent to terminal';
};

// ===== ViewReplaceHistoryExecutor =====

export interface ViewReplaceHistoryParams {
  file_path?: string;
  filePath?: string;
  path?: string;
}

export async function executeViewReplaceHistory(
  params: ViewReplaceHistoryParams,
  _conversationId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || params.filePath || '';
  const result = await CodeController.executeTool('view_replace_history', { filePath });

  if (!result.success) {
    return "[view_replace_history for '" + filePath + "'] Result: Error - " + (result.error || '');
  }

  const data = result.data || {};
  const histories = data.history || [];

  if (histories.length === 0) {
    return (
      "[view_replace_history for '" + filePath + "'] Result: No replace_in_file history found."
    );
  }

  let output =
    "[view_replace_history for '" + filePath + "'] Found " + histories.length + ' version(s):\n\n';
  histories.forEach((h: any, index: number) => {
    const date = new Date(h.timestamp).toLocaleString();
    output += '**Version ' + h.version + '**\n';
    output += '- Errors: ' + h.errorCount + ', Warnings: ' + h.warningCount + '\n';
    output += '- Date: ' + date + '\n';
    if (index < histories.length - 1) output += '\n';
  });

  return output;
}

// ===== WriteToFileExecutor =====

export async function executeWriteToFile(
  params: WriteToFileParams,
  skipDiagnostics: boolean = false,
  _bypassIgnore: boolean = false,
  conversationId?: string,
  actionId?: string,
): Promise<string | null> {
  const filePath = params.path || params.file_path || '';
  const result = await CodeController.executeTool(
    'write_to_file',
    {
      path: filePath,
      content: params.content || '',
    },
    { skipDiagnostics, conversationId, actionId },
  );

  if (!result.success) {
    return "[write_to_file for '" + filePath + "'] Result: Error - " + (result.error || '');
  }
  return "[write_to_file for '" + filePath + "'] Result: File written successfully";
}
