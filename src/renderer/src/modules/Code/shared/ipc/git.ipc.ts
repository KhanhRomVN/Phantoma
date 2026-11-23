const api = () => (window as any).api;

type Listener = (event: any, ...args: any[]) => void;

export const gitIpc = {
  invoke: (channel: string, ...args: unknown[]): Promise<any> => api().invoke(channel, ...args),
  on: (channel: string, listener: Listener): (() => void) => {
    const off = api().on(channel, listener);
    return typeof off === 'function' ? off : () => api().off(channel, listener);
  },
};