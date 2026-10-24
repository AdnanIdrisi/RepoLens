import ts from "typescript";
import { ParsedSource } from "../parsers/parser.interface.js";

export interface ExtractedCall {
  filePath: string;
  calleeName: string;
  argumentCount: number;
  startLine: number;
  endLine: number;
}

export class CallsExtractor {
  public extract(parsed: ParsedSource): ExtractedCall[] {
    const results: ExtractedCall[] = [];
    const { sourceFile, filePath } = parsed;

    const getCalleeName = (expr: ts.Expression): string => {
      if (ts.isIdentifier(expr)) {
        return expr.text;
      }
      if (ts.isPropertyAccessExpression(expr)) {
        const target = getCalleeName(expr.expression);
        return `${target}.${expr.name.text}`;
      }
      return "anonymousCall";
    };

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const calleeName = getCalleeName(node.expression);

        // Filter out require calls which are handled by imports extractor
        if (calleeName !== "require") {
          const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

          results.push({
            filePath,
            calleeName,
            argumentCount: node.arguments.length,
            startLine: startLine + 1,
            endLine: endLine + 1
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return results;
  }
}
