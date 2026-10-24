import ts from "typescript";
import { ParsedSource } from "../parsers/parser.interface.js";
import { buildSymbolId } from "../symbols/symbol-identity.js";

export interface ExtractedMethod {
  symbolId: string;
  name: string;
  className: string;
  isStatic: boolean;
  isAsync: boolean;
  parameters: string[];
  startLine: number;
  endLine: number;
}

export interface ExtractedClass {
  symbolId: string;
  name: string;
  filePath: string;
  superClass?: string;
  isExported: boolean;
  methods: ExtractedMethod[];
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export class ClassesExtractor {
  public extract(parsed: ParsedSource, repositoryId?: string, commitSha?: string): ExtractedClass[] {
    const results: ExtractedClass[] = [];
    const { sourceFile, filePath } = parsed;

    const extractParams = (parameters: ts.NodeArray<ts.ParameterDeclaration>): string[] => {
      const names: string[] = [];
      for (const param of parameters) {
        if (ts.isIdentifier(param.name)) {
          names.push(param.name.text);
        }
      }
      return names;
    };

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || false;

        let superClass: string | undefined;
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.length > 0) {
              const expr = clause.types[0].expression;
              if (ts.isIdentifier(expr)) {
                superClass = expr.text;
              }
            }
          }
        }

        const classStart = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const classEnd = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const classStartLine = classStart.line + 1;
        const classEndLine = classEnd.line + 1;

        const classSymbolId = buildSymbolId({
          repositoryId,
          commitSha,
          filePath,
          kind: "class",
          name: className,
          startLine: classStartLine
        });

        const methods: ExtractedMethod[] = [];

        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
            const methodName = ts.isConstructorDeclaration(member)
              ? "constructor"
              : ts.isIdentifier(member.name)
              ? member.name.text
              : "anonymousMethod";

            const memberModifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
            const isStatic = memberModifiers?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.StaticKeyword) || false;
            const isAsync = memberModifiers?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.AsyncKeyword) || false;

            const mStart = sourceFile.getLineAndCharacterOfPosition(member.getStart());
            const mEnd = sourceFile.getLineAndCharacterOfPosition(member.getEnd());
            const mStartLine = mStart.line + 1;
            const mEndLine = mEnd.line + 1;

            const methodSymbolId = buildSymbolId({
              repositoryId,
              commitSha,
              filePath,
              kind: "method",
              name: methodName,
              scopePath: [className],
              startLine: mStartLine
            });

            methods.push({
              symbolId: methodSymbolId,
              name: methodName,
              className,
              isStatic,
              isAsync,
              parameters: extractParams(member.parameters),
              startLine: mStartLine,
              endLine: mEndLine
            });
          }
        }

        results.push({
          symbolId: classSymbolId,
          name: className,
          filePath,
          superClass,
          isExported: hasExport,
          methods,
          startLine: classStartLine,
          endLine: classEndLine,
          startColumn: classStart.character + 1,
          endColumn: classEnd.character + 1
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return results;
  }
}
