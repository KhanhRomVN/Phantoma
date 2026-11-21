/**
 * ------------------------------------------------------------------
 * Shared runtime ports
 * ------------------------------------------------------------------
 * Nguồn duy nhất cho port của các server con. Dev dùng default cố định
 * (server chạy ngoài). Build main process chọn port trống ngẫu nhiên
 * rồi ghi đè qua IPC; renderer đọc lại bằng getRuntimePorts().
 * ------------------------------------------------------------------
 */

export const DEFAULT_SERVER_PORT = 8080;
export const DEFAULT_EMULATE_PORT = 3002;
export const DEFAULT_PROFILE_PORT = 3033;
export const DEFAULT_PROXY_PORT = 3044;
export const DEFAULT_CODE_PORT = 3055;

export interface RuntimePorts {
  server: number;
  emulate: number;
  profile: number;
  proxy?: number;
  code?: number;
}

// Dev: port cố định. Build: sẽ được main điền sau khi spawn.
export const DEV_PORTS: RuntimePorts = {
  server: DEFAULT_SERVER_PORT,
  emulate: DEFAULT_EMULATE_PORT,
  profile: DEFAULT_PROFILE_PORT,
  proxy: DEFAULT_PROXY_PORT,
  code: DEFAULT_CODE_PORT,
};

export function serverBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}

export function emulateBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}

export function profileBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}

export function proxyBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}

export function codeBaseUrl(port: number): string {
  return `http://localhost:${port}`;
}