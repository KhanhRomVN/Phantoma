/**
 * ------------------------------------------------------------------
 * Clone History Manager
 * ------------------------------------------------------------------
 * Persists cloned repository metadata to localStorage.
 * Structure: { url: string; name: string; dest: string; timestamp: number }[]
 * ------------------------------------------------------------------
 */

const STORAGE_KEY = 'phantoma_clone_history';
const MAX_ENTRIES = 50; // Limit history size

export interface CloneEntry {
  id: string;
  url: string;
  name: string;
  dest: string;
  timestamp: number;
}

// Generate a simple unique ID based on timestamp and random suffix
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Retrieve all clone history entries sorted by newest first.
 */
export const getCloneHistory = (): CloneEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed: CloneEntry[] = JSON.parse(raw);
    // Ensure validity and sort descending by timestamp
    return parsed
      .filter(item => item && typeof item.url === 'string')
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[CloneHistory] Failed to parse storage:', error);
    return [];
  }
};

/**
 * Add a new entry to the clone history.
 * Automatically trims oldest entries if exceeding MAX_ENTRIES.
 */
export const addCloneEntry = (url: string, name: string, dest: string): void => {
  try {
    const current = getCloneHistory();
    
    // Prevent duplicates for same URL+Dest combination? 
    // Usually we want to track every attempt or just latest success.
    // Let's allow multiple but maybe dedupe exact matches if desired later.
    // For now, strict append.
    
    const newEntry: CloneEntry = {
      id: generateId(),
      url,
      name,
      dest,
      timestamp: Date.now(),
    };

    const updated = [newEntry, ...current].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[CloneHistory] Failed to save entry:', error);
  }
};

/**
 * Remove an entry from history by ID.
 */
export const removeCloneEntry = (id: string): void => {
  try {
    const current = getCloneHistory();
    const filtered = current.filter(entry => entry.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('[CloneHistory] Failed to remove entry:', error);
  }
};