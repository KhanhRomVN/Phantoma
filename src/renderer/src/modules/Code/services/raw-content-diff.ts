/**
 * ------------------------------------------------------------------
 * Raw Content Diff Extractor
 * ------------------------------------------------------------------
 * Extract diff stats từ raw XML content cho Code module tools.
 * Dùng cho streaming messages khi parsed actions chưa có.
 * ------------------------------------------------------------------
 */

import type { RawContentDiffExtractor } from '@renderer/components/RightPanel/Zen/feature/Chat/types/tool-mutation';

const countLines = (text: string | undefined): number => {
  if (!text) return 0;
  return text.split('\n').length;
};

/**
 * Extract diff stats from raw XML content for Code module.
 * Handles write_to_file, replace_in_file, and revert_file.
 */
export const extractCodeRawContentDiff: RawContentDiffExtractor = (content: string) => {
  const fileChanges = new Map<string, { additions: number; deletions: number }>();

  // Match write_to_file
  const writeMatches = content.matchAll(
    /<write_to_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<content[^>]*?>([\s\S]*?)<\/content>[\s\S]*?<\/write_to_file>/gi,
  );
  for (const match of writeMatches) {
    const filePath = match[1]?.trim();
    const fileContent = match[2] || '';
    if (filePath) {
      if (!fileChanges.has(filePath)) {
        fileChanges.set(filePath, { additions: 0, deletions: 0 });
      }
      const stats = fileChanges.get(filePath)!;
      stats.additions += countLines(fileContent);
    }
  }

  // Match replace_in_file
  const replaceMatches = content.matchAll(
    /<replace_in_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<old_content[^>]*?>([\s\S]*?)<\/old_content>[\s\S]*?<new_content[^>]*?>([\s\S]*?)<\/new_content>[\s\S]*?<\/replace_in_file>/gi,
  );
  for (const match of replaceMatches) {
    const filePath = match[1]?.trim();
    const oldContent = match[2] || '';
    const newContent = match[3] || '';
    if (filePath) {
      if (!fileChanges.has(filePath)) {
        fileChanges.set(filePath, { additions: 0, deletions: 0 });
      }
      const stats = fileChanges.get(filePath)!;
      stats.deletions += countLines(oldContent);
      stats.additions += countLines(newContent);
    }
  }

  // Match revert_file and SUBTRACT
  const revertMatches = content.matchAll(
    /<revert_file[^>]*?>[\s\S]*?<file_path[^>]*?>(.*?)<\/file_path>[\s\S]*?<\/revert_file>/gi,
  );
  for (const match of revertMatches) {
    const filePath = match[1]?.trim();
    if (filePath && fileChanges.has(filePath)) {
      const stats = fileChanges.get(filePath)!;
      stats.additions = 0;
      stats.deletions = 0;
    }
  }

  return fileChanges;
};