import ts from "typescript";
import { ParsedSource } from "../parsers/parser.interface.js";
import { buildSymbolId } from "../symbols/symbol-identity.js";

export interface ExtractedFunction {
  symbolId: string;
  name: string;
  qualifiedName: string;
  filePath: string;
  kind: "function" | "callback";
  isAsync: boolean;
  isExported: boolean;
  parameters: string[];
  scopePath: string[];
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export class FunctionsExtractor {
  public extract(parsed: ParsedSource, repositoryId?: string, commitSha?: string): ExtractedFunction[] {
    const results: ExtractedFunction[] = [];
    const { sourceFile, filePath } = parsed;

    const extractParams = (parameters: ts.NodeArray<ts.ParameterDeclaration>): string[] => {
      const names: string[] = [];
      for (const param of parameters) {
        if (ts.isIdentifier(param.name)) {
          names.push(param.name.text);
        } else if (ts.isObjectBindingPattern(param.name)) {
          names.push("{...}");
        }
      }
      return names;
    };

    const traverse = (node: ts.Node, currentScope: string[]) => {
      // 1. Function Declaration: function foo() {}
      if (ts.isFunctionDeclaration(node)) {
        const name = node.name ? node.name.text : "anonymous";
        const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false;
        const isAsync = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || false;

        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const startLine = start.line + 1;
        const endLine = end.line + 1;

        const scopePath = [...currentScope];
        const qualifiedName = scopePath.length > 0 ? `${scopePath.join(".")}.${name}` : name;
        const symbolId = buildSymbolId({
          repositoryId,
          commitSha,
          filePath,
          kind: "function",
          name,
          scopePath,
          startLine
        });

        results.push({
          symbolId,
          name,
          qualifiedName,
          filePath,
          kind: name === "anonymous" ? "callback" : "function",
          isAsync,
          isExported: hasExport,
          parameters: extractParams(node.parameters),
          scopePath,
          startLine,
          endLine,
          startColumn: start.character + 1,
          endColumn: end.character + 1
        });

        if (node.body) {
          ts.forEachChild(node.body, (child) => traverse(child, [...scopePath, name]));
        }
        return;
      }

      // 2. Variable Statement with Arrow Function or Function Expression: const foo = () => {}
      if (ts.isVariableStatement(node)) {
        const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false;

        for (const declaration of node.declarationList.declarations) {
          if (
            ts.isIdentifier(declaration.name) &&
            declaration.initializer &&
            (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
          ) {
            const funcNode = declaration.initializer;
            const name = declaration.name.text;
            const funcModifiers = ts.canHaveModifiers(funcNode) ? ts.getModifiers(funcNode) : undefined;
            const isAsync = funcModifiers?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.AsyncKeyword) || false;

            const start = sourceFile.getLineAndCharacterOfPosition(declaration.getStart());
            const end = sourceFile.getLineAndCharacterOfPosition(declaration.getEnd());
            const startLine = start.line + 1;
            const endLine = end.line + 1;

            const scopePath = [...currentScope];
            const qualifiedName = scopePath.length > 0 ? `${scopePath.join(".")}.${name}` : name;
            const symbolId = buildSymbolId({
              repositoryId,
              commitSha,
              filePath,
              kind: "function",
              name,
              scopePath,
              startLine
            });

            results.push({
              symbolId,
              name,
              qualifiedName,
              filePath,
              kind: "function",
              isAsync,
              isExported: hasExport,
              parameters: extractParams(funcNode.parameters),
              scopePath,
              startLine,
              endLine,
              startColumn: start.character + 1,
              endColumn: end.character + 1
            });

            if (funcNode.body) {
              ts.forEachChild(funcNode.body, (child) => traverse(child, [...scopePath, name]));
            }
            continue;
          }
        }
      }

      ts.forEachChild(node, (child) => traverse(child, currentScope));
    };

    traverse(sourceFile, []);
    return results;
  }
}
