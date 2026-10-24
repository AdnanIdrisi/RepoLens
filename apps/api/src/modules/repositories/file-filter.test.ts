import { describe, it, expect } from "vitest";
import { filterFile, MAX_FILE_SIZE_BYTES } from "./file-filter.js";

describe("File Filter Pipeline", () => {
  it("includes supported source code files", () => {
    expect(filterFile("src/index.ts")).toEqual({
      isIncluded: true,
      language: "typescript"
    });
    expect(filterFile("src/components/Button.tsx")).toEqual({
      isIncluded: true,
      language: "tsx"
    });
    expect(filterFile("server/app.js")).toEqual({
      isIncluded: true,
      language: "javascript"
    });
    expect(filterFile("package.json")).toEqual({
      isIncluded: true,
      language: "json"
    });
  });

  it("excludes files within vendor and dependency directories", () => {
    const nodeModulesResult = filterFile("node_modules/express/index.js");
    expect(nodeModulesResult.isIncluded).toBe(false);
    expect(nodeModulesResult.exclusionReason).toContain("node_modules");

    const distResult = filterFile("dist/bundle.js");
    expect(distResult.isIncluded).toBe(false);
    expect(distResult.exclusionReason).toContain("dist");

    const gitResult = filterFile(".git/config");
    expect(gitResult.isIncluded).toBe(false);
  });

  it("excludes secret-bearing and sensitive environment files", () => {
    expect(filterFile(".env").isIncluded).toBe(false);
    expect(filterFile(".env.local").isIncluded).toBe(false);
    expect(filterFile(".env.production").isIncluded).toBe(false);
    expect(filterFile("server.key").isIncluded).toBe(false);
    expect(filterFile("id_rsa").isIncluded).toBe(false);
  });

  it("excludes lockfiles from indexing", () => {
    const lockResult = filterFile("package-lock.json");
    expect(lockResult.isIncluded).toBe(false);
    expect(lockResult.exclusionReason).toContain("Lockfile");

    expect(filterFile("yarn.lock").isIncluded).toBe(false);
    expect(filterFile("pnpm-lock.yaml").isIncluded).toBe(false);
  });

  it("excludes minified artifacts and bundles", () => {
    const minResult = filterFile("public/vendor.min.js");
    expect(minResult.isIncluded).toBe(false);
    expect(minResult.exclusionReason).toContain("Minified");
  });

  it("excludes binary and media files", () => {
    expect(filterFile("assets/logo.png").isIncluded).toBe(false);
    expect(filterFile("docs/manual.pdf").isIncluded).toBe(false);
    expect(filterFile("build/app.exe").isIncluded).toBe(false);
  });

  it("excludes files exceeding the maximum size limit", () => {
    const oversized = MAX_FILE_SIZE_BYTES + 1024;
    const result = filterFile("src/huge-generated.ts", oversized);
    expect(result.isIncluded).toBe(false);
    expect(result.exclusionReason).toContain("exceeds limit");
  });
});
