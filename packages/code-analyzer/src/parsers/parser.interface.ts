import ts from "typescript";
import { ParserDiagnostic } from "../diagnostics/parser.diagnostics.js";

export type SupportedLanguage = "javascript" | "typescript" | "jsx" | "tsx";

export interface ParsedSource {
  filePath: string;
  language: SupportedLanguage;
  sourceFile: ts.SourceFile;
  sourceText: string;
  diagnostics: ParserDiagnostic[];
  lineCount: number;
}

export interface ParserAdapter {
  canParse(filePath: string): boolean;
  parse(filePath: string, sourceText: string): ParsedSource;
}
