import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProfileViewState {
  activeSourceId: string | null;
  search: string;
  selectedId: string | null;
  drawerTab: string | null;
  recentServices: string[];
  setView: (patch: Partial<Omit<ProfileViewState, 'setView'>>) => void;
}

export const useProfileViewStore = create<ProfileViewState>()(
  persist(
    (set) => ({
      activeSourceId: null,
      search: '',
      selectedId: null,
      drawerTab: null,
      recentServices: [],
      setView: (patch) => set(patch),
    }),
    { name: 'profile-view-store' },
  ),
);