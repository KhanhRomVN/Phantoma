import React, { useEffect, useState } from 'react';

const MAX_CACHE = 200;
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

function loadLogo(filePath: string, side: number): Promise<string | null> {
  const key = `${side}:${filePath}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);

  let promise = pending.get(key);
  if (!promise) {
    promise = (window.api.invoke('fs:read-image-data-url', filePath, side) as Promise<string | null>)
      .catch(() => null)
      .then((url) => {
        if (cache.size >= MAX_CACHE) cache.clear();
        cache.set(key, url);
        pending.delete(key);
        return url;
      });
    pending.set(key, promise);
  }
  return promise;
}

interface ProjectLogoImageProps {
  path: string;
  side?: number;
  className?: string;
  fallback?: React.ReactNode;
}

export function ProjectLogoImage({ path, side = 96, className, fallback = null }: ProjectLogoImageProps) {
  const [src, setSrc] = useState<string | null>(() => cache.get(`${side}:${path}`) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadLogo(path, side).then((url) => {
      if (!alive) return;
      if (url) setSrc(url);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [path, side]);

  if (failed || !src) return <>{fallback}</>;
  return <img src={src} alt="" draggable={false} className={className} />;
}