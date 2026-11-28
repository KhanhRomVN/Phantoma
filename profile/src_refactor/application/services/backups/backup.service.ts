import type { EmailFile, Row } from '../../../domain/mappers';
import type { BackupPort } from '../../ports/storage/backup.port';
import type { BackupStorePort } from '../../ports/storage/backup-store.port';

export interface BackupEmailSource {
  getRaw: (id: string) => EmailFile | undefined;
  listIdsBySource: (sourceId: string) => string[];
}

export interface BackupSourceLookup {
  getById: (id: string) => { name: string } | null | undefined;
}

export interface BackupServiceEmailSource {
  listRaw: (emailId: string) => Row[];
}

export type SourceIdOfEmail = (emailId: string) => { sourceId: string } | null | undefined;

export class BackupService implements BackupPort {
  constructor(
    private readonly emails: BackupEmailSource,
    private readonly sources: BackupSourceLookup,
    private readonly serviceEmails: BackupServiceEmailSource,
    private readonly store: BackupStorePort,
    private readonly parseEmailId: SourceIdOfEmail,
  ) {}

  private sourceNameOf(emailId: string): string | null {
    const sourceId = this.parseEmailId(emailId)?.sourceId;
    return sourceId ? (this.sources.getById(sourceId)?.name ?? null) : null;
  }

  syncEmailBackup = (emailId: string): void => {
    const sourceName = this.sourceNameOf(emailId);
    const data = this.emails.getRaw(emailId);
    if (!sourceName || !data) return;
    this.store.writeEmailBackup(sourceName, emailId, data, this.serviceEmails.listRaw(emailId));
  };

  dropEmailBackup = (emailId: string): void => {
    const sourceName = this.sourceNameOf(emailId);
    if (sourceName) this.store.deleteEmailBackup(sourceName, emailId);
  };

  // Full rebuild from the folder: covers sources whose emails already exist on disk (sync, edited location, imported/restored folders)
  rebuildSourceBackup = (sourceId: string): void => {
    const sourceName = this.sources.getById(sourceId)?.name;
    if (!sourceName) return;
    const ids = this.emails.listIdsBySource(sourceId);
    ids.forEach((id) => this.syncEmailBackup(id));
    this.store.pruneSourceBackup(sourceName, ids);
  };
}