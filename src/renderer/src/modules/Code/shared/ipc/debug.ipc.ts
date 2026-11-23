const api = () => (window as any).api;

export const debugIpc = {
  raw: (): any => api(),
  invoke: (channel: `debug:${string}`, ...args: unknown[]): Promise<any> => api().invoke(channel, ...args),
  createLaunch: (projectPath: string): Promise<any> => api().invoke('debug:create-launch', projectPath),
};