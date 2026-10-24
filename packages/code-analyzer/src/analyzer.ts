import { SourceParser } from "./parsers/source.parser.js";
import { ImportsExtractor, ExtractedImport } from "./extractors/imports.extractor.js";
import { ExportsExtractor, ExtractedExport } from "./extractors/exports.extractor.js";
import { FunctionsExtractor, ExtractedFunction } from "./extractors/functions.extractor.js";
import { ClassesExtractor, ExtractedClass } from "./extractors/classes.extractor.js";
import { CallsExtractor, ExtractedCall } from "./extractors/calls.extractor.js";
import { RoutesExtractor, ExtractedRoute } from "./extractors/routes.extractor.js";
import { ParserDiagnostic } from "./diagnostics/parser.diagnostics.js";
import type { SymbolRecord } from "@repolens/shared";

export interface FileAnalysisResult {
  filePath: string;
  language: string;
  lineCount: number;
  imports: ExtractedImport[];
  exports: ExtractedExport[];
  functions: ExtractedFunction[];
  classes: ExtractedClass[];
  calls: ExtractedCall[];
  routes: ExtractedRoute[];
  symbols: SymbolRecord[];
  diagnostics: ParserDiagnostic[];
}

export class CodeAnalyzer {
  private parser: SourceParser;
  private importsExtractor: ImportsExtractor;
  private exportsExtractor: ExportsExtractor;
  private functionsExtractor: FunctionsExtractor;
  private classesExtractor: ClassesExtractor;
  private callsExtractor: CallsExtractor;
  private routesExtractor: RoutesExtractor;

  constructor() {
    this.parser = new SourceParser();
    this.importsExtractor = new ImportsExtractor();
    this.exportsExtractor = new ExportsExtractor();
    this.functionsExtractor = new FunctionsExtractor();
    this.classesExtractor = new ClassesExtractor();
    this.callsExtractor = new CallsExtractor();
    this.routesExtractor = new RoutesExtractor();
  }

  /**
   * Analyzes source code and extracts all syntax declarations, symbols, and diagnostics.
   * Safe: syntax errors in one file will produce diagnostics without throwing an uncaught exception.
   */
  public analyzeFile(
    filePath: string,
    sourceText: string,
    repositoryId: string = "default",
    commitSha: string = "head"
  ): FileAnalysisResult {
    const parsed = this.parser.parse(filePath, sourceText);

    const imports = this.importsExtractor.extract(parsed);
    const exports = this.exportsExtractor.extract(parsed);
    const functions = this.functionsExtractor.extract(parsed, repositoryId, commitSha);
    const classes = this.classesExtractor.extract(parsed, repositoryId, commitSha);
    const calls = this.callsExtractor.extract(parsed);
    const routes = this.routesExtractor.extract(parsed, repositoryId, commitSha);

    // Build unified SymbolRecord list conforming to @repolens/shared
    const symbols: SymbolRecord[] = [];

    // Add function symbols
    for (const fn of functions) {
      symbols.push({
        repositoryId,
        commitSha,
        symbolId: fn.symbolId,
        filePath,
        name: fn.name,
        qualifiedName: fn.qualifiedName,
        kind: fn.kind,
        startLine: fn.startLine,
        endLine: fn.endLine,
        startColumn: fn.startColumn,
        endColumn: fn.endColumn,
        exported: fn.isExported
      });
    }

    // Add class and method symbols
    for (const cls of classes) {
      symbols.push({
        repositoryId,
        commitSha,
        symbolId: cls.symbolId,
        filePath,
        name: cls.name,
        qualifiedName: cls.name,
        kind: "class",
        startLine: cls.startLine,
        endLine: cls.endLine,
        startColumn: cls.startColumn,
        endColumn: cls.endColumn,
        exported: cls.isExported
      });

      for (const m of cls.methods) {
        symbols.push({
          repositoryId,
          commitSha,
          symbolId: m.symbolId,
          filePath,
          name: m.name,
          qualifiedName: `${cls.name}.${m.name}`,
          kind: "method",
          startLine: m.startLine,
          endLine: m.endLine,
          parentSymbolId: cls.symbolId,
          exported: cls.isExported
        });
      }
    }

    // Add route symbols
    for (const route of routes) {
      symbols.push({
        repositoryId,
        commitSha,
        symbolId: route.symbolId,
        filePath,
        name: `${route.httpMethod} ${route.routePath}`,
        qualifiedName: `${route.httpMethod} ${route.routePath}`,
        kind: "route",
        startLine: route.startLine,
        endLine: route.endLine,
        exported: true
      });
    }

    return {
      filePath,
      language: parsed.language,
      lineCount: parsed.lineCount,
      imports,
      exports,
      functions,
      classes,
      calls,
      routes,
      symbols,
      diagnostics: parsed.diagnostics
    };
  }
}
