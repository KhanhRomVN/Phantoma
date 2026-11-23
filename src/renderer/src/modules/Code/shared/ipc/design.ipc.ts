const api = () => (window as any).api;

export const designIpc = {
  list: (projectPath: string): Promise<any> => api().invoke('design:list', projectPath),
  create: (projectPath: string, input: unknown): Promise<any> => api().invoke('design:create', projectPath, input),
  remove: (projectPath: string, designId: string): Promise<any> =>
    api().invoke('design:delete', projectPath, designId),
  update: (projectPath: string, designId: string, graph: unknown): Promise<any> =>
    api().invoke('design:update', projectPath, designId, graph),
};