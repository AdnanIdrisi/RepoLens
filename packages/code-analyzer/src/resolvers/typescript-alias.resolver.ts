import path from "node:path";
import { ImportResolutionResult, ModuleResolverContext } from "./resolver.interface.js";
import { resolveFileWithExtensions } from "./extension-resolver.js";

export class TypeScriptAliasResolver {
  public resolve(
    specifier: string,
    importerPath: string,
    context: ModuleResolverContext
  ): ImportResolutionResult | null {
    if (!context.pathAliases) {
      return null;
    }

    const baseUrl = context.baseUrl || "";

    for (const [aliasPattern, targetPatterns] of Object.entries(context.pathAliases)) {
      // Check wildcard prefix (e.g. "@/..." for "@/*")
      if (aliasPattern.endsWith("/*")) {
        const prefix = aliasPattern.slice(0, -2); // "@"
        if (specifier.startsWith(`${prefix}/`)) {
          const subPath = specifier.slice(prefix.length + 1);

          for (const targetPattern of targetPatterns) {
            const targetBase = targetPattern.endsWith("/*") ? targetPattern.slice(0, -2) : targetPattern;
            const candidates = [
              path.posix.normalize(path.posix.join(baseUrl, targetBase, subPath)),
              path.posix.normalize(path.posix.join(targetBase, subPath))
            ];

            for (const candidatePath of candidates) {
              const resolved = resolveFileWithExtensions(candidatePath, context.knownFilePaths);
              if (resolved) {
                return {
                  specifier,
                  importerPath,
                  resolvedPath: resolved,
                  status: "resolved"
                };
              }
            }
          }
        }
      } else if (aliasPattern === specifier) {
        // Exact alias match
        for (const targetPattern of targetPatterns) {
          const candidatePath = path.posix.normalize(path.posix.join(baseUrl, targetPattern));
          const resolved = resolveFileWithExtensions(candidatePath, context.knownFilePaths);
          if (resolved) {
            return {
              specifier,
              importerPath,
              resolvedPath: resolved,
              status: "resolved"
            };
          }
        }
      }
    }

    return null;
  }
}
