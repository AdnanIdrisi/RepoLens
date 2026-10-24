import { FileAnalysisResult } from "../analyzer.js";
import { ImportResolutionResult } from "./resolver.interface.js";

export interface ResolvedSymbolReference {
  importerPath: string;
  importedName: string;
  targetFilePath: string;
  targetSymbolId?: string;
  isResolved: boolean;
  diagnostic?: string;
}

export class SymbolResolver {
  /**
   * Constructs repository-wide export table mapping filePath -> (exportedName -> symbolId).
   */
  public buildExportTable(analyzedFiles: FileAnalysisResult[]): Map<string, Map<string, string>> {
    const exportTable = new Map<string, Map<string, string>>();

    for (const file of analyzedFiles) {
      const fileExports = new Map<string, string>();

      // Index declared symbols in this file by name
      const symbolsByName = new Map<string, string>();
      for (const sym of file.symbols) {
        symbolsByName.set(sym.name, sym.symbolId);
        if (sym.qualifiedName) {
          symbolsByName.set(sym.qualifiedName, sym.symbolId);
        }
      }

      // Map exported identifiers to their symbolId
      for (const exp of file.exports) {
        if (exp.isDefault) {
          // Default export can point to local name or generic default
          const defaultTarget = exp.localName ? symbolsByName.get(exp.localName) : undefined;
          fileExports.set("default", defaultTarget || symbolsByName.get("default") || `${file.filePath}#default`);
        } else {
          const symId = symbolsByName.get(exp.name);
          if (symId) {
            fileExports.set(exp.name, symId);
          } else if (exp.localName && symbolsByName.has(exp.localName)) {
            fileExports.set(exp.name, symbolsByName.get(exp.localName)!);
          }
        }
      }

      exportTable.set(file.filePath, fileExports);
    }

    return exportTable;
  }

  /**
   * Connects imported symbol names in an importing file directly to the declared symbol ID
   * in the resolved target file.
   */
  public resolveImportSymbols(
    importerFile: FileAnalysisResult,
    resolvedImports: ImportResolutionResult[],
    exportTable: Map<string, Map<string, string>>
  ): ResolvedSymbolReference[] {
    const results: ResolvedSymbolReference[] = [];

    // Map resolved specifiers to target file paths
    const specifierToTarget = new Map<string, string>();
    for (const imp of resolvedImports) {
      if (imp.status === "resolved" && imp.resolvedPath) {
        specifierToTarget.set(imp.specifier, imp.resolvedPath);
      }
    }

    for (const imp of importerFile.imports) {
      const targetFilePath = specifierToTarget.get(imp.importedSpecifier);
      if (!targetFilePath) continue;

      const targetExports = exportTable.get(targetFilePath);

      for (const importedName of imp.importedNames) {
        const lookupKey = imp.isDefault ? "default" : importedName;
        const targetSymbolId = targetExports ? targetExports.get(lookupKey) : undefined;

        if (targetSymbolId) {
          results.push({
            importerPath: importerFile.filePath,
            importedName,
            targetFilePath,
            targetSymbolId,
            isResolved: true
          });
        } else {
          results.push({
            importerPath: importerFile.filePath,
            importedName,
            targetFilePath,
            isResolved: false,
            diagnostic: `Exported symbol '${lookupKey}' not found in target file '${targetFilePath}'`
          });
        }
      }
    }

    return results;
  }
}
