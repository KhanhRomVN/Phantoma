import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@renderer/components/ui/Button';
import {
  ConfirmDeleteProfileModal,
  CreateProfileModal,
  GroupModal,
  ImportProfilesModal,
  ProfileBulkActions,
  ProfileDrawer,
  ProfileEmpty,
  ProfileSkeleton,
  ProfileStats,
  ProfileTable,
  ProfileToolPanel,
  useProfileMutations,
  useProfileSelection,
} from '../features/profiles';
import type { DrawerFocus } from '../features/profiles';
import { ConfirmStopBrowserModal, useRunningBrowsers } from '../features/browser';
import { DEFAULT_QUICK_FILTERS, focusService } from '../features/queries';
import {
  ALL_SOURCES_ID,
  SourceBar,
  SourceModal,
  SourceTransferModal,
  toSourceDraft,
  useSourceMutations,
} from '../features/sources';
import { useProfileDialogs } from './hooks/useProfileDialogs';
import { useProfilePageActions } from './hooks/useProfilePageActions';
import { useProfilePageData } from './hooks/useProfilePageData';
import { useProfilePageFilters } from './hooks/useProfilePageFilters';
import { useProfileViewPersistence } from './hooks/useProfileViewPersistence';

export interface ProfileProps {
  activeAppId?: string;
}

export function ProfilePage({}: ProfileProps) {
  const [drawerFocus, setDrawerFocus] = useState<DrawerFocus | null>(null);
  const { running, runningIds } = useRunningBrowsers();

  const data = useProfilePageData();
  const {
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
    sourceProfiles,
  } = data;

  const {
    filters,
    setFilters,
    setActiveQueryId,
    queryDrawer,
    setQueryDrawer,
    visible,
  } = useProfilePageFilters({ run, sourceProfiles });

  useProfileViewPersistence({ loading, activeSourceId, search: filters.search, selectedId });

  const dialogs = useProfileDialogs({ profiles, running });
  const { dialog, setDialog, editSourceId, setEditSourceId, stopTarget, stopBrowser, requestDelete } = dialogs;

  const selection = useProfileSelection({
    profiles,
    sources,
    visible,
    selectedId,
    setSelectedId,
    setActiveSourceId,
  });
  const { checkedIds, setCheckedIds, checkedProfiles, selected } = selection;

  const sourceActions = useSourceMutations({
    run,
    reload,
    sources,
    activeSourceId,
    editSourceId,
    setSources,
    setProfiles,
    setActiveSourceId,
    setSelectedId,
    setCheckedIds,
    setEditSourceId,
    setDialog,
  });

  const profileActions = useProfileMutations({
    run,
    reload,
    setProfiles,
    setSources,
    setActiveSourceId,
    setSelectedId,
    setCheckedIds,
    setQueryDrawer,
    setDialog,
    checkedIds,
    deleteIds: dialogs.deleteIds,
  });

  const { confirmStop } = useProfilePageActions({ run, stopId: dialogs.stopId });

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
              sources={data.sourcesView}
              activeId={activeSourceId}
              stats={data.sourceStats}
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
              onUnlinkSource={sourceActions.unlinkSource}
            />

            <ProfileStats profiles={sourceProfiles} />

            <ProfileToolPanel
              filters={filters}
              groups={data.groups}
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
                sourceNames={data.sourceNames}
                onSelect={(id, target) => {
                  setSelectedId(id);
                  setQueryDrawer(null);
                  setDrawerFocus(target ? { ...target, nonce: Date.now() } : null);
                }}
                onToggleCheck={selection.toggleCheck}
                onToggleAll={selection.toggleAll}
                filteredOut={sourceProfiles.length > 0}
                onClearFilters={() => {
                  setFilters(DEFAULT_QUICK_FILTERS);
                  setActiveQueryId(null);
                }}
                onAddProfile={() => setDialog('profile')}
                onOpenFolder={profileActions.openProfileFolder}
                onDelete={(p) => requestDelete([p.id])}
                runningIds={runningIds}
                onStop={(p) => dialogs.setStopId(p.id)}
              />

              <ProfileBulkActions
                count={checkedIds.size}
                canTransfer={sources.length > 1}
                onGroup={() => setDialog('group')}
                onTransfer={() => setDialog('transfer')}
                onDelete={() => requestDelete(Array.from(checkedIds))}
                onClear={() => setCheckedIds(new Set())}
              />
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
              duplicates={selection.duplicates}
              onOpenDuplicate={selection.openDuplicate}
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
          onCreate={editSourceId ? sourceActions.updateSource : sourceActions.createSource}
          onImport={sourceActions.importSource}
          initial={toSourceDraft(sources.find((x) => x.id === editSourceId))}
        />
      )}

      {dialog === 'profile' && (
        <CreateProfileModal
          isOpen
          onClose={() => setDialog(null)}
          sources={sources}
          defaultSourceId={activeSourceId}
          groups={data.groupNames}
          existingEmails={data.existingEmails}
          onCreate={profileActions.createProfile}
        />
      )}
      {dialog === 'import' && (
        <ImportProfilesModal
          isOpen
          onClose={() => setDialog(null)}
          sources={sources}
          defaultSourceId={activeSourceId}
          existingEmails={data.existingEmails}
          onImport={profileActions.importProfiles}
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
          onAssign={profileActions.assignGroup}
          onRename={profileActions.renameGroup}
          onDelete={profileActions.deleteGroup}
        />
      )}
      {dialog === 'transfer' && (
        <SourceTransferModal
          isOpen
          onClose={() => setDialog(null)}
          profiles={checkedProfiles}
          sources={sources}
          runningIds={runningIds}
          onFinished={sourceActions.afterTransfer}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDeleteProfileModal
          isOpen
          onClose={() => setDialog(null)}
          onConfirm={profileActions.confirmDelete}
          profiles={dialogs.deleteTargets.map((p) => {
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
          onClose={() => dialogs.setStopId(null)}
          onConfirm={confirmStop}
          profile={{ email: stopTarget.email, browser: stopBrowser }}
        />
      )}
    </div>
  );
}

export default ProfilePage;
