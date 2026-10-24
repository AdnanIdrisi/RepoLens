import crypto from "node:crypto";

export interface HashedContentMetadata {
  contentHash: string;
  sizeBytes: number;
  lineCount: number;
}

/**
 * Computes deterministic SHA-256 content hash, size in bytes, and line count
 * for source code text.
 */
export function computeContentHash(content: string): HashedContentMetadata {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const buffer = Buffer.from(content, "utf8");

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  // An empty string has line count 0, non-empty has at least 1 line
  const lineCount = content.length === 0 ? 0 : normalized.split("\n").length;

  return {
    contentHash: hash,
    sizeBytes,
    lineCount
  };
}
