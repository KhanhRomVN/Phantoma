
const METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

const stringify = (v: unknown): string => {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.stack ?? v.message;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

let installed = false;

export const installChatConsoleCapture = (): void => {
  if (installed || !import.meta.env.DEV) return;
  installed = true;
  for (const method of METHODS) {
    const original = console[method].bind(console);
    console[method] = (...args: unknown[]) => {
      original(...args);

      window.api
        .invoke('chat-log:append', method.toUpperCase(), args.map(stringify).join(' '))
        .catch(() => {});
    };
  }
};