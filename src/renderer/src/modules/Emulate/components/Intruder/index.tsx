import { Zap, X } from 'lucide-react';
import { NetworkRequest } from '../Home/Filter';

// Storage utilities with target support
const getStorageKey = (targetId: string | null, type: string): string => {
  const base = targetId ? `intruder-${targetId}` : 'intruder-default';
  return `${base}-${type}`;
};

// Load request IDs that have been sent to Intruder
const loadIntruderIds = (targetId?: string | null): Set<string> => {
  try {
    const key = getStorageKey(targetId || null, 'request-ids');
    const data = localStorage.getItem(key);
    if (data) {
      const arr = JSON.parse(data);
      return new Set(arr);
    }
  } catch {}
  return new Set();
};

// Save request IDs to localStorage
const saveIntruderIds = (ids: Set<string>, targetId?: string | null) => {
  try {
    const key = getStorageKey(targetId || null, 'request-ids');
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch {}
};

// Add a request to Intruder
export const addToIntruder = (requestId: string, targetId?: string | null) => {
  const ids = loadIntruderIds(targetId);
  ids.add(requestId);
  saveIntruderIds(ids, targetId);
  window.dispatchEvent(new CustomEvent('intruder-updated'));
};

// Check if a request is in Intruder
export const isInIntruder = (requestId: string, targetId?: string | null): boolean => {
  const ids = loadIntruderIds(targetId);
  return ids.has(requestId);
};

// Get all request IDs in Intruder
export const getIntruderIds = (targetId?: string | null): Set<string> => {
  return loadIntruderIds(targetId);
};

// Remove a request from Intruder
export const removeFromIntruder = (requestId: string, targetId?: string | null) => {
  const ids = loadIntruderIds(targetId);
  ids.delete(requestId);
  saveIntruderIds(ids, targetId);
  window.dispatchEvent(new CustomEvent('intruder-updated'));
};

// Clear all requests from Intruder
export const clearIntruder = (targetId?: string | null) => {
  saveIntruderIds(new Set(), targetId);
  window.dispatchEvent(new CustomEvent('intruder-updated'));
};

interface IntruderPanelProps {
  requests?: NetworkRequest[];
  onClose?: () => void;
  targetId?: string | null;
}

export function IntruderPanel({
  requests = [],
  onClose,
  targetId,
}: IntruderPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple" />
          <span className="text-sm font-medium">Intruder</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <Zap className="w-12 h-12 mb-3 opacity-20 mx-auto" />
          <p className="text-sm">Intruder - Under Development</p>
          <p className="text-xs mt-1 opacity-60">
            Right-click a request and select "Send to Intruder"
          </p>
        </div>
      </div>
    </div>
  );
}

export default IntruderPanel;