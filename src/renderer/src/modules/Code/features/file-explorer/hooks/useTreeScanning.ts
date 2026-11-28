// ─── Imports ─────────────────────────────────────────────────────────────────
// ── React ──
import { useState, useEffect } from 'react';

// ── Services ──
import { isScanning, scanListeners } from '../services/file-tree.cache';

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useTreeScanning(): boolean {
  const [scanning, setScanning] = useState(isScanning());
  useEffect(() => {
    const l = () => setScanning(isScanning());
    scanListeners.add(l);
    l();
    return () => {
      scanListeners.delete(l);
    };
  }, []);
  return scanning;
}
