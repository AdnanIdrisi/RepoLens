import { describe, it, expect } from "vitest";
import { computeContentHash } from "./hasher.js";

describe("Content Hasher & Metadata Calculator", () => {
  it("computes deterministic SHA-256 hash", () => {
    const content = "console.log('Hello RepoLens');\n";
    const result1 = computeContentHash(content);
    const result2 = computeContentHash(content);

    expect(result1.contentHash).toBe(result2.contentHash);
    expect(result1.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result1.sizeBytes).toBe(Buffer.byteLength(content, "utf8"));
  });

  it("handles Windows CRLF and Unix LF line counting correctly", () => {
    const unixContent = "line 1\nline 2\nline 3";
    const windowsContent = "line 1\r\nline 2\r\nline 3";

    expect(computeContentHash(unixContent).lineCount).toBe(3);
    expect(computeContentHash(windowsContent).lineCount).toBe(3);
  });

  it("handles empty files correctly", () => {
    const emptyResult = computeContentHash("");
    expect(emptyResult.lineCount).toBe(0);
    expect(emptyResult.sizeBytes).toBe(0);
    expect(emptyResult.contentHash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" // SHA-256 of empty string
    );
  });

  it("computes accurate byte length for multi-byte unicode", () => {
    const unicodeContent = "const emoji = '🚀';\n";
    const result = computeContentHash(unicodeContent);

    expect(result.sizeBytes).toBe(Buffer.byteLength(unicodeContent, "utf8"));
    expect(result.lineCount).toBe(2);
  });
});
