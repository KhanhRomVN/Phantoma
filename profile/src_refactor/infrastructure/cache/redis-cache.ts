import type Redis from 'ioredis-mock';
import type { EmailCachePort } from '../../application/ports/cache/email-cache.port';
import type { ServiceEmailCachePort } from '../../application/ports/cache/service-email-cache.port';

const EMAIL_NAMESPACE = 'email:';
const SERVICE_EMAIL_NAMESPACE = 'service_email:';
const TTL_SECONDS = 300;

type RedisClient = InstanceType<typeof Redis>;

export class RedisCache {
  // ASSUMED: the client is shared with the legacy cache/email.cache.ts singleton until Profile and Source services are migrated, so both sides invalidate the same keys — upgrade path: Container creates the client and legacy cache is deleted
  constructor(private readonly client: RedisClient) {}

  remember = async <T>(key: string, loader: () => T | Promise<T>): Promise<T> => {
    const hit = await this.client.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
    const value = await loader();
    if (value !== undefined && value !== null) await this.client.set(key, JSON.stringify(value), 'EX', TTL_SECONDS);
    return value;
  };

  dropByPrefix = async (prefix: string): Promise<void> => {
    const keys = await this.client.keys(`${prefix}*`);
    if (keys.length > 0) await this.client.del(...keys);
  };
}

export function createEmailCache(cache: RedisCache): EmailCachePort {
  return {
    list: (sourceId, loader) => cache.remember(`${EMAIL_NAMESPACE}list:${sourceId ?? '*'}`, loader),
    get: (id, loader) => cache.remember(`${EMAIL_NAMESPACE}get:${id}`, loader),
    invalidate: () => cache.dropByPrefix(EMAIL_NAMESPACE),
  };
}

export function createServiceEmailCache(cache: RedisCache): ServiceEmailCachePort {
  return {
    list: (profileId, loader) => cache.remember(`${SERVICE_EMAIL_NAMESPACE}list:${profileId}`, loader),
    invalidate: (profileId) =>
      cache.dropByPrefix(profileId ? `${SERVICE_EMAIL_NAMESPACE}list:${profileId}` : SERVICE_EMAIL_NAMESPACE),
  };
}