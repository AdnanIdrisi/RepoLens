import type { GraphNode, GraphEdge } from "@repolens/shared";
import { CodeGraph } from "./graph.types.js";

/**
 * Builds an in-memory CodeGraph with bidirectional adjacency maps.
 */
export function buildGraph(nodes: GraphNode[], edges: GraphEdge[]): CodeGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();
  const outgoing = new Map<string, GraphEdge[]>();
  const incoming = new Map<string, GraphEdge[]>();

  // Index all nodes
  for (const node of nodes) {
    nodeMap.set(node.id, node);
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  // Index edges with forward and reverse adjacency
  for (const edge of edges) {
    // Only accept edges whose endpoints exist in the node map
    if (!nodeMap.has(edge.sourceId) || !nodeMap.has(edge.targetId)) {
      continue;
    }

    // Deduplicate edge by ID
    if (!edgeMap.has(edge.id)) {
      edgeMap.set(edge.id, edge);

      const outList = outgoing.get(edge.sourceId) || [];
      outList.push(edge);
      outgoing.set(edge.sourceId, outList);

      const inList = incoming.get(edge.targetId) || [];
      inList.push(edge);
      incoming.set(edge.targetId, inList);
    }
  }

  return {
    nodes: nodeMap,
    edges: edgeMap,
    outgoing,
    incoming
  };
}
