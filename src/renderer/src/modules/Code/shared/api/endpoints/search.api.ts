import { request } from '../client';
import { resolveCodeBaseUrl } from '../code-base-url';

export const searchApi = {
  stream: async (
    searchId: string,
    projectPath: string,
    query: string,
    options: {
      caseSensitive?: boolean;
      wholeWord?: boolean;
      isRegex?: boolean;
      includePattern?: string;
      excludePattern?: string;
    },
    onChunk: (
      results: Array<{
        file: string;
        matches: Array<{ lineNumber: number; lineContent: string; column: number }>;
      }>,
    ) => void,
    onDone: (result: {
      totalMatches: number;
      totalFiles: number;
      truncated: boolean;
      error?: string;
    }) => void,
  ): Promise<void> => {
    const params = new URLSearchParams({
      searchId,
      projectPath,
      query,
      caseSensitive: String(options.caseSensitive ?? false),
      wholeWord: String(options.wholeWord ?? false),
      isRegex: String(options.isRegex ?? false),
    });
    if (options.includePattern) params.set('includePattern', options.includePattern);
    if (options.excludePattern) params.set('excludePattern', options.excludePattern);

    const url = `${await resolveCodeBaseUrl()}/api/v1/search/stream?${params.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener('chunk', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.searchId === searchId && data.results) {
          onChunk(data.results);
        }
      } catch (err) {
        console.error('[codeApi.search.stream] Failed to parse chunk:', err);
      }
    });

    eventSource.addEventListener('done', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.searchId === searchId) {
          onDone({
            totalMatches: data.totalMatches ?? 0,
            totalFiles: data.totalFiles ?? 0,
            truncated: data.truncated ?? false,
            error: data.error,
          });
        }
      } catch (err) {
        console.error('[codeApi.search.stream] Failed to parse done:', err);
      }
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
      onDone({ totalMatches: 0, totalFiles: 0, truncated: false, error: 'Connection lost' });
    };
  },

  cancel: (searchId: string) =>
    request<{ cancelled: boolean }>('POST', '/search/cancel', { searchId }),
};
