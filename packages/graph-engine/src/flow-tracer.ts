import type { CodeGraph } from "./graph.types.js";
import type { RouteRecord, TraceStep } from "@repolens/shared";

export interface FlowTraceOptions {
  route?: RouteRecord;
  routeId?: string;
  symbolId?: string;
  maxDepth?: number;
}

export class FlowTracer {
  /**
   * Statically traces an execution path starting from an Express route or symbol definition
   * through middlewares, controllers, service calls, and database operations.
   */
  public trace(graph: CodeGraph, options: FlowTraceOptions): {
    route?: RouteRecord;
    steps: TraceStep[];
    totalSteps: number;
    isComplete: boolean;
  } {
    const maxDepth = options.maxDepth ?? 6;
    const steps: TraceStep[] = [];
    const visited = new Set<string>();

    let currentRoute = options.route;

    // 1. If starting from route definition
    if (currentRoute) {
      steps.push({
        symbolId: currentRoute.path,
        filePath: currentRoute.filePath,
        startLine: currentRoute.startLine,
        endLine: currentRoute.startLine,
        label: `${currentRoute.method.toUpperCase()} ${currentRoute.path}`,
        relationship: "route_definition",
        category: "route",
        confidence: currentRoute.confidence,
        evidence: `Express route defined in ${currentRoute.filePath}:${currentRoute.startLine}`
      });

      // 2. Middlewares in registration sequence
      for (const midId of currentRoute.middlewareSymbolIds) {
        this.traverseSymbol(graph, midId, "middleware", "uses_middleware", steps, visited, 1, maxDepth);
      }

      // 3. Handlers in registration sequence
      for (const handlerId of currentRoute.handlerSymbolIds) {
        this.traverseSymbol(graph, handlerId, "controller", "routes_to", steps, visited, 1, maxDepth);
      }
    } else if (options.symbolId) {
      // Starting from a specified symbol
      this.traverseSymbol(graph, options.symbolId, "entry", "entry_point", steps, visited, 0, maxDepth);
    }

    return {
      route: currentRoute,
      steps,
      totalSteps: steps.length,
      isComplete: true
    };
  }

  private traverseSymbol(
    graph: CodeGraph,
    symbolId: string,
    initialCategory: string,
    initialRelationship: string,
    steps: TraceStep[],
    visited: Set<string>,
    currentDepth: number,
    maxDepth: number
  ): void {
    if (currentDepth > maxDepth || visited.has(symbolId)) return;
    visited.add(symbolId);

    const node = graph.nodes.get(symbolId);

    if (node) {
      const category = this.categorizeNode(node.label, node.filePath, initialCategory);
      steps.push({
        symbolId: node.id,
        filePath: node.filePath,
        startLine: node.startLine || 1,
        endLine: node.endLine || node.startLine || 1,
        label: node.label,
        relationship: initialRelationship,
        category,
        confidence: 1.0,
        evidence: `Direct AST definition in ${node.filePath}:${node.startLine || 1}`
      });

      // Traverse outgoing call/reference edges
      const outgoing = graph.outgoing.get(symbolId) || [];
      const callEdges = outgoing.filter(
        (e) => e.kind === "calls" || e.kind === "uses" || e.kind === "references" || e.kind === "routes_to"
      );

      for (const edge of callEdges) {
        const nextRel = edge.kind === "calls" ? "calls_function" : edge.kind;
        this.traverseSymbol(graph, edge.targetId, "service", nextRel, steps, visited, currentDepth + 1, maxDepth);
      }
    } else {
      // Unresolved or external symbol reference
      steps.push({
        symbolId,
        filePath: "external",
        startLine: 1,
        endLine: 1,
        label: symbolId.split("#").pop()?.split(":").pop() || symbolId,
        relationship: "unresolved_call",
        category: "external",
        confidence: 0.5,
        evidence: "External dependency or unresolved static symbol"
      });
    }
  }

  private categorizeNode(label: string, filePath: string, defaultCategory: string): string {
    const lowerLabel = label.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    // Database / Model pattern detection
    if (
      lowerPath.includes("/models/") ||
      lowerPath.includes("/repositories/") ||
      lowerPath.includes("/db/") ||
      lowerLabel.startsWith("find") ||
      lowerLabel.startsWith("save") ||
      lowerLabel.startsWith("delete") ||
      lowerLabel.startsWith("update") ||
      lowerLabel.startsWith("create") ||
      lowerLabel.includes("query")
    ) {
      return "model";
    }

    // Service pattern detection
    if (
      lowerPath.includes("/services/") ||
      lowerLabel.endsWith("service") ||
      lowerLabel.includes("manager") ||
      lowerLabel.includes("provider")
    ) {
      return "service";
    }

    // Controller pattern detection
    if (
      lowerPath.includes("/controllers/") ||
      lowerLabel.endsWith("controller") ||
      lowerLabel.endsWith("handler")
    ) {
      return "controller";
    }

    // Middleware pattern detection
    if (
      lowerPath.includes("/middleware/") ||
      lowerLabel.includes("auth") ||
      lowerLabel.includes("cors") ||
      lowerLabel.includes("guard")
    ) {
      return "middleware";
    }

    return defaultCategory;
  }
}
