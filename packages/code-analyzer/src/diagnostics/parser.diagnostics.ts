export interface ParserDiagnostic {
  filePath: string;
  code: string;
  message: string;
  startLine: number;
  startColumn: number;
  severity: "error" | "warning";
}
