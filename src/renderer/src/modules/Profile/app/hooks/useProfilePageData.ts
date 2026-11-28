import { useCallback, useEffect, useMemo, useState } from 'react';
import { toastService } from '@renderer/components/ui/Toast';
import { profileApi } from '../../shared/api/profile.api';
import type { Profile as ProfileRecord, ProfileSource, SourceStats } from '../../shared/types';
import { useProfileViewStore } from '../../features/profiles';
import { computeSecurity } from '../../features/security';
import { useServiceStore } from '../../features/services';
import { ALL_SOURCES_ID } from '../../features/sources';

export function useProfilePageData() {
  const [sources, setSources] = useState<ProfileSource[]>([]);
  const [rawProfiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string>(
    () => useProfileViewStore.getState().activeSourceId ?? ALL_SOURCES_ID,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () => useProfileViewStore.getState().selectedId,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storedLinks = useServiceStore((s) => s.links);
  // ASSUMED: links edited in ProfileDrawer live in useServiceStore, so they override profile.services for table/stats
  const profiles = useMemo(
    () => rawProfiles.map((p) => (storedLinks[p.id] ? { ...p, services: storedLinks[p.id] } : p)),
    [rawProfiles, storedLinks],
  );

  const reload = useCallback(async (): Promise<void> => {
    try {
      const [loadedSources, loadedProfiles] = await Promise.all([
        profileApi.sources.list(),
        profileApi.profiles.list({ full: true }),
      ]);
      setSources(loadedSources);
      setProfiles(loadedProfiles);
      setActiveSourceId((prev) =>
        (prev === ALL_SOURCES_ID &&
          useProfileViewStore.getState().activeSourceId === ALL_SOURCES_ID) ||
        (prev !== ALL_SOURCES_ID && loadedSources.some((s) => s.id === prev))
          ? prev
          : (loadedSources[0]?.id ?? ALL_SOURCES_ID),
      );
      setSelectedId((prev) => (prev && loadedProfiles.some((p) => p.id === prev) ? prev : null));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toastService.show({ variant: 'error', title: 'Cannot load profiles', description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await profileApi.system.syncSources();
      } catch {
        // sync lỗi thì vẫn reload bình thường
      }
      await reload();
    })();
  }, [reload]);

  useEffect(() => {
    let last = 0;
    const onFocus = (): void => {
      if (Date.now() - last < 2000) return;
      last = Date.now();
      void reload();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const run = useCallback(async (task: () => Promise<void>): Promise<void> => {
    try {
      await task();
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toastService.show({ variant: 'error', title: 'Action failed', description: message });
    }
  }, []);

  const sourcesView = useMemo(
    () => sources.map((s) => ({ ...s, count: profiles.filter((p) => p.sourceId === s.id).length })),
    [sources, profiles],
  );

  const sourceNames = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.id, s.name])),
    [sources],
  );

  const sourceStats = useMemo(() => {
    const result: Record<string, SourceStats> = {};
    for (const s of sources) {
      const list = profiles.filter((p) => p.sourceId === s.id);
      const scores = list.map((p) => computeSecurity(p).score);
      result[s.id] = {
        active: list.filter((p) => p.status === 'active').length,
        avgSecurity: scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
        lowSecurity: scores.filter((sc) => sc < 60).length,
        unsynced: list.filter((p) => p.chromeSync !== 'synced').length,
        bannedServices: list.filter((p) => p.services.some((sv) => sv.status === 'banned')).length,
      };
    }
    return result;
  }, [sources, profiles]);

  const existingEmails = useMemo(() => profiles.map((p) => p.email), [profiles]);

  const groupNames = useMemo(
    () => Array.from(new Set(profiles.map((p) => p.group))).sort(),
    [profiles],
  );

  const sourceProfiles = useMemo(
    () =>
      activeSourceId === ALL_SOURCES_ID
        ? profiles
        : profiles.filter((p) => p.sourceId === activeSourceId),
    [profiles, activeSourceId],
  );

  const groups = useMemo(() => {
    const info = new Map<string, string>();
    profiles.forEach((p) => {
      if (!info.has(p.group)) info.set(p.group, p.purpose);
    });
    return Array.from(info, ([name, purpose]) => ({
      name,
      purpose,
      count: sourceProfiles.filter((p) => p.group === name).length,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, sourceProfiles]);

  return {
    sources,
    setSources,
    profiles,
    setProfiles,
    loading,
    error,
    run,
    reload,
    activeSourceId,
    setActiveSourceId,
    selectedId,
    setSelectedId,
    sourcesView,
    sourceNames,
    sourceStats,
    existingEmails,
    groupNames,
    sourceProfiles,
    groups,
  };
}
