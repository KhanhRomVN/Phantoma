import { profileApi } from '../../../shared/api/profile.api';
import type { Profile as ProfileRecord, ProfileSource } from '../../../shared/types';
import type { ProfileDraft } from '../components/modals/CreateProfileModal/create-profile-modal.types';
import type { GroupDraft } from '../components/modals/GroupModal';
import type { ImportResult } from '../components/modals/ImportProfilesModal/import-profiles.types';
import { toProfileInput } from '../utils/profile.util';
import type { StateSetter } from '../../../shared/types/state.types';

interface ProfileMutationDeps {
  run: (task: () => Promise<void>) => Promise<void>;
  reload: () => Promise<void>;
  setProfiles: StateSetter<ProfileRecord[]>;
  setSources: StateSetter<ProfileSource[]>;
  setActiveSourceId: (id: string) => void;
  setSelectedId: StateSetter<string | null>;
  setCheckedIds: StateSetter<Set<string>>;
  setQueryDrawer: (value: null) => void;
  setDialog: (value: null) => void;
  checkedIds: Set<string>;
  deleteIds: string[];
}

export function useProfileMutations({
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
  deleteIds,
}: ProfileMutationDeps) {
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

  const confirmDelete = (): void => {
    const gone = new Set(deleteIds);
    void run(async () => {
      await profileApi.profiles.removeMany(Array.from(gone));
      setProfiles((prev) => prev.filter((p) => !gone.has(p.id)));
      setSelectedId((prev) => (prev && gone.has(prev) ? null : prev));
      setCheckedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
    });
  };

  const openProfileFolder = (profile: ProfileRecord): void => {
    void run(async () => {
      await profileApi.profiles.openFolder(profile.id);
    });
  };

  return { createProfile, importProfiles, assignGroup, renameGroup, deleteGroup, confirmDelete, openProfileFolder };
}
