import ts from "typescript";
import crypto from "node:crypto";
import type { CodeEntity } from "@repolens/shared";
import { ParsedSource } from "../parsers/parser.interface.js";
import { ExtractedImport } from "./imports.extractor.js";

export class EntitiesExtractor {
  /**
   * Extracts typed code entities aligned to AST declarations and functional code structures.
   */
  public extract(
    parsed: ParsedSource,
    imports: ExtractedImport[],
    repositoryId: string = "default",
    commitSha: string = "head"
  ): CodeEntity[] {
    const { sourceFile, filePath, sourceText } = parsed;
    const lines = sourceText.split(/\r?\n/);
    const results: CodeEntity[] = [];

    const importNames = imports.map((i) => i.importedSpecifier);

    const getLineRange = (node: ts.Node): { startLine: number; endLine: number } => {
      const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      return {
        startLine: startLine + 1,
        endLine: endLine + 1
      };
    };

    const getCodeSnippet = (startLine: number, endLine: number): string => {
      const slice = lines.slice(Math.max(0, startLine - 1), endLine);
      return slice.join("\n");
    };

    const hashContent = (text: string): string => {
      return crypto.createHash("sha256").update(text.trim()).digest("hex");
    };

    const collectCalls = (root: ts.Node): string[] => {
      const calls: string[] = [];
      const getCallee = (expr: ts.Expression): string => {
        if (ts.isIdentifier(expr)) return expr.text;
        if (ts.isPropertyAccessExpression(expr)) {
          return `${getCallee(expr.expression)}.${expr.name.text}`;
        }
        return "";
      };

      const visitCall = (node: ts.Node) => {
        if (ts.isCallExpression(node)) {
          const callee = getCallee(node.expression);
          if (callee && !calls.includes(callee)) {
            calls.push(callee);
          }
        }
        ts.forEachChild(node, visitCall);
      };

      visitCall(root);
      return calls;
    };

    const visit = (node: ts.Node, currentParent: string | null = null) => {
      // 1. Function Declaration
      if (ts.isFunctionDeclaration(node) && node.name) {
        const { startLine, endLine } = getLineRange(node);
        const code = getCodeSnippet(startLine, endLine);
        const name = node.name.text;
        const entityId = `${repositoryId}:${commitSha}:${filePath}:function:${name}:${startLine}`;

        results.push({
          repositoryId,
          commitSha,
          entityId,
          filePath,
          entityType: "function",
          entityName: name,
          startLine,
          endLine,
          parentEntity: currentParent,
          imports: importNames,
          calls: collectCalls(node),
          code,
          contentHash: hashContent(code)
        });

        // Recurse with function as parent
        ts.forEachChild(node, (child) => visit(child, name));
        return;
      }

      // 2. Class Declaration
      if (ts.isClassDeclaration(node) && node.name) {
        const { startLine, endLine } = getLineRange(node);
        const code = getCodeSnippet(startLine, endLine);
        const className = node.name.text;
        const entityId = `${repositoryId}:${commitSha}:${filePath}:class:${className}:${startLine}`;

        results.push({
          repositoryId,
          commitSha,
          entityId,
          filePath,
          entityType: "class",
          entityName: className,
          startLine,
          endLine,
          parentEntity: currentParent,
          imports: importNames,
          calls: collectCalls(node),
          code,
          contentHash: hashContent(code)
        });

        // Extract class methods as individual entities
        for (const member of node.members) {
          if ((ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) && member.body) {
            const memberRange = getLineRange(member);
            const memberCode = getCodeSnippet(memberRange.startLine, memberRange.endLine);
            const methodName = ts.isConstructorDeclaration(member)
              ? "constructor"
              : member.name && ts.isIdentifier(member.name)
              ? member.name.text
              : "anonymousMethod";

            const methodId = `${repositoryId}:${commitSha}:${filePath}:method:${className}.${methodName}:${memberRange.startLine}`;

            results.push({
              repositoryId,
              commitSha,
              entityId: methodId,
              filePath,
              entityType: "method",
              entityName: `${className}.${methodName}`,
              startLine: memberRange.startLine,
              endLine: memberRange.endLine,
              parentEntity: className,
              imports: importNames,
              calls: collectCalls(member),
              code: memberCode,
              contentHash: hashContent(memberCode)
            });
          }
        }
        return;
      }

      // 3. Arrow Function / Function Expression assigned to a const / let variable
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) &&
            ts.isIdentifier(decl.name)
          ) {
            const { startLine, endLine } = getLineRange(decl);
            const code = getCodeSnippet(startLine, endLine);
            const fnName = decl.name.text;
            const entityId = `${repositoryId}:${commitSha}:${filePath}:function:${fnName}:${startLine}`;

            results.push({
              repositoryId,
              commitSha,
              entityId,
              filePath,
              entityType: "function",
              entityName: fnName,
              startLine,
              endLine,
              parentEntity: currentParent,
              imports: importNames,
              calls: collectCalls(decl.initializer),
              code,
              contentHash: hashContent(code)
            });
          }
        }
      }

      // 4. Express Routes and Middleware Registration
      // app.use(...), router.use(...), app.get(...), router.post(...)
      if (ts.isCallExpression(node)) {
        if (ts.isPropertyAccessExpression(node.expression)) {
          const propName = node.expression.name.text;
          const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "use"];

          if (HTTP_METHODS.includes(propName.toLowerCase())) {
            const { startLine, endLine } = getLineRange(node);
            const code = getCodeSnippet(startLine, endLine);
            let routePath = "/";
            if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
              routePath = node.arguments[0].text;
            }

            const isMiddleware = propName.toLowerCase() === "use";
            const entityType = isMiddleware ? "middleware" : "route";
            const entityName = `${propName.toUpperCase()} ${routePath}`;
            const entityId = `${repositoryId}:${commitSha}:${filePath}:${entityType}:${entityName}:${startLine}`;

            results.push({
              repositoryId,
              commitSha,
              entityId,
              filePath,
              entityType,
              entityName,
              startLine,
              endLine,
              parentEntity: currentParent,
              imports: importNames,
              calls: collectCalls(node),
              code,
              contentHash: hashContent(code)
            });
          }
        }
      }

      // 5. Try/Catch Error Handling Blocks
      if (ts.isTryStatement(node) && node.catchClause) {
        const { startLine, endLine } = getLineRange(node);
        const code = getCodeSnippet(startLine, endLine);
        const entityId = `${repositoryId}:${commitSha}:${filePath}:error_handler:try_catch:${startLine}`;

        results.push({
          repositoryId,
          commitSha,
          entityId,
          filePath,
          entityType: "error_handler",
          entityName: "try_catch_block",
          startLine,
          endLine,
          parentEntity: currentParent,
          imports: importNames,
          calls: collectCalls(node),
          code,
          contentHash: hashContent(code)
        });
      }

      ts.forEachChild(node, (child) => visit(child, currentParent));
    };

    visit(sourceFile);
    return results;
  }
}

