import { AppPlatform, AppMode } from '../../../../../types/apps';

export type ModalPlatform = 'web' | 'pc' | 'android' | 'cli';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (app: {
    name: string;
    url?: string;
    executablePath?: string;
    mode: AppMode;
    platform: AppPlatform;
    icon?: string;
    emulatorSerial?: string;
    packageName?: string;
  }) => void;
  existingApps?: {
    id?: string;
    name?: string;
    url?: string;
    executablePath?: string;
    emulatorSerial?: string;
  }[];
  editApp?: { id: string; name: string; url?: string; executablePath?: string } | null;
  onEdit?: (id: string, data: { name: string; url?: string; executablePath?: string }) => void;
}