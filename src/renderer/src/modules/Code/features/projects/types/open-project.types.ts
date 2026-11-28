// ─── Types ───────────────────────────────────────────────────────────────────
export type LogoCandidate = { path: string; name: string; width: number; height: number; src?: string };

export type Mode = 'local' | 'clone';

export type Selection = { type: 'folder' } | { type: 'project'; id: string } | null;

export interface OpenProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded?: (projectId: string) => void;
}
