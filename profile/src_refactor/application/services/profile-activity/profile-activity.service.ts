import { found } from '../../../utils/guard';
import { AppError } from '../../../utils/http';
import type {
  ActivityInput,
  BrowsingEntryRepositoryPort,
  ChildRepositoryPort,
} from '../../ports/repositories/profile-activity.repository.port';
import type { ProfileLookupPort } from '../../ports/repositories/profile-lookup.port';

export interface ChildCrudService<T = unknown> {
  list: (emailId: string) => Promise<T[]>;
  get: (id: string) => Promise<T>;
  create: (emailId: string, input: ActivityInput) => Promise<T | null>;
  update: (id: string, input: ActivityInput) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

export interface BrowsingEntryService<T = unknown> extends ChildCrudService<T> {
  listInRange: (emailId: string, from?: number, to?: number) => Promise<T[]>;
  clear: (emailId: string) => Promise<number>;
}

function makeChildService<T>(
  label: string,
  repo: ChildRepositoryPort<T>,
  profiles: ProfileLookupPort,
): ChildCrudService<T> {
  const requireProfile = (emailId: string): void => {
    if (!profiles.exists(emailId)) throw new AppError('email not found', 404);
  };
  return {
    list: async (emailId) => {
      requireProfile(emailId);
      return repo.list(emailId);
    },
    get: async (id) => found(repo.get(id), label),
    create: async (emailId, input) => {
      requireProfile(emailId);
      return repo.create(emailId, input);
    },
    update: async (id, input) => found(repo.update(id, input), label),
    remove: async (id) => {
      if (!repo.remove(id)) throw new AppError(`${label} not found`, 404);
    },
  };
}

export interface ProfileActivityRepositories {
  footprints: ChildRepositoryPort<unknown>;
  scriptRuns: ChildRepositoryPort<unknown>;
  deviceActivities: ChildRepositoryPort<unknown>;
  browsingEntries: BrowsingEntryRepositoryPort<unknown>;
}

export class ProfileActivityService {
  readonly footprints: ChildCrudService;
  readonly scriptRuns: ChildCrudService;
  readonly deviceActivities: ChildCrudService;
  readonly browsingEntries: BrowsingEntryService;

  constructor(profiles: ProfileLookupPort, repositories: ProfileActivityRepositories) {
    this.footprints = makeChildService('footprint', repositories.footprints, profiles);
    this.scriptRuns = makeChildService('script run', repositories.scriptRuns, profiles);
    this.deviceActivities = makeChildService('device activity', repositories.deviceActivities, profiles);
    const browsing = repositories.browsingEntries;
    this.browsingEntries = {
      ...makeChildService('browsing entry', browsing, profiles),
      listInRange: async (emailId, from, to) => browsing.listInRange(emailId, from, to),
      clear: async (emailId) => browsing.clear(emailId),
    };
  }
}