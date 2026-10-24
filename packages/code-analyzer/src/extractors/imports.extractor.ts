import ts from "typescript";
import { ParsedSource } from "../parsers/parser.interface.js";

export interface ExtractedImport {
  importerPath: string;
  importedSpecifier: string;
  importedNames: string[];
  isDefault: boolean;
  isNamespace: boolean;
  isDynamic: boolean;
  startLine: number;
  endLine: number;
}

export class ImportsExtractor {
  public extract(parsed: ParsedSource): ExtractedImport[] {
    const results: ExtractedImport[] = [];
    const { sourceFile, filePath } = parsed;

    const visit = (node: ts.Node) => {
      // 1. ES Import Declaration: import ... from 'specifier'
      if (ts.isImportDeclaration(node)) {
        const specifier = node.moduleSpecifier;
        if (ts.isStringLiteral(specifier)) {
          const importedSpecifier = specifier.text;
          const importedNames: string[] = [];
          let isDefault = false;
          let isNamespace = false;

          const importClause = node.importClause;
          if (importClause) {
            // Default import: import Foo from '...'
            if (importClause.name) {
              importedNames.push(importClause.name.text);
              isDefault = true;
            }

            // Named imports or namespace import
            if (importClause.namedBindings) {
              if (ts.isNamespaceImport(importClause.namedBindings)) {
                importedNames.push(importClause.namedBindings.name.text);
                isNamespace = true;
              } else if (ts.isNamedImports(importClause.namedBindings)) {
                for (const element of importClause.namedBindings.elements) {
                  importedNames.push(element.name.text);
                }
              }
            }
          }

          const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

          results.push({
            importerPath: filePath,
            importedSpecifier,
            importedNames,
            isDefault,
            isNamespace,
            isDynamic: false,
            startLine: startLine + 1,
            endLine: endLine + 1
          });
        }
      }

      // 2. CommonJS require('specifier')
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const importedSpecifier = (node.arguments[0] as ts.StringLiteral).text;
        const importedNames: string[] = [];
        let isDefault = true;

        // Check variable declaration: const foo = require('...') or const { a, b } = require('...')
        const parent = node.parent;
        if (ts.isVariableDeclaration(parent) && parent.initializer === node) {
          if (ts.isIdentifier(parent.name)) {
            importedNames.push(parent.name.text);
          } else if (ts.isObjectBindingPattern(parent.name)) {
            isDefault = false;
            for (const element of parent.name.elements) {
              if (ts.isIdentifier(element.name)) {
                importedNames.push(element.name.text);
              }
            }
          }
        }

        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        results.push({
          importerPath: filePath,
          importedSpecifier,
          importedNames,
          isDefault,
          isNamespace: false,
          isDynamic: false,
          startLine: startLine + 1,
          endLine: endLine + 1
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return results;
  }
}
