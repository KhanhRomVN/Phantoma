export interface BackupPort {
  syncEmailBackup: (emailId: string) => void;
  dropEmailBackup: (emailId: string) => void;
  rebuildSourceBackup: (sourceId: string) => void;
}