import { serviceEmailCache } from '../cache/service_email.cache';
import type { Input } from '../database/sql';
import { emailRepository } from '../repositories/email.repository';
import { serviceEmailRepository } from '../repositories/service_email.repository';
import { found } from '../utils/guard';
import { AppError } from '../utils/http';
import { syncEmailBackup } from './backup.service';

function requireEmail(emailId: string): void {
  if (!emailRepository.exists(emailId)) throw new AppError('email not found', 404);
}

export const serviceEmailService = {
  list: async (emailId: string) => {
    requireEmail(emailId);
    return serviceEmailCache.list(emailId, () => serviceEmailRepository.list(emailId));
  },

  create: async (emailId: string, input: Input) => {
    requireEmail(emailId);
    const row = serviceEmailRepository.create(emailId, input);
    await serviceEmailCache.invalidate(emailId);
    syncEmailBackup(emailId);
    return row;
  },

  update: async (emailId: string, id: string, input: Input) => {
    requireEmail(emailId);
    const row = serviceEmailRepository.update(emailId, id, input);
    await serviceEmailCache.invalidate(emailId);
    syncEmailBackup(emailId);
    return found(row, 'service link');
  },

  remove: async (emailId: string, id: string): Promise<void> => {
    requireEmail(emailId);
    const ok = serviceEmailRepository.remove(emailId, id);
    await serviceEmailCache.invalidate(emailId);
    syncEmailBackup(emailId);
    if (!ok) throw new AppError('service link not found', 404);
  },
};