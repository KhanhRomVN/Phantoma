/**
 * ------------------------------------------------------------------
 * useZenUpdate
 * ------------------------------------------------------------------
 * Kiểm tra bản release mới nhất của Zen trên GitHub và so với version
 * đang chạy (window.__zenVersion).
 *
 * - useZenUpdate(): UpdateInfo khi có bản mới hơn, ngược lại null.
 * - Chỉ cache kết quả thành công; lỗi mạng/timeout sẽ được retry ở lần mount sau.
 * ------------------------------------------------------------------
 */

import { useEffect, useState } from 'react';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
}

const GITHUB_LATEST_API = 'https://api.github.com/repos/KhanhRomVN/Zen/releases/latest';

// Cache theo session: chỉ lưu khi thành công (API không xác thực giới hạn 60 req/giờ).
let latestVersionPromise: Promise<string | null> | null = null;

function fetchLatestVersion(): Promise<string | null> {
  if (!latestVersionPromise) {
    const request = (async () => {
      try {
        const res = await fetch(GITHUB_LATEST_API, {
          headers: { Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.tag_name === 'string' ? data.tag_name : null;
      } catch {
        return null;
      }
    })();
    latestVersionPromise = request;
    request.then((v) => {
      if (v === null && latestVersionPromise === request) latestVersionPromise = null;
    });
  }
  return latestVersionPromise;
}

/** Parse "v1.2.3" → [1,2,3]; trả null nếu không hợp lệ. Hậu tố prerelease bị bỏ qua ở bản current. */
function parseVersion(v: string): { parts: number[]; prerelease: boolean } | null {
  const m = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(-[0-9A-Za-z.-]+)?(?:\+.*)?$/.exec(v.trim());
  if (!m) return null;
  return {
    parts: [Number(m[1]), Number(m[2] ?? 0), Number(m[3] ?? 0)],
    prerelease: !!m[4],
  };
}

function isOutdated(current: string, latest: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  if (!a || !b || b.prerelease) return false;
  for (let i = 0; i < 3; i++) {
    if (b.parts[i] > a.parts[i]) return true;
    if (b.parts[i] < a.parts[i]) return false;
  }
  return false;
}

export function useZenUpdate(): UpdateInfo | null {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const rawVersion = (window as any).__zenVersion as string | undefined;
    if (!rawVersion) return;
    const currentVersion = `v${rawVersion.replace(/^v/, '')}`;

    let cancelled = false;
    fetchLatestVersion().then((latestVersion) => {
      if (cancelled) return;
      if (latestVersion && isOutdated(currentVersion, latestVersion)) {
        setUpdateInfo({ currentVersion, latestVersion });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return updateInfo;
}
