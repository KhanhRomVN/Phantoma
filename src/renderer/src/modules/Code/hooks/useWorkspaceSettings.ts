import { create } from 'zustand';
import type { PaneId, PanelType } from '../utils/workspaceLayout';

export type PaneRule = PaneId | 'auto';
export type PanelRules = Record<PanelType, PaneRule>;

export interface LayoutPreset {
  id: string;
  label: string;
  description: string;
  rules: PanelRules;
}

const STORAGE_KEY = 'phantoma:workspace-settings';

export const PANEL_TYPES: PanelType[] = ['agent', 'file', 'website', 'terminal', 'emulator'];

export const DEFAULT_RULES: PanelRules = {
  agent: 'tl',
  file: 'tr',
  website: 'tr',
  terminal: 'br',
  emulator: 'tr',
};

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'coding',
    label: 'Coding',
    description: 'Agent left, files & browser top-right, terminal bottom-right',
    rules: DEFAULT_RULES,
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Files left, agent right, terminal bottom-left',
    rules: { agent: 'tr', file: 'tl', website: 'tr', terminal: 'bl', emulator: 'br' },
  },
  {
    id: 'stacked',
    label: 'Stacked',
    description: 'Agent, files & browser on top, terminal below',
    rules: { agent: 'tl', file: 'tl', website: 'tl', terminal: 'bl', emulator: 'bl' },
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Everything in a single pane',
    rules: { agent: 'tl', file: 'tl', website: 'tl', terminal: 'tl', emulator: 'tl' },
  },
];

interface PersistedSettings {
  smartLayout: boolean;
  rules: PanelRules;
  reusePreviewTab: boolean;
}

const DEFAULTS: PersistedSettings = {
  smartLayout: true,
  rules: DEFAULT_RULES,
  reusePreviewTab: true,
};

const VALID_RULES: PaneRule[] = ['tl', 'tr', 'bl', 'br', 'auto'];

const load = (): PersistedSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    const rules = { ...DEFAULT_RULES };
    for (const type of PANEL_TYPES) {
      const value = parsed?.rules?.[type];
      if (VALID_RULES.includes(value)) rules[type] = value;
    }
    return {
      smartLayout: typeof parsed?.smartLayout === 'boolean' ? parsed.smartLayout : true,
      reusePreviewTab: typeof parsed?.reusePreviewTab === 'boolean' ? parsed.reusePreviewTab : true,
      rules,
    };
  } catch {
    return DEFAULTS;
  }
};

const persist = (s: PersistedSettings) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        smartLayout: s.smartLayout,
        rules: s.rules,
        reusePreviewTab: s.reusePreviewTab,
      }),
    );
  } catch {
    /* storage unavailable */
  }
};

interface WorkspaceSettingsState extends PersistedSettings {
  setSmartLayout: (value: boolean) => void;
  setRule: (type: PanelType, rule: PaneRule) => void;
  applyPreset: (rules: PanelRules) => void;
  setReusePreviewTab: (value: boolean) => void;
  reset: () => void;
}

export const useWorkspaceSettings = create<WorkspaceSettingsState>((set, get) => {
  const update = (patch: Partial<PersistedSettings>) => {
    const s = get();
    const next: PersistedSettings = {
      smartLayout: s.smartLayout,
      rules: s.rules,
      reusePreviewTab: s.reusePreviewTab,
      ...patch,
    };
    persist(next);
    set(next);
  };

  return {
    ...load(),
    setSmartLayout: (value) => update({ smartLayout: value }),
    setRule: (type, rule) => update({ rules: { ...get().rules, [type]: rule } }),
    applyPreset: (rules) => update({ rules: { ...rules } }),
    setReusePreviewTab: (value) => update({ reusePreviewTab: value }),
    reset: () => update({ ...DEFAULTS, rules: { ...DEFAULT_RULES } }),
  };
});

export function resolvePaneForType(type: PanelType): PaneId | undefined {
  const { smartLayout, rules } = useWorkspaceSettings.getState();
  if (!smartLayout) return undefined;
  const rule = rules[type];
  return rule === 'auto' ? undefined : rule;
}