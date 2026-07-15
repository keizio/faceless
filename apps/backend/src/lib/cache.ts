import { getRedis } from "./redis";

const DEFAULT_TTL = 86_400; // 24 hours

function buildKey(namespace: string, ...parts: string[]): string {
  return `cache:${namespace}:${parts.join(":")}`;
}

export async function cacheGet<T>(namespace: string, ...parts: string[]): Promise<T | null> {
  const redis = getRedis();
  const key = buildKey(namespace, ...parts);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(namespace: string, value: T, ttl = DEFAULT_TTL, ...parts: string[]): Promise<void> {
  const redis = getRedis();
  const key = buildKey(namespace, ...parts);
  await redis.set(key, JSON.stringify(value), "EX", ttl);
}

export async function cacheDel(namespace: string, ...parts: string[]): Promise<void> {
  const redis = getRedis();
  const key = buildKey(namespace, ...parts);
  await redis.del(key);
}