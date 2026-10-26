export interface UnsavedItem {
  id: string;
  name: string;
  detail?: string;
  badge?: string;
}

export interface UnsavedProvider {
  id: string;
  label: string;
  getItems: () => UnsavedItem[];
  saveItem?: (itemId: string) => Promise<void>;
}

export interface UnsavedGroup {
  providerId: string;
  label: string;
  canSave: boolean;
  items: UnsavedItem[];
}

const providers = new Map<string, UnsavedProvider>();

export function registerUnsavedProvider(provider: UnsavedProvider): () => void {
  providers.set(provider.id, provider);
  return () => {
    if (providers.get(provider.id) === provider) providers.delete(provider.id);
  };
}

export function getUnsavedGroups(): UnsavedGroup[] {
  const groups: UnsavedGroup[] = [];
  providers.forEach((provider) => {
    const items = provider.getItems();
    if (items.length === 0) return;
    groups.push({
      providerId: provider.id,
      label: provider.label,
      canSave: !!provider.saveItem,
      items,
    });
  });
  return groups;
}

export function countUnsaved(): number {
  return getUnsavedGroups().reduce((n, g) => n + g.items.length, 0);
}

/** Saves every item that supports saving and returns whatever is still unsaved. */
export async function saveAllUnsaved(): Promise<UnsavedGroup[]> {
  for (const provider of Array.from(providers.values())) {
    if (!provider.saveItem) continue;
    for (const item of provider.getItems()) {
      try {
        await provider.saveItem(item.id);
      } catch (err) {
        console.error('[Unsaved] Failed to save ' + provider.id + ':' + item.id, err);
      }
    }
  }
  return getUnsavedGroups();
}