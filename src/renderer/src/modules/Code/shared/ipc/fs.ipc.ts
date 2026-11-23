const api = () => (window as any).api;

export const fsIpc = {
  writeFile: (filePath: string, content: string): Promise<any> => api().invoke('fs:write-file', filePath, content),
  validatePaths: (paths: string[]): Promise<any> => api().invoke('fs:validate-paths', paths),
  getHomedir: (): Promise<any> => api().invoke('fs:get-homedir'),
  replaceAll: (files: string[], query: string, replacement: string, options: unknown): Promise<any> =>
    api().invoke('fs:replace-all', files, query, replacement, options),
};