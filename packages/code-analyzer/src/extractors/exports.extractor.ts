import ts from "typescript";
import { ParsedSource } from "../parsers/parser.interface.js";

export interface ExtractedExport {
  filePath: string;
  name: string;
  localName?: string;
  isDefault: boolean;
  isReExport: boolean;
  reExportModuleSpecifier?: string;
  startLine: number;
  endLine: number;
}

export class ExportsExtractor {
  public extract(parsed: ParsedSource): ExtractedExport[] {
    const results: ExtractedExport[] = [];
    const { sourceFile, filePath } = parsed;

    const visit = (node: ts.Node) => {
      // 1. Export Declaration: export { a, b as c } from './module'
      if (ts.isExportDeclaration(node)) {
        let reExportModuleSpecifier: string | undefined;
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          reExportModuleSpecifier = node.moduleSpecifier.text;
        }

        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            results.push({
              filePath,
              name: element.name.text,
              isDefault: element.name.text === "default",
              isReExport: !!reExportModuleSpecifier,
              reExportModuleSpecifier,
              startLine: startLine + 1,
              endLine: endLine + 1
            });
          }
        }
      }

      // 2. Export default: export default foo; or export default function() {}
      if (ts.isExportAssignment(node)) {
        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        let localName: string | undefined;
        if (ts.isIdentifier(node.expression)) {
          localName = node.expression.text;
        }

        results.push({
          filePath,
          name: "default",
          localName,
          isDefault: true,
          isReExport: false,
          startLine: startLine + 1,
          endLine: endLine + 1
        });
      }

      // 3. Declarations with 'export' or 'default' modifier
      const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
      const hasExportModifier = modifiers?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.ExportKeyword);
      const hasDefaultModifier = modifiers?.some((m: ts.Modifier) => m.kind === ts.SyntaxKind.DefaultKeyword);

      if (hasExportModifier) {
        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        if (ts.isFunctionDeclaration(node) && node.name) {
          results.push({
            filePath,
            name: node.name.text,
            isDefault: !!hasDefaultModifier,
            isReExport: false,
            startLine: startLine + 1,
            endLine: endLine + 1
          });
        } else if (ts.isClassDeclaration(node) && node.name) {
          results.push({
            filePath,
            name: node.name.text,
            isDefault: !!hasDefaultModifier,
            isReExport: false,
            startLine: startLine + 1,
            endLine: endLine + 1
          });
        } else if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations) {
            if (ts.isIdentifier(declaration.name)) {
              results.push({
                filePath,
                name: declaration.name.text,
                isDefault: false,
                isReExport: false,
                startLine: startLine + 1,
                endLine: endLine + 1
              });
            }
          }
        }
      }

      // 4. CommonJS module.exports = ... or exports.foo = ...
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left)
      ) {
        const left = node.left;
        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        // module.exports.foo = ... or exports.foo = ...
        if (
          (ts.isIdentifier(left.expression) && left.expression.text === "exports") ||
          (ts.isPropertyAccessExpression(left.expression) &&
            ts.isIdentifier(left.expression.expression) &&
            left.expression.expression.text === "module" &&
            left.expression.name.text === "exports")
        ) {
          results.push({
            filePath,
            name: left.name.text,
            isDefault: false,
            isReExport: false,
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
