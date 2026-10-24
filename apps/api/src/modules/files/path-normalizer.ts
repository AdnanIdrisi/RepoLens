import path from "node:path";
import { ApiError } from "../../middleware/error.middleware.js";

/**
 * Normalizes repository-relative paths into a canonical POSIX format
 * and strictly prevents path traversal or absolute path injection.
 */
export function normalizeRepositoryPath(rawPath: string): string {
  if (!rawPath || typeof rawPath !== "string") {
    throw new ApiError(400, "INVALID_PATH", "File path must be a non-empty string");
  }

  let decodedPath = rawPath.trim();

  // Protect against repeated URL encoding (%252e%252e etc.)
  try {
    while (decodedPath.includes("%")) {
      const decoded = decodeURIComponent(decodedPath);
      if (decoded === decodedPath) break;
      decodedPath = decoded;
    }
  } catch {
    throw new ApiError(400, "INVALID_PATH", "Malformed URL-encoded path");
  }

  // Reject null bytes
  if (decodedPath.includes("\0")) {
    throw new ApiError(400, "INVALID_PATH", "File path contains prohibited null byte");
  }

  // Reject Windows drive letters (e.g. C:/ or c:\) and Windows UNC paths (\\server\share)
  if (/^[a-zA-Z]:/.test(decodedPath) || decodedPath.startsWith("\\\\")) {
    throw new ApiError(400, "INVALID_PATH", "Absolute Windows or UNC paths are prohibited");
  }

  // Normalize all directory separators to POSIX forward slash
  const unified = decodedPath.replace(/\\/g, "/");

  // Strip leading slashes to keep relative
  const withoutLeadingSlash = unified.replace(/^\/+/, "");

  // Use path.posix.normalize to resolve internal './' or clean consecutive slashes
  const normalized = path.posix.normalize(withoutLeadingSlash);

  // Traversal attack check: path must not escape the repository root
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new ApiError(400, "PATH_TRAVERSAL_DETECTED", "Directory traversal attempt detected");
  }

  // Reject empty path or root reference
  if (!normalized || normalized === ".") {
    throw new ApiError(400, "INVALID_PATH", "File path cannot be empty or root reference");
  }

  return normalized;
}
