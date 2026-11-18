import { dropByPrefix, remember } from './email.cache';

const NAMESPACE = 'service_email:';

export const serviceEmailCache = {
  list: <T>(profileId: string, loader: () => T | Promise<T>) => remember(`${NAMESPACE}list:${profileId}`, loader),
  invalidate: (profileId?: string) => dropByPrefix(profileId ? `${NAMESPACE}list:${profileId}` : NAMESPACE),
};