import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileSkeleton } from './components/ProfileSkeleton';
import { ArrowRightLeft, FolderInput, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@renderer/components/ui/Button';
import { profileApi } from './services/profile-api.service';
import { useServiceStore } from './stores/useServiceStore';
import { useProfileViewStore } from './stores/useProfileViewStore';
import type { ProfileInput } from './services/profile-api.service';
import { computeSecurity } from './utils/security';
import type { SourceStats } from './types/source.types';
import type { Profile as ProfileRecord, ProfileSource } from './types';
import { compileQuery } from './utils/query';
import { DEFAULT_QUICK_FILTERS, focusService, matchQuickFilters } from './utils/filter';
import type { QuickFilters } from './utils/filter';
import { savedQueryText } from './utils/queryBuilder';
import type { SavedQuery } from './utils/queryBuilder';
import { SourceBar } from './components/SourceBar';

import { ProfileEmpty } from './components/ProfileEmpty';
import { ALL_SOURCES_ID } from './constants/source';
import { ProfileToolPanel } from './components/ProfileToolPanel';



import { StatSection } from './components/StatSection';
import { ProfileTable } from './components/ProfileTable';
import { ProfileDrawer } from './components/ProfileDrawer/ProfileDrawer';
import type { DrawerFocus } from './components/ProfileDrawer/ProfileDrawer';
import { SourceModal } from './components/modal/SourceModal';
import type { ImportSourceDraft, SourceDraft } from './components/modal/SourceModal';
import { CreateProfileModal } from './components/modal/CreateProfileModal';
import type { ProfileDraft } from './components/modal/CreateProfileModal';
import { ImportModal } from './components/modal/ImportModal';
import type { ImportResult, ImportRowDraft } from './components/modal/ImportModal';
import { GroupModal } from './components/modal/GroupModal';
import type { GroupDraft } from './components/modal/GroupModal';
import { SourceTransferModal } from './components/modal/SourceTransferModal';

import { ConfirmDeleteProfileModal } from './components/modal/ConfirmDeleteProfileModal';
import { ConfirmStopBrowserModal } from './components/modal/ConfirmStopBrowserModal';
import { notifyBrowserChanged, useRunningBrowsers } from './hooks/useRunningBrowsers';

export interface ProfileProps {
  activeAppId?: string;
}

const SOFT_BTN =
  'rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary active:bg-text-secondary/20';
const SOFT_ERROR_BTN = 'rounded-md bg-error/15 text-error hover:bg-error/20 active:bg-error/25';

type DialogKind = 'source' | 'import' | 'profile' | 'group' | 'transfer' | 'delete';

function toProfileInput(
  draft: ImportRowDraft,
  sourceId: string,
): ProfileInput & { sourceId: string; email: string } {
  const hue = Array.from(draft.email).reduce((h, ch) => h + ch.charCodeAt(0), 0) % 360;
  return {
    sourceId,
    email: draft.email,
    displayName: draft.displayName,
    avatarHue: hue,
    recoveryEmail: draft.recoveryEmail || null,
    phone: draft.phone || null,
    totpEnabled: !!draft.totpSecret,
    totpSecret: draft.totpSecret || null,
    backupCodes: draft.backupCodes.map((code) => ({ code, used: false })),
    passwordStrength: draft.passwordStrength,
    group: draft.group,
    purpose: draft.purpose,
    notes: draft.notes,
    lastActive: new Date().toISOString(),
  };
}

export function Profile({}: ProfileProps) {
  const [sources, setSources] = useState<ProfileSource[]>([]);
  const [rawProfiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<DrawerFocus | null>(null);
  const [editSourceId, setEditSourceId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string>(
    () => useProfileViewStore.getState().activeSourceId ?? ALL_SOURCES_ID,
  );
  const [filters, setFilters] = useState<QuickFilters>(() => ({
    ...DEFAULT_QUICK_FILTERS,
    search: useProfileViewStore.getState().search,
  }));
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
  const [previewQuery, setPreviewQuery] = useState<SavedQuery | null>(null);
  const [queryDrawer, setQueryDrawer] = useState<{ editId: string | null } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => useProfileViewStore.getState().selectedId,
  );
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [stopId, setStopId] = useState<string | null>(null);
  const { running, runningIds } = useRunningBrowsers();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const storedLinks = useServiceStore((s) => s.links);
  // ASSUMED: links edited in ProfileDrawer live in useServiceStore, so they override profile.services for table/stats
  const profiles = useMemo(
    () => rawProfiles.map((p) => (storedLinks[p.id] ? { ...p, services: storedLinks[p.id] } : p)),
    [rawProfiles, storedLinks],
  );

  useEffect(() => {
    if (loading) return;
    useProfileViewStore.getState().setView({
      activeSourceId,
      search: filters.search,
      selectedId,
    });
  }, [loading, activeSourceId, filters.search, selectedId]);

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
      setError(err instanceof Error ? err.message : String(err));
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
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void run(async () => {
      setQueries(await profileApi.queries.list());
    });
  }, [run]);

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

  const activeQuery = useMemo(
    () => queries.find((q) => q.id === activeQueryId) ?? null,
    [queries, activeQueryId],
  );

  const activeCompiled = useMemo(() => {
    const shown = previewQuery ?? activeQuery;
    if (!shown) return null;
    const text = savedQueryText(shown);
    if (!text) return null;
    const c = compileQuery(text);
    return c.ok ? c : null;
  }, [activeQuery, previewQuery]);

  const visible = useMemo(
    () =>
      sourceProfiles.filter(
        (p) => matchQuickFilters(p, filters) && (!activeCompiled || activeCompiled.match(p)),
      ),
    [sourceProfiles, filters, activeCompiled],
  );

  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId],
  );

  // ASSUMED: duplicates are matched client-side by case-insensitive email across all loaded sources
  const duplicates = useMemo(() => {
    if (!selected) return [];
    const key = selected.email.trim().toLowerCase();
    const result = profiles
      .filter(
        (p) =>
          p.id !== selected.id &&
          p.sourceId !== selected.sourceId &&
          p.email.trim().toLowerCase() === key,
      )
      .map((p) => ({ profile: p, source: sources.find((s) => s.id === p.sourceId) }));
    return result;
  }, [profiles, sources, selected]);

  const openDuplicate = useCallback(
    (profileId: string) => {
      const target = profiles.find((p) => p.id === profileId);
      if (!target) return;
      setActiveSourceId(target.sourceId);
      setCheckedIds(new Set());
      setSelectedId(target.id);
    },
    [profiles],
  );

  const editingQuery = useMemo(
    () => (queryDrawer?.editId ? (queries.find((q) => q.id === queryDrawer.editId) ?? null) : null),
    [queries, queryDrawer],
  );

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setCheckedIds(checked ? new Set(visible.map((p) => p.id)) : new Set());
    },
    [visible],
  );

  const saveQuery = (q: SavedQuery): void => {
    void run(async () => {
      const input = { ...q, text: savedQueryText(q) };
      const saved = queries.some((x) => x.id === q.id)
        ? await profileApi.queries.update(q.id, input)
        : await profileApi.queries.create(input);
      setQueries((prev) =>
        prev.some((x) => x.id === saved.id) ? prev.map((x) => (x.id === saved.id ? saved : x)) : [...prev, saved],
      );
      setActiveQueryId(saved.id);
      setQueryDrawer(null);
    });
  };

  const deleteQuery = (id: string): void => {
    void run(async () => {
      await profileApi.queries.remove(id);
      setQueries((prev) => prev.filter((q) => q.id !== id));
      setActiveQueryId((prev) => (prev === id ? null : prev));
      setQueryDrawer((prev) => (prev?.editId === id ? null : prev));
    });
  };

  const createSource = (draft: SourceDraft): void => {
    void run(async () => {
      const source = await profileApi.sources.create({
        name: draft.name,
        type: draft.type,
        browsers: draft.browsers,
        description: draft.description,
        location: draft.location,
      });
      setSources((prev) => [...prev, source]);
      setActiveSourceId(source.id);
      setCheckedIds(new Set());
      setDialog(null);
    });
  };

  const updateSource = (draft: SourceDraft): void => {
    if (!editSourceId) return;
    void run(async () => {
      const updated = await profileApi.sources.update(editSourceId, {
        name: draft.name,
        location: draft.location,
      });
      setSources((prev) => prev.map((s) => (s.id === editSourceId ? updated : s)));
      setEditSourceId(null);
      setDialog(null);
    });
  };

  const importSource = (draft: ImportSourceDraft): void => {
    void run(async () => {
      const source = await profileApi.sources.import({
        name: draft.name,
        location: draft.location,
      });
      setSources((prev) => [...prev, source]);
      await reload();
      setActiveSourceId(source.id);
      setCheckedIds(new Set());
      setDialog(null);
    });
  };

  const unlinkSource = (id: string): void => {
    void run(async () => {
      await profileApi.sources.remove(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      setProfiles((prev) => prev.filter((p) => p.sourceId !== id));
      if (activeSourceId === id) {
        setActiveSourceId(sources.find((s) => s.id !== id)?.id ?? ALL_SOURCES_ID);
      }
      setCheckedIds(new Set());
      setSelectedId(null);
    });
  };

  const openProfileFolder = (profile: ProfileRecord): void => {
    void run(async () => {
      await profileApi.profiles.openFolder(profile.id);
    });
  };

  const createProfile = (draft: ProfileDraft): void => {
    void run(async () => {
      const record = await profileApi.profiles.create(toProfileInput(draft, draft.sourceId));
      setProfiles((prev) => [record, ...prev]);
      setSources((prev) =>
        prev.map((s) => (s.id === record.sourceId ? { ...s, count: s.count + 1 } : s)),
      );
      setActiveSourceId(draft.sourceId);
      setSelectedId(record.id);
      setQueryDrawer(null);
      setDialog(null);
    });
  };

  const importProfiles = ({ rows, target }: ImportResult): void => {
    void run(async () => {
      let sourceId: string;
      if (target.kind === 'new') {
        const source = await profileApi.sources.create({
          name: target.name,
          type: 'local',
          browsers: ['chrome'],
          description: 'Created from import',
        });
        setSources((prev) => [...prev, source]);
        sourceId = source.id;
      } else {
        sourceId = target.sourceId;
      }
      await profileApi.profiles.createMany(rows.map((r) => toProfileInput(r, sourceId)));
      await reload();
      setActiveSourceId(sourceId);
      setCheckedIds(new Set());
      setDialog(null);
    });
  };

  const checkedProfiles = profiles.filter((p) => checkedIds.has(p.id));

  const assignGroup = ({ name, purpose }: GroupDraft): void => {
    const ids = Array.from(checkedIds);
    const nextPurpose = purpose as ProfileRecord['purpose'];
    void run(async () => {
      await profileApi.profiles.updateMany({ ids }, { group: name, purpose: nextPurpose });
      setProfiles((prev) =>
        prev.map((p) => (checkedIds.has(p.id) ? { ...p, group: name, purpose: nextPurpose } : p)),
      );
      setDialog(null);
    });
  };

  const renameGroup = (oldName: string, { name, purpose }: GroupDraft): void => {
    const nextPurpose = purpose as ProfileRecord['purpose'];
    void run(async () => {
      await profileApi.profiles.updateMany(
        { where: { group: oldName } },
        { group: name, purpose: nextPurpose },
      );
      setProfiles((prev) =>
        prev.map((p) => (p.group === oldName ? { ...p, group: name, purpose: nextPurpose } : p)),
      );
    });
  };

  const deleteGroup = (name: string): void => {
    void run(async () => {
      await profileApi.profiles.updateMany({ where: { group: name } }, { group: 'Ungrouped' });
      setProfiles((prev) => prev.map((p) => (p.group === name ? { ...p, group: 'Ungrouped' } : p)));
    });
  };

  const afterTransfer = async (): Promise<void> => {
    await run(async () => {
      await reload();
      setCheckedIds(new Set());
      setDialog(null);
    });
  };

  const deleteTargets = profiles.filter((p) => deleteIds.includes(p.id));

  const stopTarget = profiles.find((p) => p.id === stopId) ?? null;
  const stopBrowser = running.find((r) => r.emailId === stopId)?.browser;

  const confirmStop = (): void => {
    const id = stopId;
    if (!id) return;
    void run(async () => {
      await profileApi.browser.stop(id);
      notifyBrowserChanged();
    });
  };

  const requestDelete = (ids: string[]): void => {
    setDeleteIds(ids);
    setDialog('delete');
  };

  const confirmDelete = (): void => {
    const gone = new Set(deleteIds);
    void run(async () => {
      await profileApi.profiles.removeMany(Array.from(gone));
      setProfiles((prev) => prev.filter((p) => !gone.has(p.id)));
      setSelectedId((prev) => (prev && gone.has(prev) ? null : prev));
      setCheckedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 [&>*]:animate-in [&>*]:fade-in-0 [&>*]:slide-in-from-bottom-2 [&>*]:duration-300 [&>*]:[animation-fill-mode:backwards] [&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms]">
        {loading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-md bg-error/10 px-3 py-2 text-xs text-error">
                <span className="min-w-0 truncate">{error}</span>
                <Button
                  className="rounded-md bg-text-secondary/10 text-text-secondary hover:bg-text-secondary/15 hover:text-text-primary"
                  onClick={() => void reload()}
                >
                  Retry
                </Button>
              </div>
            )}
            <SourceBar
              sources={sourcesView}
              activeId={activeSourceId}
              stats={sourceStats}
              onChange={(id) => {
                setActiveSourceId(id);
                setCheckedIds(new Set());
              }}
              onAddSource={() => {
                setEditSourceId(null);
                setDialog('source');
              }}

              onEditSource={(id) => {
                setEditSourceId(id);
                setDialog('source');
              }}
              onUnlinkSource={unlinkSource}
            />

            <StatSection profiles={sourceProfiles} />

            <ProfileToolPanel
              filters={filters}
              groups={groups}
              onChange={setFilters}
              profiles={sourceProfiles}
              onImport={() => setDialog('import')}

              onAddProfile={() => setDialog('profile')}
            />

            <div className="relative flex min-h-0 flex-1 flex-col">
              <ProfileTable
                profiles={visible}
                selectedId={selectedId}
                checkedIds={checkedIds}
                showSource={activeSourceId === ALL_SOURCES_ID}
                service={focusService(filters)}
                sourceNames={sourceNames}
                onSelect={(id, target) => {
                  setSelectedId(id);
                  setQueryDrawer(null);
                  setDrawerFocus(target ? { ...target, nonce: Date.now() } : null);
                }}
                onToggleCheck={toggleCheck}
                onToggleAll={toggleAll}
                filteredOut={sourceProfiles.length > 0}
                onClearFilters={() => {
                  setFilters(DEFAULT_QUICK_FILTERS);
                  setActiveQueryId(null);
                }}
                onAddProfile={() => setDialog('profile')}
                onOpenFolder={openProfileFolder}
                onDelete={(p) => requestDelete([p.id])}
                runningIds={runningIds}
                onStop={(p) => setStopId(p.id)}
              />

              <AnimatePresence>
                {checkedIds.size > 0 && (
                  <motion.div
                    key="bulk-actions"
                    initial={{ opacity: 0, y: 12, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 12, x: '-50%' }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute bottom-4 left-1/2 z-20 flex items-center gap-2 rounded-md border border-dashed border-primary bg-background px-3 py-2 shadow-lg"
                  >
                    <span className="px-1 text-xs font-medium tabular-nums text-text-primary">
                      {checkedIds.size} selected
                    </span>
                    <span className="h-4 w-px bg-border" />
                    <Button className={SOFT_BTN} onClick={() => setDialog('group')}>
                      <FolderInput className="h-3.5 w-3.5" />
                      Group
                    </Button>
                    {sources.length > 1 && (
                      <Button className={SOFT_BTN} onClick={() => setDialog('transfer')}>
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Duplicate/Move to source
                      </Button>
                    )}

                    <Button
                      className={SOFT_ERROR_BTN}
                      onClick={() => requestDelete(Array.from(checkedIds))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                    <button
                      type="button"
                      aria-label="Clear selection"
                      onClick={() => setCheckedIds(new Set())}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-text-secondary/10 text-text-secondary transition-colors hover:bg-text-secondary/15 hover:text-text-primary"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <aside className="flex h-full w-[36%] min-w-[460px] max-w-[600px] shrink-0 flex-col border-l border-border bg-panel-background">
        <motion.div
          key={queryDrawer ? 'query-' + (queryDrawer.editId ?? 'new') : (selected?.id ?? 'empty')}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex h-full min-h-0 w-full flex-col"
        >
          {selected ? (
            <ProfileDrawer
              key={selected.id}
              focus={drawerFocus}
              profile={selected}
              source={sources.find((s) => s.id === selected.sourceId)}
              duplicates={duplicates}
              onOpenDuplicate={openDuplicate}
              onUpdate={(patch) => {
                setProfiles((prev) => {
                  const next = prev.map((p) => (p.id === selected.id ? { ...p, ...patch } : p));
                  return next;
                });
              }}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <ProfileEmpty
              onAddProfile={() => setDialog('profile')}
              onImport={() => setDialog('import')}
            />
          )}
        </motion.div>
      </aside>

      {dialog === 'source' && (
        <SourceModal
          isOpen
          onClose={() => {
            setEditSourceId(null);
            setDialog(null);
          }}
          existingNames={sources.filter((s) => s.id !== editSourceId).map((s) => s.name)}
          existingLocations={sources
            .filter((s) => s.id !== editSourceId)
            .flatMap((s) => (s.location ? [s.location] : []))}
          onCreate={editSourceId ? updateSource : createSource}
          onImport={importSource}
          initial={(() => {
            const s = sources.find((x) => x.id === editSourceId);
            return s
              ? {
                  name: s.name,
                  type: s.type,
                  location: s.location ?? '',
                  browsers: s.browsers,
                  description: s.description,
                }
              : undefined;
          })()}
        />
      )}

      {dialog === 'profile' && (
        <CreateProfileModal
          isOpen
          onClose={() => setDialog(null)}
          sources={sources}
          defaultSourceId={activeSourceId}
          groups={groupNames}
          existingEmails={existingEmails}
          onCreate={createProfile}
        />
      )}
      {dialog === 'import' && (
        <ImportModal
          isOpen
          onClose={() => setDialog(null)}
          sources={sources}
          defaultSourceId={activeSourceId}
          existingEmails={existingEmails}
          onImport={importProfiles}
          onImported={() => {
            void reload();
            setCheckedIds(new Set());
            setDialog(null);
          }}
        />
      )}
      {dialog === 'group' && (
        <GroupModal
          isOpen
          onClose={() => setDialog(null)}
          profiles={profiles}
          selectedCount={checkedIds.size}
          onAssign={assignGroup}
          onRename={renameGroup}
          onDelete={deleteGroup}
        />
      )}
      {dialog === 'transfer' && (
        <SourceTransferModal
          isOpen
          onClose={() => setDialog(null)}
          profiles={checkedProfiles}
          sources={sources}
          runningIds={runningIds}
          onFinished={afterTransfer}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDeleteProfileModal
          isOpen
          onClose={() => setDialog(null)}
          onConfirm={confirmDelete}
          profiles={deleteTargets.map((p) => {
            const location = sources.find((s) => s.id === p.sourceId)?.location;
            return {
              id: p.id,
              email: p.email,
              displayName: p.displayName,
              folder: location && p.chromeProfile ? `${location}/${p.chromeProfile}` : null,
            };
          })}
        />
      )}
      {stopTarget && (
        <ConfirmStopBrowserModal
          isOpen
          onClose={() => setStopId(null)}
          onConfirm={confirmStop}
          profile={{ email: stopTarget.email, browser: stopBrowser }}
        />
      )}
    </div>
  );
}

export default Profile;
