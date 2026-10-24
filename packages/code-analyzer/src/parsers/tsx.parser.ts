import ts from "typescript";
import { ParserAdapter, ParsedSource } from "./parser.interface.js";
import { ParserDiagnostic } from "../diagnostics/parser.diagnostics.js";

export class TsxParser implements ParserAdapter {
  public canParse(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return ext.endsWith(".tsx") || ext.endsWith(".jsx");
  }

  public parse(filePath: string, sourceText: string): ParsedSource {
    const isJsx = filePath.toLowerCase().endsWith(".jsx");
    const diagnostics: ParserDiagnostic[] = [];

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true, // setParentNodes
      isJsx ? ts.ScriptKind.JSX : ts.ScriptKind.TSX
    );

    const parseDiagnostics = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics;
    if (parseDiagnostics && parseDiagnostics.length > 0) {
      for (const diag of parseDiagnostics) {
        const start = diag.start !== undefined ? sourceFile.getLineAndCharacterOfPosition(diag.start) : { line: 0, character: 0 };
        diagnostics.push({
          filePath,
          code: `TS${diag.code}`,
          message: ts.flattenDiagnosticMessageText(diag.messageText, "\n"),
          startLine: start.line + 1,
          startColumn: start.character + 1,
          severity: diag.category === ts.DiagnosticCategory.Error ? "error" : "warning"
        });
      }
    }

    const lineCount = sourceFile.getLineStarts().length;

    return {
      filePath,
      language: isJsx ? "jsx" : "tsx",
      sourceFile,
      sourceText,
      diagnostics,
      lineCount
    };
  }
}
