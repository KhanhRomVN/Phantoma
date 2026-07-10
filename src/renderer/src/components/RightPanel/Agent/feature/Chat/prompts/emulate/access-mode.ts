export const buildAccessModePrompt = (mode: string): string => {
  const isReadOnly = mode === 'readOnly';
  const category = isReadOnly ? 'read-only' : 'action';

  return `# PERMISSION MODE: ${mode} (${category})

Both modes (readOnly and fullAccess/approval) allow the use of \`list_https\` and \`get_https_detail\`, as these are the only 2 tools — they are read-only operations on already-captured traffic data, with no write or modification capabilities.

Permission mode here only reflects the current status and does not impose additional restrictions beyond the 2 available tools.`;
};
