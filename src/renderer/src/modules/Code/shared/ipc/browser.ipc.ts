const api = () => (window as any).api;

type Listener = (event: any, ...args: any[]) => void;

export const browserIpc = {
  canSend: (): boolean => Boolean(api()?.send),
  canListen: (): boolean => Boolean(api()?.on),
  canInvoke: (): boolean => Boolean(api()?.invoke),
  invoke: (channel: string, ...args: unknown[]): Promise<any> => api().invoke(channel, ...args),
  send: (channel: string, ...args: unknown[]): void => api()?.send(channel, ...args),
  listen: (channel: string, listener: Listener): void => api().on(channel, listener),
  unlisten: (channel: string, listener: Listener): void => api().off(channel, listener),
};