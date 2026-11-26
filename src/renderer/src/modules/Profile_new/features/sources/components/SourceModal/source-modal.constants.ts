import { FolderInput, FolderPlus, Layers } from 'lucide-react';
import { TONE_CLASS } from '../../../../shared/constants/tone.constants';
import { SourceMode, View, StatusTone } from './source-modal.types';

export const SOFT_INPUT =
  'border-transparent bg-text-secondary/10 hover:bg-text-secondary/15 focus:border-transparent focus:bg-text-secondary/15';

export const ERROR_INPUT = 'bg-error/10 hover:bg-error/15 focus:bg-error/15';

export const DEFAULT_LOCATION = '/home/khanhromvn/.phantoma/profile'; // ASSUMED: đường dẫn mặc định theo yêu cầu

export const MODES: { id: SourceMode; label: string; icon: typeof FolderPlus }[] = [
  { id: 'create', label: 'Create new', icon: FolderPlus },
  { id: 'import', label: 'Import existing', icon: FolderInput },
];

export const VIEW_META: Record<View, { tag: string; tagClass: string; caption: string; storage: string; icon: typeof Layers }> = {
  create: {
    tag: 'New',
    tagClass: TONE_CLASS.success.pill,
    caption: 'Creates a fresh sub-folder named after the source inside the location you choose.',
    storage: 'New sub-folder',
    icon: Layers,
  },
  import: {
    tag: 'Import',
    tagClass: TONE_CLASS.warn.pill,
    caption: 'Uses the folder exactly as it is, picks up its Chrome profiles and rebuilds the backup.',
    storage: 'Existing folder',
    icon: FolderInput,
  },
  edit: {
    tag: 'Edit',
    tagClass: 'bg-text-secondary/10 text-text-secondary',
    caption: 'Rename this source or point it at a different folder.',
    storage: 'Existing folder',
    icon: Layers,
  },
};

export const STATUS_CLASS: Record<StatusTone, string> = {
  idle: 'bg-text-secondary/10 text-text-secondary',
  checking: 'bg-text-secondary/10 text-text-secondary',
  ok: TONE_CLASS.success.pill,
  error: 'bg-error/10 text-error',
};
