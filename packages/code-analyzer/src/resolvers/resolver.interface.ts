import type { ImportResolutionStatus } from "@repolens/shared";

export interface ImportResolutionResult {
  specifier: string;
  importerPath: string;
  resolvedPath?: string;
  status: ImportResolutionStatus;
  diagnostic?: string;
}

export interface ModuleResolverContext {
  knownFilePaths: Set<string>;
  baseUrl?: string;
  pathAliases?: Record<string, string[]>;
}

export interface ModuleResolver {
  resolve(specifier: string, importerPath: string, context: ModuleResolverContext): ImportResolutionResult;
}
