import ts from "typescript";
import { ParserAdapter, ParsedSource } from "./parser.interface.js";
import { ParserDiagnostic } from "../diagnostics/parser.diagnostics.js";

export class JavaScriptParser implements ParserAdapter {
  public canParse(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return ext.endsWith(".js") || ext.endsWith(".mjs") || ext.endsWith(".cjs");
  }

  public parse(filePath: string, sourceText: string): ParsedSource {
    const diagnostics: ParserDiagnostic[] = [];

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true, // setParentNodes
      ts.ScriptKind.JS
    );

    // Extract syntax errors if any
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
      language: "javascript",
      sourceFile,
      sourceText,
      diagnostics,
      lineCount
    };
  }
}
