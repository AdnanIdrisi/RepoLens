import { Request, Response, NextFunction } from "express";
import { ApiError } from "./error.middleware.js";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later",
    keyGenerator = (req: Request) => {
      const userKey = req.user?.id && req.user.id !== "anonymous-user" ? req.user.id : "";
      const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
      return userKey ? `${userKey}@${ip}` : ip;
    }
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Periodic cleanup of expired records every 60 seconds
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 60_000);

  // Unref timer so it doesn't hold process open in test runners
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
    const key = keyGenerator(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", resetSeconds);

    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      throw new ApiError(429, "TOO_MANY_REQUESTS", message, {
        retryAfterSeconds: resetSeconds,
        limit: max
      });
    }

    next();
  };
}

/** Global standard rate limiter: 120 requests per minute */
export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Global rate limit exceeded. Please throttle requests."
});

/** Heavy route rate limiter (e.g. AI generation, indexing sync): 30 requests per minute */
export const heavyRouteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Heavy operation rate limit exceeded. Please wait before retrying."
});
