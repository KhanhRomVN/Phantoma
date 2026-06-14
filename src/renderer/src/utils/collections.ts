import { NetworkRequest } from '../types/inspector';

export interface RequestCollection {
  id: string;
  name: string;
  description?: string;
  requests: NetworkRequest[];
  createdAt: number;
  updatedAt: number;
}

export const COLLECTIONS_UPDATED_EVENT = 'collections-updated';

const STORAGE_KEY_PREFIX = 'composer_collections_';

function getStorageKey(appId: string): string {
  return `${STORAGE_KEY_PREFIX}${appId}`;
}

function loadCollections(appId: string): RequestCollection[] {
  const key = getStorageKey(appId);
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveCollections(appId: string, collections: RequestCollection[]): void {
  const key = getStorageKey(appId);
  localStorage.setItem(key, JSON.stringify(collections));
  window.dispatchEvent(new Event(COLLECTIONS_UPDATED_EVENT));
}

export function getOrCreateDefaultCollection(appId: string): RequestCollection {
  const collections = loadCollections(appId);
  const defaultCollection = collections.find(c => c.id === 'default');
  
  if (defaultCollection) {
    return defaultCollection;
  }
  
  const newCollection: RequestCollection = {
    id: 'default',
    name: 'My Collection',
    description: 'Default request collection',
    requests: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  collections.push(newCollection);
  saveCollections(appId, collections);
  return newCollection;
}

export function deleteRequestFromCollection(
  appId: string,
  collectionId: string,
  requestId: string
): void {
  const collections = loadCollections(appId);
  const collection = collections.find(c => c.id === collectionId);
  
  if (collection) {
    collection.requests = collection.requests.filter(r => r.id !== requestId);
    collection.updatedAt = Date.now();
    saveCollections(appId, collections);
  }
}

export function addRequestToCollection(
  appId: string,
  collectionId: string,
  request: NetworkRequest
): void {
  const collections = loadCollections(appId);
  const collection = collections.find(c => c.id === collectionId);
  
  if (collection) {
    // Check if request already exists
    const exists = collection.requests.some(r => r.id === request.id);
    if (!exists) {
      collection.requests.push(request);
      collection.updatedAt = Date.now();
      saveCollections(appId, collections);
    }
  }
}

export function createCollection(
  appId: string,
  name: string,
  description?: string
): RequestCollection {
  const collections = loadCollections(appId);
  const newCollection: RequestCollection = {
    id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    requests: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  collections.push(newCollection);
  saveCollections(appId, collections);
  return newCollection;
}

export function deleteCollection(appId: string, collectionId: string): void {
  const collections = loadCollections(appId);
  const filtered = collections.filter(c => c.id !== collectionId);
  saveCollections(appId, filtered);
}

export function getAllCollections(appId: string): RequestCollection[] {
  return loadCollections(appId);
}