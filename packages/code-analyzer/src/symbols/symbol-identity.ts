import type { SymbolKind } from "@repolens/shared";

export interface SymbolIdentityParams {
  repositoryId?: string;
  commitSha?: string;
  filePath: string;
  kind: SymbolKind;
  name: string;
  scopePath?: string[];
  startLine: number;
}

/**
 * Builds a deterministic, scope-aware unique symbol identifier.
 * Ensures identical function names in different files or scopes never collide.
 */
export function buildSymbolId(params: SymbolIdentityParams): string {
  const repoPrefix = params.repositoryId && params.commitSha 
    ? `${params.repositoryId}@${params.commitSha.substring(0, 7)}:` 
    : "";
  
  const scope = params.scopePath && params.scopePath.length > 0 
    ? params.scopePath.join(".") + "." 
    : "";

  return `${repoPrefix}${params.filePath}#${params.kind}:${scope}${params.name}:${params.startLine}`;
}
