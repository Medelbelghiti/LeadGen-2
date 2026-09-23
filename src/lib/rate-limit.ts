import { db } from "./db";

/**
 * Database-backed fixed-window rate limiter.
 * Works without Redis so the app runs anywhere; swap for Redis in high-scale deploys.
 */
export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const { key, limit, windowSeconds } = params;
  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.rateLimitEntry.findUnique({ where: { key } });
    if (!existing || existing.resetAt <= now) {
      const resetAt = new Date(now.getTime() + windowSeconds * 1000);
      const entry = await tx.rateLimitEntry.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { count: entry.count, resetAt: entry.resetAt };
    }
    const entry = await tx.rateLimitEntry.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { count: entry.count, resetAt: entry.resetAt };
  });

  return {
    allowed: result.count <= limit,
    remaining: Math.max(0, limit - result.count),
    resetAt: result.resetAt,
  };
}

export class RateLimitError extends Error {
  resetAt: Date;
  constructor(resetAt: Date) {
    super("Rate limit exceeded. Please try again later.");
    this.resetAt = resetAt;
  }
}

export async function enforceRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<void> {
  const r = await checkRateLimit(params);
  if (!r.allowed) throw new RateLimitError(r.resetAt);
}
