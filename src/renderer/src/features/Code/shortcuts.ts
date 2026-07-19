export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  action: () => void;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export const CODE_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'open-project-manager',
    keys: ['Ctrl+O'],
    description: 'Open Project Manager',
    ctrl: true,
    action: () => {
      // Action will be injected from component
    },
  },
];

export function getShortcutKeys(shortcutId: string): string[] {
  const shortcut = CODE_SHORTCUTS.find((s) => s.id === shortcutId);
  return shortcut?.keys || [];
}