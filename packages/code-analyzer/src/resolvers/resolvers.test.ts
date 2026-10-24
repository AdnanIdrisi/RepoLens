import { describe, it, expect } from "vitest";
import { UnifiedModuleResolver } from "./module-resolver.js";
import { SymbolResolver } from "./symbol-resolver.js";
import { CodeAnalyzer } from "../analyzer.js";

describe("Module and Symbol Resolvers", () => {
  const resolver = new UnifiedModuleResolver();
  const knownFiles = new Set([
    "src/app.ts",
    "src/controllers/auth.controller.ts",
    "src/middleware/auth.ts",
    "src/routes/index.ts",
    "src/services/UserService.ts"
  ]);

  const context = {
    knownFilePaths: knownFiles,
    baseUrl: "src",
    pathAliases: {
      "@/*": ["src/*"]
    }
  };

  it("resolves relative imports with matching or omitted extensions", () => {
    const res1 = resolver.resolve("./controllers/auth.controller", "src/app.ts", context);
    expect(res1.status).toBe("resolved");
    expect(res1.resolvedPath).toBe("src/controllers/auth.controller.ts");

    // TypeScript ESM rewrite rule: import './auth.js' resolving to 'auth.ts'
    const res2 = resolver.resolve("./controllers/auth.controller.js", "src/app.ts", context);
    expect(res2.status).toBe("resolved");
    expect(res2.resolvedPath).toBe("src/controllers/auth.controller.ts");
  });

  it("resolves directory index files", () => {
    const res = resolver.resolve("./routes", "src/app.ts", context);
    expect(res.status).toBe("resolved");
    expect(res.resolvedPath).toBe("src/routes/index.ts");
  });

  it("resolves TypeScript tsconfig path aliases", () => {
    const res = resolver.resolve("@/services/UserService", "src/app.ts", context);
    expect(res.status).toBe("resolved");
    expect(res.resolvedPath).toBe("src/services/UserService.ts");
  });

  it("classifies external npm packages as external without creating internal files", () => {
    const res1 = resolver.resolve("express", "src/app.ts", context);
    expect(res1.status).toBe("external");
    expect(res1.resolvedPath).toBeUndefined();

    const res2 = resolver.resolve("@google/genai", "src/app.ts", context);
    expect(res2.status).toBe("external");
  });

  it("classifies Node.js built-in modules as external", () => {
    const res1 = resolver.resolve("node:crypto", "src/app.ts", context);
    expect(res1.status).toBe("external");

    const res2 = resolver.resolve("path", "src/app.ts", context);
    expect(res2.status).toBe("external");
  });

  it("classifies missing internal targets as unresolved with diagnostic", () => {
    const res = resolver.resolve("./missing/file.js", "src/app.ts", context);
    expect(res.status).toBe("unresolved");
    expect(res.diagnostic).toContain("Cannot locate relative import target");
  });

  it("resolves cross-file imported symbols to declared symbol IDs", () => {
    const analyzer = new CodeAnalyzer();

    const authFileCode = `
export function loginUser(req: any, res: any) {}
export function registerUser(req: any, res: any) {}
    `;
    const appFileCode = `
import { loginUser, missingFunction } from './controllers/auth.controller.js';
loginUser(req, res);
    `;

    const analyzedAuth = analyzer.analyzeFile("src/controllers/auth.controller.ts", authFileCode, "repo-1", "sha-1");
    const analyzedApp = analyzer.analyzeFile("src/app.ts", appFileCode, "repo-1", "sha-1");

    const symbolResolver = new SymbolResolver();
    const exportTable = symbolResolver.buildExportTable([analyzedAuth, analyzedApp]);

    expect(exportTable.get("src/controllers/auth.controller.ts")?.has("loginUser")).toBe(true);

    const resolvedImports = [
      {
        specifier: "./controllers/auth.controller.js",
        importerPath: "src/app.ts",
        resolvedPath: "src/controllers/auth.controller.ts",
        status: "resolved" as const
      }
    ];

    const symbolRefs = symbolResolver.resolveImportSymbols(analyzedApp, resolvedImports, exportTable);
    expect(symbolRefs.length).toBe(2);

    const loginRef = symbolRefs.find((r) => r.importedName === "loginUser");
    expect(loginRef?.isResolved).toBe(true);
    expect(loginRef?.targetSymbolId).toContain("loginUser");

    const missingRef = symbolRefs.find((r) => r.importedName === "missingFunction");
    expect(missingRef?.isResolved).toBe(false);
    expect(missingRef?.diagnostic).toContain("not found");
  });
});
