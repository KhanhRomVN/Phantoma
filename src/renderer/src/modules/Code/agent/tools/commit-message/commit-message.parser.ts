import { extractParamValue } from '@renderer/components/Widgets/Zen/feature/Chat/utils/toolParser';

export interface CommitMessageParams {
  message?: string;
}

/**
 * Parse commit_message tag from AI response
 * Format: <commit_message><message>...</message></commit_message>
 */
export function parseCommitMessage(innerContent: string): CommitMessageParams {
  const params: CommitMessageParams = {};

  const messageParam = extractParamValue(innerContent, 'message');
  if (messageParam) {
    params.message = messageParam;
  }

  if (!params.message && innerContent.trim()) {
    params.message = innerContent.trim();
  }

  return params;
}