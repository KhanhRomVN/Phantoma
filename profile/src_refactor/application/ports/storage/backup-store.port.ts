import type { EmailFile, Row } from '../../../domain/mappers';

export interface BackupStorePort {
  writeEmailBackup: (sourceName: string, emailId: string, data: EmailFile, services: Row[]) => void;
  deleteEmailBackup: (sourceName: string, emailId: string) => void;
  renameSourceBackup: (oldName: string, newName: string) => void;
  pruneSourceBackup: (sourceName: string, keepIds: string[]) => void;
  deleteSourceBackup: (sourceName: string) => void;
}