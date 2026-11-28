import { useEffect, useMemo, useState } from 'react';
import type { FootprintPreset } from '@renderer/services/fingerprint-generator';
import { DEFAULT_FLAGS } from '../constants/launch.constants';
import { profileApi } from '../../../shared/api/profile.api';
import type {
  BrowserEngine,
  DetailTab,
  Fork,
  NetworkFootprint,
  Profile,
  ProxyItem,
} from '../../../shared/types';

function latestFootprint(profile: Profile): NetworkFootprint | null {
  if (profile.footprints.length === 0) return null;
  return [...profile.footprints].sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt))[0];
}

function useBrowserForks() {
  const [forks, setForks] = useState<Fork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    profileApi.browser
      .forks()
      .then((list) => alive && setForks(list as Fork[]))
      .catch(() => alive && setForks([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { forks, loading };
}

export function useLaunchConfig(profile: Profile) {
  const [engine, setEngine] = useState<BrowserEngine>('chrome');
  const [selectedForkId, setForkId] = useState('');
  const [preset, setPreset] = useState<FootprintPreset | null>(null);
  const [proxy, setProxy] = useState<ProxyItem | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('proxy');
  const [flags, setFlags] = useState<Record<string, boolean>>(DEFAULT_FLAGS);
  const { forks, loading: loadingForks } = useBrowserForks();

  const isChrome = engine === 'chrome';
  const fork = forks.find((f) => f.id === selectedForkId) ?? forks.find((f) => f.installed) ?? forks[0] ?? null;
  const forkId = fork?.id ?? '';
  const footprint = useMemo(() => latestFootprint(profile), [profile]);

  const selectChrome = (): void => setEngine('chrome');
  const selectFork = (id: string): void => {
    setEngine('chromium');
    setForkId(id);
  };
  const setFlag = (id: string, v: boolean): void => setFlags((f) => ({ ...f, [id]: v }));

  const summary = isChrome
    ? ['Chrome', 'Real footprint', 'No proxy']
    : [fork?.name ?? 'Chromium', proxy ? `${proxy.protocol} ${proxy.host}` : 'Direct', preset?.name ?? 'System footprint'];

  return {
    isChrome,
    fork,
    forks,
    loadingForks,
    forkId,
    footprint,
    preset,
    setPreset,
    proxy,
    setProxy,
    detailTab,
    setDetailTab,
    flags,
    setFlag,
    selectChrome,
    selectFork,
    summary,
  };
}