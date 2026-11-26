import Redis from 'ioredis-mock';
import { createLogger } from '../utils/logger';

const logger = createLogger('Cache');

const NAMESPACE = 'email:';
const TTL_SECONDS = 300;

let client: InstanceType<typeof Redis> | null = null;

export function getRedis(): InstanceType<typeof Redis> {
  if (!client) {
    client = new Redis();
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  await client.quit();
  client = null;
}

export async function remember<T>(key: string, loader: () => T | Promise<T>): Promise<T> {
  const redis = getRedis();
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit) as T;
  const value = await loader();
  if (value !== undefined && value !== null)
    await redis.set(key, JSON.stringify(value), 'EX', TTL_SECONDS);
  return value;
}

export async function dropByPrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length > 0) await redis.del(...keys);
}

export const emailCache = {
  list: <T>(sourceId: string | undefined, loader: () => T | Promise<T>) =>
    remember(`${NAMESPACE}list:${sourceId ?? '*'}`, loader),
  get: <T>(id: string, loader: () => T | Promise<T>) => remember(`${NAMESPACE}get:${id}`, loader),
  invalidate: () => dropByPrefix(NAMESPACE),
};
