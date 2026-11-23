const api = () => (window as any).api;

export const dialogIpc = {
  selectPaths: (options: { kind: 'file' | 'folder'; multiple?: boolean; [key: string]: unknown }): Promise<any> =>
    api().invoke('dialog:select-paths', options),
  showSave: (options: { defaultPath?: string; [key: string]: unknown }): Promise<any> =>
    api().invoke('dialog:show-save', options),
};