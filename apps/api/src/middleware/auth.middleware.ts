import { Request, Response, NextFunction } from "express";
import { ApiError } from "./error.middleware.js";

export interface AuthenticatedUser {
  id: string;
  role: "admin" | "user" | "anonymous";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts identity from x-user-id header or Bearer token.
 * Defaults to "anonymous-user" for public/local operations.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers["x-user-id"];

  if (typeof userIdHeader === "string" && userIdHeader.trim().length > 0) {
    req.user = {
      id: userIdHeader.trim(),
      role: "user"
    };
    return next();
  }

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.length > 0) {
      const simulatedUserId = token.includes(":") ? token.split(":")[0] : token;
      req.user = {
        id: simulatedUserId,
        role: "user"
      };
      return next();
    }
  }

  req.user = {
    id: "anonymous-user",
    role: "anonymous"
  };
  next();
}

/**
 * Enforces that the caller is authenticated (not anonymous).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role === "anonymous") {
    throw new ApiError(401, "UNAUTHORIZED", "Authentication required to perform this operation");
  }
  next();
}

/**
 * Verifies repository resource ownership against authenticated user.
 */
export function verifyOwnership(resourceOwnerId: string | undefined, currentUserId: string): boolean {
  if (!resourceOwnerId || resourceOwnerId === "anonymous-user") {
    return true; // Public or unowned resource
  }
  return resourceOwnerId === currentUserId;
}
