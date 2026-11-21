import type { Input } from '../database/sql';
import { emailRepository } from '../repositories/email.repository';
import { sessionRepository } from '../repositories/session.repository';
import { found } from '../utils/guard';
import { AppError } from '../utils/http';

function requireEmail(emailId: string): void {
  if (!emailRepository.exists(emailId)) throw new AppError('email not found', 404);
}

export const sessionService = {
  list: async (emailId: string) => {
    requireEmail(emailId);
    return sessionRepository.list(emailId);
  },

  get: async (emailId: string, id: string) => {
    requireEmail(emailId);
    return found(sessionRepository.get(emailId, id), 'session');
  },

  start: async (emailId: string, input: Input) => {
    requireEmail(emailId);
    return sessionRepository.start(emailId, input);
  },

  update: async (emailId: string, id: string, input: Input) => {
    requireEmail(emailId);
    return found(sessionRepository.update(emailId, id, input), 'session');
  },

  end: async (emailId: string, id: string) => {
    requireEmail(emailId);
    return found(sessionRepository.end(emailId, id), 'session');
  },

  remove: async (emailId: string, id: string): Promise<void> => {
    requireEmail(emailId);
    if (!sessionRepository.remove(emailId, id)) throw new AppError('session not found', 404);
  },
};