import path from "node:path";
import { ModuleResolver, ModuleResolverContext, ImportResolutionResult } from "./resolver.interface.js";
import { RelativeImportResolver } from "./relative-import.resolver.js";
import { TypeScriptAliasResolver } from "./typescript-alias.resolver.js";
import { resolveFileWithExtensions } from "./extension-resolver.js";

const NODE_BUILTIN_MODULES = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
  "events", "fs", "fs/promises", "http", "http2", "https", "inspector",
  "module", "net", "os", "path", "path/posix", "path/win32", "perf_hooks",
  "process", "punycode", "querystring", "readline", "repl", "stream",
  "stream/promises", "stream/web", "string_decoder", "timers", "timers/promises",
  "tls", "trace_events", "tty", "url", "util", "v8", "vm", "wasi", "worker_threads",
  "zlib"
]);

export class UnifiedModuleResolver implements ModuleResolver {
  private relativeResolver = new RelativeImportResolver();
  private aliasResolver = new TypeScriptAliasResolver();

  public resolve(
    specifier: string,
    importerPath: string,
    context: ModuleResolverContext
  ): ImportResolutionResult {
    const trimmed = specifier.trim();

    // 1. Check Node built-in modules
    if (trimmed.startsWith("node:") || NODE_BUILTIN_MODULES.has(trimmed)) {
      return {
        specifier: trimmed,
        importerPath,
        status: "external"
      };
    }

    // 2. Relative imports
    if (trimmed.startsWith("./") || trimmed.startsWith("../")) {
      return this.relativeResolver.resolve(trimmed, importerPath, context);
    }

    // 3. TypeScript Path Aliases (e.g. @/...)
    const aliasResult = this.aliasResolver.resolve(trimmed, importerPath, context);
    if (aliasResult) {
      return aliasResult;
    }

    // 4. BaseUrl relative import check (e.g. "components/Button" if baseUrl="src")
    if (context.baseUrl) {
      const candidateFromBase = path.posix.normalize(path.posix.join(context.baseUrl, trimmed));
      const resolvedFromBase = resolveFileWithExtensions(candidateFromBase, context.knownFilePaths);
      if (resolvedFromBase) {
        return {
          specifier: trimmed,
          importerPath,
          resolvedPath: resolvedFromBase,
          status: "resolved"
        };
      }
    }

    // 5. Test direct path match in known files (e.g. absolute repository-root specifier)
    const directResolved = resolveFileWithExtensions(trimmed, context.knownFilePaths);
    if (directResolved) {
      return {
        specifier: trimmed,
        importerPath,
        resolvedPath: directResolved,
        status: "resolved"
      };
    }

    // 6. External npm package (e.g. "express", "react", "@google/genai", "lodash/get")
    // Non-relative specifiers not found within repository source files are external packages
    return {
      specifier: trimmed,
      importerPath,
      status: "external"
    };
  }
}
