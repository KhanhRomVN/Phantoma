import { deleteEmailBackup, pruneSourceBackup, writeEmailBackup } from '../database/backup';
import { emailRepository } from '../repositories/email.repository';
import { sourceRepository } from '../repositories/service.repository';
import { serviceEmailRepository } from '../repositories/service_email.repository';
import { fromEmailId } from '../utils/browser-folder';

function sourceNameOf(emailId: string): string | null {
  const sourceId = fromEmailId(emailId)?.sourceId;
  return sourceId ? (sourceRepository.getById(sourceId)?.name ?? null) : null;
}

export function syncEmailBackup(emailId: string): void {
  const sourceName = sourceNameOf(emailId);
  const data = emailRepository.getRaw(emailId);
  if (!sourceName || !data) return;
  writeEmailBackup(sourceName, emailId, data, serviceEmailRepository.listRaw(emailId));
}

export function dropEmailBackup(emailId: string): void {
  const sourceName = sourceNameOf(emailId);
  if (sourceName) deleteEmailBackup(sourceName, emailId);
}

// Full rebuild from the folder: covers sources whose emails already exist on disk (sync, edited location, imported/restored folders)
export function rebuildSourceBackup(sourceId: string): void {
  const sourceName = sourceRepository.getById(sourceId)?.name;
  if (!sourceName) return;
  const ids = emailRepository.listIdsBySource(sourceId);
  ids.forEach((id) => syncEmailBackup(id));
  pruneSourceBackup(sourceName, ids);
}