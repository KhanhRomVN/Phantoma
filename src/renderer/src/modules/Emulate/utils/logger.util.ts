/* eslint-disable no-console */
const isDevelopment = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDevelopment) console.log(...args);
  },
  info: (...args: unknown[]): void => {
    if (isDevelopment) console.info(...args);
  },
  debug: (...args: unknown[]): void => {
    if (isDevelopment) console.debug(...args);
  },
  warn: (...args: unknown[]): void => console.warn(...args),
  error: (...args: unknown[]): void => console.error(...args),
};