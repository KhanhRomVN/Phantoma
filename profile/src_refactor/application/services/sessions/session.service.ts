import { found } from '../../../utils/guard';
import { AppError } from '../../../utils/http';
import type { ProfileLookupPort } from '../../ports/repositories/profile-lookup.port';
import type { SessionInput, SessionRepositoryPort } from '../../ports/repositories/session.repository.port';

export class SessionService {
  constructor(
    private readonly profiles: ProfileLookupPort,
    private readonly repository: SessionRepositoryPort,
  ) {}

  private requireProfile(emailId: string): void {
    if (!this.profiles.exists(emailId)) throw new AppError('email not found', 404);
  }

  list = async (emailId: string) => {
    this.requireProfile(emailId);
    return this.repository.list(emailId);
  };

  get = async (emailId: string, id: string) => {
    this.requireProfile(emailId);
    return found(this.repository.get(emailId, id), 'session');
  };

  start = async (emailId: string, input: SessionInput) => {
    this.requireProfile(emailId);
    return this.repository.start(emailId, input);
  };

  update = async (emailId: string, id: string, input: SessionInput) => {
    this.requireProfile(emailId);
    return found(this.repository.update(emailId, id, input), 'session');
  };

  end = async (emailId: string, id: string) => {
    this.requireProfile(emailId);
    return found(this.repository.end(emailId, id), 'session');
  };

  remove = async (emailId: string, id: string): Promise<void> => {
    this.requireProfile(emailId);
    if (!this.repository.remove(emailId, id)) throw new AppError('session not found', 404);
  };
}