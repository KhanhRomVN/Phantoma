import { create } from 'zustand';
import type { ServiceLink, ServiceTemplate } from '../types';

import { profileApi } from '../services/profile-api.service';

interface ServiceState {
  templates: ServiceTemplate[];
  loaded: boolean;
  links: Record<string, ServiceLink[]>;
  loadTemplates: () => Promise<void>;
  saveTemplate: (template: ServiceTemplate) => Promise<ServiceTemplate>;
  removeTemplate: (id: string) => Promise<void>;
  setLinks: (profileId: string, links: ServiceLink[]) => void;
}

let loading: Promise<void> | null = null;

export const useServiceStore = create<ServiceState>((set, get) => ({
  templates: [],
  loaded: false,
  links: {},
  loadTemplates: () => {
    if (get().loaded) return Promise.resolve();
    if (loading) return loading;
    loading = (async () => {
      const list = await profileApi.services.list();
      set({ templates: list, loaded: true });
    })().finally(() => {
      loading = null;
    });
    return loading;
  },
  saveTemplate: async (template) => {
    const exists = get().templates.some((t) => t.id === template.id);
    const saved = exists
      ? await profileApi.services.update(template.id, template)
      : await profileApi.services.create(template);
    set((s) => ({
      templates: exists
        ? s.templates.map((t) => (t.id === saved.id ? saved : t))
        : [...s.templates, saved],
    }));
    return saved;
  },
  removeTemplate: async (id) => {
    await profileApi.services.remove(id);
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  },
  setLinks: (profileId, links) => set((s) => ({ links: { ...s.links, [profileId]: links } })),
}));