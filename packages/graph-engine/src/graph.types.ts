import type { GraphNode, GraphEdge, GraphEdgeKind, GraphNodeKind } from "@repolens/shared";

export interface CodeGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  outgoing: Map<string, GraphEdge[]>;
  incoming: Map<string, GraphEdge[]>;
}

export interface TraversalOptions {
  direction?: "forward" | "reverse";
  maxDepth?: number;
  limit?: number;
  edgeKinds?: GraphEdgeKind[];
  nodeKinds?: GraphNodeKind[];
}

export interface TraversalStep {
  node: GraphNode;
  depth: number;
  edge?: GraphEdge;
  path: string[];
}

export interface ShortestPathResult {
  found: boolean;
  distance: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SubgraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootId: string;
  totalNodes: number;
  totalEdges: number;
}
