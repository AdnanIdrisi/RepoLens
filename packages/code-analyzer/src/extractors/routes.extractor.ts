import ts from "typescript";
import { ParsedSource } from "../parsers/parser.interface.js";
import { buildSymbolId } from "../symbols/symbol-identity.js";

export interface ExtractedRoute {
  symbolId: string;
  filePath: string;
  httpMethod: string;
  routePath: string;
  handlers: string[];
  middlewares: string[];
  startLine: number;
  endLine: number;
}

const EXPRESS_ROUTE_METHODS = new Set([
  "get", "post", "put", "delete", "patch", "options", "head", "use", "all"
]);

export class RoutesExtractor {
  public extract(parsed: ParsedSource, repositoryId?: string, commitSha?: string): ExtractedRoute[] {
    const results: ExtractedRoute[] = [];
    const { sourceFile, filePath } = parsed;

    const getHandlerName = (arg: ts.Expression): string | null => {
      if (ts.isIdentifier(arg)) {
        return arg.text;
      }
      if (ts.isPropertyAccessExpression(arg)) {
        return `${arg.expression.getText(sourceFile)}.${arg.name.text}`;
      }
      if (ts.isFunctionExpression(arg) || ts.isArrowFunction(arg)) {
        return "inlineHandler";
      }
      return null;
    };

    const visit = (node: ts.Node) => {
      // Look for app.get('/path', ...) or router.post('/path', ...)
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text.toLowerCase();

        if (EXPRESS_ROUTE_METHODS.has(methodName) && node.arguments.length >= 2) {
          const firstArg = node.arguments[0];

          // Route path must be a string literal
          if (ts.isStringLiteral(firstArg)) {
            const routePath = firstArg.text;
            const handlers: string[] = [];
            const middlewares: string[] = [];

            // Remaining arguments are middlewares and final handler
            const remainingArgs = node.arguments.slice(1);
            for (let i = 0; i < remainingArgs.length; i++) {
              const name = getHandlerName(remainingArgs[i]);
              if (name) {
                if (i === remainingArgs.length - 1 && methodName !== "use") {
                  handlers.push(name);
                } else {
                  middlewares.push(name);
                }
              }
            }

            const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

            const symbolId = buildSymbolId({
              repositoryId,
              commitSha,
              filePath,
              kind: "route",
              name: `${methodName.toUpperCase()} ${routePath}`,
              startLine: startLine + 1
            });

            results.push({
              symbolId,
              filePath,
              httpMethod: methodName.toUpperCase(),
              routePath,
              handlers,
              middlewares,
              startLine: startLine + 1,
              endLine: endLine + 1
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return results;
  }
}
