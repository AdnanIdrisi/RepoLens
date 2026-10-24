import { Request, Response, NextFunction } from "express";

/**
 * Performance metrics middleware:
 * - Records high-resolution start time
 * - Sets X-Response-Time header
 * - Emits warnings on slow endpoints (>1000ms)
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);

    // If headers haven't already been written (e.g. streaming responses), record time
    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${elapsedMs}ms`);
    }

    if (parseFloat(elapsedMs) > 1000) {
      console.warn(`[SLOW_REQUEST] ${req.method} ${req.originalUrl || req.url} took ${elapsedMs}ms`);
    }
  });

  next();
}
