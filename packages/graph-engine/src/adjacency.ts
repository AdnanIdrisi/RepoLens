import type { GraphEdge, GraphEdgeKind } from "@repolens/shared";
import { CodeGraph } from "./graph.types.js";

export function getOutgoingEdges(
  graph: CodeGraph,
  nodeId: string,
  filterKinds?: GraphEdgeKind[]
): GraphEdge[] {
  const edges = graph.outgoing.get(nodeId) || [];
  if (!filterKinds || filterKinds.length === 0) {
    return edges;
  }
  const allowed = new Set(filterKinds);
  return edges.filter((e) => allowed.has(e.kind));
}

export function getIncomingEdges(
  graph: CodeGraph,
  nodeId: string,
  filterKinds?: GraphEdgeKind[]
): GraphEdge[] {
  const edges = graph.incoming.get(nodeId) || [];
  if (!filterKinds || filterKinds.length === 0) {
    return edges;
  }
  const allowed = new Set(filterKinds);
  return edges.filter((e) => allowed.has(e.kind));
}

export function getDegree(graph: CodeGraph, nodeId: string): { inDegree: number; outDegree: number } {
  const inDegree = (graph.incoming.get(nodeId) || []).length;
  const outDegree = (graph.outgoing.get(nodeId) || []).length;
  return { inDegree, outDegree };
}
