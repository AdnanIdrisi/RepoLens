import path from "node:path";
import { ImportResolutionResult, ModuleResolverContext } from "./resolver.interface.js";
import { resolveFileWithExtensions } from "./extension-resolver.js";

export class RelativeImportResolver {
  public resolve(
    specifier: string,
    importerPath: string,
    context: ModuleResolverContext
  ): ImportResolutionResult {
    const importerDir = path.posix.dirname(importerPath);
    const candidatePath = path.posix.normalize(path.posix.join(importerDir, specifier));

    const resolved = resolveFileWithExtensions(candidatePath, context.knownFilePaths);

    if (resolved) {
      return {
        specifier,
        importerPath,
        resolvedPath: resolved,
        status: "resolved"
      };
    }

    return {
      specifier,
      importerPath,
      status: "unresolved",
      diagnostic: `Cannot locate relative import target '${specifier}' from '${importerPath}'`
    };
  }
}
