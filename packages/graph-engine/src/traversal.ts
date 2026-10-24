import type { GraphNode, GraphEdge } from "@repolens/shared";
import {
  CodeGraph,
  TraversalOptions,
  TraversalStep,
  ShortestPathResult,
  SubgraphResult
} from "./graph.types.js";
import { getOutgoingEdges, getIncomingEdges } from "./adjacency.js";

/**
 * Breadth-First Search supporting forward and reverse traversal, cycle detection,
 * maxDepth bounding, and kind filtering.
 */
export function bfs(
  graph: CodeGraph,
  startId: string,
  options: TraversalOptions = {}
): TraversalStep[] {
  const startNode = graph.nodes.get(startId);
  if (!startNode) return [];

  const direction = options.direction || "forward";
  const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 10;
  const limit = options.limit !== undefined ? options.limit : 1000;

  const results: TraversalStep[] = [];
  const visited = new Set<string>([startId]);

  // Queue holds: [nodeId, currentDepth, lastEdge, pathArray]
  const queue: Array<[string, number, GraphEdge | undefined, string[]]> = [
    [startId, 0, undefined, [startId]]
  ];

  while (queue.length > 0 && results.length < limit) {
    const [currentId, depth, edge, path] = queue.shift()!;
    const currentNode = graph.nodes.get(currentId);
    if (!currentNode) continue;

    // Filter by node kind if specified
    const matchesNodeKind = !options.nodeKinds || options.nodeKinds.includes(currentNode.kind);
    if (matchesNodeKind && currentId !== startId) {
      results.push({
        node: currentNode,
        depth,
        edge,
        path
      });
    }

    if (depth >= maxDepth) continue;

    // Fetch relevant edges depending on traversal direction
    const edges = direction === "forward"
      ? getOutgoingEdges(graph, currentId, options.edgeKinds)
      : getIncomingEdges(graph, currentId, options.edgeKinds);

    for (const nextEdge of edges) {
      const neighborId = direction === "forward" ? nextEdge.targetId : nextEdge.sourceId;

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([neighborId, depth + 1, nextEdge, [...path, neighborId]]);
      }
    }
  }

  return results;
}

/**
 * Depth-First Search with cycle protection and depth limit.
 */
export function dfs(
  graph: CodeGraph,
  startId: string,
  options: TraversalOptions = {}
): TraversalStep[] {
  const startNode = graph.nodes.get(startId);
  if (!startNode) return [];

  const direction = options.direction || "forward";
  const maxDepth = options.maxDepth !== undefined ? options.maxDepth : 10;
  const limit = options.limit !== undefined ? options.limit : 1000;

  const results: TraversalStep[] = [];
  const visited = new Set<string>([startId]);

  const stack: Array<[string, number, GraphEdge | undefined, string[]]> = [
    [startId, 0, undefined, [startId]]
  ];

  while (stack.length > 0 && results.length < limit) {
    const [currentId, depth, edge, path] = stack.pop()!;
    const currentNode = graph.nodes.get(currentId);
    if (!currentNode) continue;

    if (currentId !== startId) {
      results.push({
        node: currentNode,
        depth,
        edge,
        path
      });
    }

    if (depth >= maxDepth) continue;

    const edges = direction === "forward"
      ? getOutgoingEdges(graph, currentId, options.edgeKinds)
      : getIncomingEdges(graph, currentId, options.edgeKinds);

    for (const nextEdge of edges) {
      const neighborId = direction === "forward" ? nextEdge.targetId : nextEdge.sourceId;
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        stack.push([neighborId, depth + 1, nextEdge, [...path, neighborId]]);
      }
    }
  }

  return results;
}

/**
 * Finds the shortest path between two nodes using unweighted BFS.
 */
export function findShortestPath(
  graph: CodeGraph,
  sourceId: string,
  targetId: string,
  options: Pick<TraversalOptions, "edgeKinds"> = {}
): ShortestPathResult {
  if (sourceId === targetId) {
    const node = graph.nodes.get(sourceId);
    return {
      found: !!node,
      distance: 0,
      nodes: node ? [node] : [],
      edges: []
    };
  }

  const queue: string[] = [sourceId];
  const visited = new Set<string>([sourceId]);
  const parent = new Map<string, { prevNodeId: string; edge: GraphEdge }>();

  let found = false;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (currentId === targetId) {
      found = true;
      break;
    }

    const outEdges = getOutgoingEdges(graph, currentId, options.edgeKinds);
    for (const edge of outEdges) {
      const nextId = edge.targetId;
      if (!visited.has(nextId)) {
        visited.add(nextId);
        parent.set(nextId, { prevNodeId: currentId, edge });
        queue.push(nextId);
      }
    }
  }

  if (!found) {
    return {
      found: false,
      distance: -1,
      nodes: [],
      edges: []
    };
  }

  // Reconstruct path backwards from targetId to sourceId
  const pathNodes: GraphNode[] = [];
  const pathEdges: GraphEdge[] = [];
  let curr = targetId;

  while (curr !== sourceId) {
    const step = parent.get(curr);
    if (!step) break;
    const node = graph.nodes.get(curr);
    if (node) pathNodes.unshift(node);
    pathEdges.unshift(step.edge);
    curr = step.prevNodeId;
  }

  const sourceNode = graph.nodes.get(sourceId);
  if (sourceNode) pathNodes.unshift(sourceNode);

  return {
    found: true,
    distance: pathEdges.length,
    nodes: pathNodes,
    edges: pathEdges
  };
}

/**
 * Extracts a bounded subgraph centered around a root node.
 * Used by Code Relationship Graph (P1.1) to visualize neighborhoods without loading the entire graph.
 */
export function getSubgraph(
  graph: CodeGraph,
  rootNodeId: string,
  maxDepth: number = 2,
  options: TraversalOptions = {}
): SubgraphResult {
  const rootNode = graph.nodes.get(rootNodeId);
  if (!rootNode) {
    return {
      nodes: [],
      edges: [],
      rootId: rootNodeId,
      totalNodes: 0,
      totalEdges: 0
    };
  }

  // Traverse forward and reverse up to maxDepth
  const forwardSteps = bfs(graph, rootNodeId, { ...options, direction: "forward", maxDepth });
  const reverseSteps = bfs(graph, rootNodeId, { ...options, direction: "reverse", maxDepth });

  const collectedNodeIds = new Set<string>([rootNodeId]);
  for (const s of forwardSteps) collectedNodeIds.add(s.node.id);
  for (const s of reverseSteps) collectedNodeIds.add(s.node.id);

  const subgraphNodes: GraphNode[] = [];
  for (const id of collectedNodeIds) {
    const n = graph.nodes.get(id);
    if (n) subgraphNodes.push(n);
  }

  // Collect edges between nodes in the subgraph
  const subgraphEdges: GraphEdge[] = [];
  const seenEdgeIds = new Set<string>();

  for (const nodeId of collectedNodeIds) {
    const outEdges = graph.outgoing.get(nodeId) || [];
    for (const e of outEdges) {
      if (collectedNodeIds.has(e.targetId) && !seenEdgeIds.has(e.id)) {
        seenEdgeIds.add(e.id);
        subgraphEdges.push(e);
      }
    }
  }

  return {
    nodes: subgraphNodes,
    edges: subgraphEdges,
    rootId: rootNodeId,
    totalNodes: subgraphNodes.length,
    totalEdges: subgraphEdges.length
  };
}
