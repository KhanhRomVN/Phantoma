import type { PlatformFamily } from '../types/platform.type';

export const PLATFORM: PlatformFamily =
  process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

export const isWindows = PLATFORM === 'windows';
export const isMacOS = PLATFORM === 'macos';
export const isLinux = PLATFORM === 'linux';
