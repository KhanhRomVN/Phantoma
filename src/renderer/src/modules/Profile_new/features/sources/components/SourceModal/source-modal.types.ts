import type { BrowserEngine, SourceType } from '../../../../shared/types';

export interface SourceDraft {
  name: string;
  type: SourceType;
  location: string;
  browsers: BrowserEngine[];
  description: string;
}

export interface ImportSourceDraft {
  name: string;
  location: string;
}

export type SourceMode = 'create' | 'import';

export type View = SourceMode | 'edit';

export type StatusTone = 'idle' | 'checking' | 'ok' | 'error';

export interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNames: string[];
  existingLocations: string[];
  onCreate: (draft: SourceDraft) => void;
  onImport: (draft: ImportSourceDraft) => void;
  initial?: SourceDraft;
}
