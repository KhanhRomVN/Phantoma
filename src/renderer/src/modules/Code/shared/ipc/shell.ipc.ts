const api = () => (window as any).api;

export const shellIpc = {
  openPath: (target: string): Promise<any> => api().invoke('shell:open-path', target),
  openExternal: (url: string): Promise<any> => api().invoke('shell:open-external', url),
  openFolder: (payload: { path: string }): Promise<any> => api().invoke('openFolder', payload),
  openPrExternal: (url: string): Promise<any> => api().invoke('pr:open-external', url),
};