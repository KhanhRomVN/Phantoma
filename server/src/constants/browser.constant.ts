import type { ForkDef, ForkSource } from '../types/browser.type';

export const EXE_NAME = process.platform === 'win32' ? 'chrome.exe' : 'chrome';

export const LATEST_TTL_MS = 10 * 60 * 1000;
export const ERROR_TTL_MS = 60 * 1000;
export const VERSION_RE = /^\d+\.\d+\.\d+\.\d+-\d+$/;

// Thêm 1 fork = thêm 1 entry ở đây; binary được tìm trong
// <dataDir>/binaries/<id>/<dirPrefix>-<version>/ và systemDirs (bản mới nhất thắng).
export const FORK_DEFS: ForkDef[] = [
  {
    id: 'ungoogled',
    name: 'Ungoogled Chromium',
    desc: 'Chromium without Google services, privacy first',
    badge: 'Privacy',
    tone: 'success',
    url: 'https://ungoogled-software.github.io/',
    dirPrefix: 'ungoogled-chromium',
    systemDirs: ['/opt/ungoogled-chromium'],
  },
];

// Thêm 1 fork có thể tải = thêm 1 entry ở đây (cùng id với FORK_DEFS).
// ASSUMED: hiện chỉ có bản portable Linux x64 — mở rộng sang Windows/macOS
// bằng cách thêm source + bước giải nén riêng.
export const FORK_SOURCES: Record<string, ForkSource> = {
  ungoogled: {
    listUrl:
      'https://ungoogled-software.github.io/ungoogled-chromium-binaries/releases/linux_portable/64bit/',
    downloadUrl: (v) =>
      `https://github.com/ungoogled-software/ungoogled-chromium-portablelinux/releases/download/${v}/ungoogled-chromium-${v}-x86_64_linux.tar.xz`,
  },
};
