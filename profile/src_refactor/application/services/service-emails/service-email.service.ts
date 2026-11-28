import { found } from '../../../utils/guard';
import { AppError } from '../../../utils/http';
import type { ServiceEmailCachePort } from '../../ports/cache/service-email-cache.port';
import type { ProfileLookupPort } from '../../ports/repositories/profile-lookup.port';
import type {
  ServiceEmailInput,
  ServiceEmailRepositoryPort,
} from '../../ports/repositories/service-email.repository.port';
import type { BackupPort } from '../../ports/storage/backup.port';

export class ServiceEmailService {
  constructor(
    private readonly profiles: ProfileLookupPort,
    private readonly repository: ServiceEmailRepositoryPort,
    private readonly cache: ServiceEmailCachePort,
    private readonly backup: BackupPort,
  ) {}

  private requireProfile(emailId: string): void {
    if (!this.profiles.exists(emailId)) throw new AppError('email not found', 404);
  }

  list = async (emailId: string) => {
    this.requireProfile(emailId);
    return this.cache.list(emailId, () => this.repository.list(emailId));
  };

  create = async (emailId: string, input: ServiceEmailInput) => {
    this.requireProfile(emailId);
    const row = this.repository.create(emailId, input);
    await this.cache.invalidate(emailId);
    this.backup.syncEmailBackup(emailId);
    return row;
  };

  update = async (emailId: string, id: string, input: ServiceEmailInput) => {
    this.requireProfile(emailId);
    const row = this.repository.update(emailId, id, input);
    await this.cache.invalidate(emailId);
    this.backup.syncEmailBackup(emailId);
    return found(row, 'service link');
  };

  remove = async (emailId: string, id: string): Promise<void> => {
    this.requireProfile(emailId);
    const ok = this.repository.remove(emailId, id);
    await this.cache.invalidate(emailId);
    this.backup.syncEmailBackup(emailId);
    if (!ok) throw new AppError('service link not found', 404);
  };
}