import { describe, it, expect } from "vitest";
import { normalizeRepositoryPath } from "./path-normalizer.js";

describe("Path Normalizer & Directory Traversal Protection", () => {
  it("normalizes standard relative paths to POSIX", () => {
    expect(normalizeRepositoryPath("src/index.ts")).toBe("src/index.ts");
    expect(normalizeRepositoryPath("lib/utils/helper.js")).toBe("lib/utils/helper.js");
  });

  it("converts Windows directory separators to forward slashes", () => {
    expect(normalizeRepositoryPath("src\\controllers\\user.controller.ts")).toBe(
      "src/controllers/user.controller.ts"
    );
  });

  it("strips leading slashes and redundant ./ segments", () => {
    expect(normalizeRepositoryPath("./src/index.ts")).toBe("src/index.ts");
    expect(normalizeRepositoryPath("/src/index.ts")).toBe("src/index.ts");
    expect(normalizeRepositoryPath("///lib//express.js")).toBe("lib/express.js");
  });

  it("resolves safe internal dot segments", () => {
    expect(normalizeRepositoryPath("src/features/../index.ts")).toBe("src/index.ts");
  });

  it("strictly rejects path traversal escaping repository root", () => {
    expect(() => normalizeRepositoryPath("../secret.txt")).toThrow("Directory traversal");
    expect(() => normalizeRepositoryPath("../../etc/passwd")).toThrow("Directory traversal");
    expect(() => normalizeRepositoryPath("src/../../etc/shadow")).toThrow("Directory traversal");
  });

  it("detects and rejects URL-encoded path traversal attacks", () => {
    expect(() => normalizeRepositoryPath("%2e%2e/etc/passwd")).toThrow("Directory traversal");
    expect(() => normalizeRepositoryPath("%252e%252e/etc/passwd")).toThrow("Directory traversal");
  });

  it("rejects Windows drive letters and UNC paths", () => {
    expect(() => normalizeRepositoryPath("C:\\Windows\\System32")).toThrow(
      "Absolute Windows or UNC paths are prohibited"
    );
    expect(() => normalizeRepositoryPath("\\\\10.0.0.1\\share\\file")).toThrow(
      "Absolute Windows or UNC paths are prohibited"
    );
  });

  it("rejects null bytes", () => {
    expect(() => normalizeRepositoryPath("src/file.ts\0.exe")).toThrow("null byte");
  });

  it("rejects empty paths", () => {
    expect(() => normalizeRepositoryPath("")).toThrow("File path must be a non-empty string");
    expect(() => normalizeRepositoryPath(".")).toThrow("cannot be empty or root reference");
  });
});
