import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_RECON_SETTINGS } from './types';
import type { ReconSettings, LeftSidebarSettings, ContentTabUISettings } from './types';

const STORAGE_KEY = 'phantoma.recon.settings';

function load(): ReconSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECON_SETTINGS;
    const saved = JSON.parse(raw) as Partial<ReconSettings>;
    return {
      leftSidebar: { ...DEFAULT_RECON_SETTINGS.leftSidebar, ...saved.leftSidebar },
      contentTabUI: { ...DEFAULT_RECON_SETTINGS.contentTabUI, ...saved.contentTabUI },
    };
  } catch {
    return DEFAULT_RECON_SETTINGS;
  }
}

interface ReconSettingsContextValue {
  settings: ReconSettings;
  updateLeftSidebar: (patch: Partial<LeftSidebarSettings>) => void;
  updateContentTabUI: (patch: Partial<ContentTabUISettings>) => void;
  reset: () => void;
}

const ReconSettingsContext = createContext<ReconSettingsContextValue | null>(null);

export function ReconSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReconSettings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage không khả dụng — giữ setting trong bộ nhớ
    }
  }, [settings]);

  const updateLeftSidebar = useCallback((patch: Partial<LeftSidebarSettings>) => {
    setSettings((s) => ({ ...s, leftSidebar: { ...s.leftSidebar, ...patch } }));
  }, []);

  const updateContentTabUI = useCallback((patch: Partial<ContentTabUISettings>) => {
    setSettings((s) => ({ ...s, contentTabUI: { ...s.contentTabUI, ...patch } }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_RECON_SETTINGS), []);

  const value = useMemo(
    () => ({ settings, updateLeftSidebar, updateContentTabUI, reset }),
    [settings, updateLeftSidebar, updateContentTabUI, reset]
  );

  return <ReconSettingsContext.Provider value={value}>{children}</ReconSettingsContext.Provider>;
}

export function useReconSettings(): ReconSettingsContextValue {
  const ctx = useContext(ReconSettingsContext);
  if (!ctx) throw new Error('useReconSettings phải được dùng bên trong ReconSettingsProvider');
  return ctx;
}