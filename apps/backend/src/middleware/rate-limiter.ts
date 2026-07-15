import { Context, Next } from "hono";
import { getRedis } from "../lib/redis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const MAX_GENERATION_REQUESTS = 10;

const GENERATION_PATHS = ["/api/projects/", "/api/avatars/"];

function isGenerationPath(path: string): boolean {
  return GENERATION_PATHS.some((p) => path.startsWith(p) && (path.endsWith("/contents") || path.endsWith("/generate")));
}

export async function rateLimiter(c: Context, next: Next) {
  const userId = c.get("userId") ?? "anonymous";
  const path = c.req.path;
  const maxReqs = isGenerationPath(path) ? MAX_GENERATION_REQUESTS : MAX_REQUESTS;

  const redis = getRedis();
  const key = `ratelimit:${userId}:${path}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  try {
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    if (count >= maxReqs) {
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
      const resetTime = oldest[1] ? Number(oldest[1]) + WINDOW_MS : now + WINDOW_MS;
      c.res.headers.set("Retry-After", String(Math.ceil((resetTime - now) / 1000)));
      c.res.headers.set("X-RateLimit-Limit", String(maxReqs));
      c.res.headers.set("X-RateLimit-Remaining", "0");
      return c.json({ error: "Too many requests. Please slow down." }, 429);
    }

    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, Math.ceil(WINDOW_MS / 1000));

    c.res.headers.set("X-RateLimit-Limit", String(maxReqs));
    c.res.headers.set("X-RateLimit-Remaining", String(maxReqs - count - 1));

    await next();
  } catch {
    await next();
  }
}