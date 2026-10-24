import { Request, Response, NextFunction } from "express";
import { ApiError } from "./error.middleware.js";

/**
 * Validates that a path string is safe, relative, and contains no traversal sequences.
 */
export function validateSafeFilePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== "string") {
    return false;
  }

  // Reject null bytes or ASCII control characters
  if (/[\x00-\x1f\x7f]/.test(filePath)) {
    return false;
  }

  // Reject directory traversal patterns
  if (filePath.includes("..") || filePath.includes("./") || filePath.includes(".\\")) {
    return false;
  }

  // Reject absolute paths (Windows drive letters or Unix root /)
  if (/^[a-zA-Z]:/.test(filePath) || filePath.startsWith("/") || filePath.startsWith("\\")) {
    return false;
  }

  return true;
}

/**
 * Security headers middleware enforcing standard browser protection.
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
  next();
}

/**
 * Guard middleware validating that any 'path' or 'filePath' parameter is safe against traversal.
 */
export function pathTraversalGuardMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const checkValue = (val: unknown, paramName: string) => {
    if (typeof val === "string" && !validateSafeFilePath(val)) {
      throw new ApiError(
        400,
        "INVALID_PATH",
        `Invalid or unsafe path specified in '${paramName}'. Directory traversal and absolute paths are forbidden.`
      );
    }
  };

  if (req.params.path) checkValue(req.params.path, "params.path");
  if (req.params.filePath) checkValue(req.params.filePath, "params.filePath");
  if (req.query.path) checkValue(req.query.path, "query.path");
  if (req.query.filePath) checkValue(req.query.filePath, "query.filePath");

  next();
}
