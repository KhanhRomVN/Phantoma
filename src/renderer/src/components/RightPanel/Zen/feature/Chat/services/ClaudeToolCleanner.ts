export interface CleanClaudeToolResult {
  content: string;
  removedCount: number;
}

const CLAUDE_TOOL_RE = /__CLAUDE_TOOL__:[\s\S]*?__END_TOOL__[ \t]*\r?\n?/g;

export const hasClaudeToolMarker = (content: string): boolean =>
  content.includes('__CLAUDE_TOOL__:') && content.includes('__END_TOOL__');

export const cleanClaudeToolContent = (content: string): CleanClaudeToolResult => {
  if (!hasClaudeToolMarker(content)) {
    return { content, removedCount: 0 };
  }

  let removedCount = 0;
  const cleaned = content.replace(CLAUDE_TOOL_RE, () => {
    removedCount++;
    return '';
  });

  return { content: removedCount > 0 ? cleaned.replace(/^\s+/, '') : content, removedCount };
};