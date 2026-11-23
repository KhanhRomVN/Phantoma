import { extractParamValue } from '@renderer/components/Widgets/Zen/screens/Chat/utils/toolParser';
import type { GitDiffParams } from '../tool.types';

/**
 * Parse git_diff tag from AI response
 * Format: <git_diff><file_path>...</file_path></git_diff>
 * According to tools-reference.ts: file_path is optional
 */
export function parseGitDiff(innerContent: string): GitDiffParams {
  const params: GitDiffParams = {};

  // Extract file_path (optional according to schema)
  params.file_path = extractParamValue(innerContent, 'file_path') ?? undefined;

  return params;
}
