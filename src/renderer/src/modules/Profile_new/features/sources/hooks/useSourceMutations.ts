import { profileApi } from '../../../shared/api/profile.api';
import type { Profile as ProfileRecord, ProfileSource } from '../../../shared/types';
import type { ImportSourceDraft, SourceDraft } from '../components/SourceModal/source-modal.types';
import { ALL_SOURCES_ID } from '../constants/source.constants';

type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

interface SourceMutationDeps {
  run: (task: () => Promise<void>) => Promise<void>;
  reload: () => Promise<void>;
  sources: ProfileSource[];
  activeSourceId: string;
  editSourceId: string | null;
  setSources: StateSetter<ProfileSource[]>;
  setProfiles: StateSetter<ProfileRecord[]>;
  setActiveSourceId: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setCheckedIds: (ids: Set<string>) => void;
  setEditSourceId: (id: string | null) => void;
  setDialog: (value: null) => void;
}

export function useSourceMutations({
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
}: SourceMutationDeps) {
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

  const afterTransfer = async (): Promise<void> => {
    await run(async () => {
      await reload();
      setCheckedIds(new Set());
      setDialog(null);
    });
  };

  return { createSource, updateSource, importSource, unlinkSource, afterTransfer };
}
