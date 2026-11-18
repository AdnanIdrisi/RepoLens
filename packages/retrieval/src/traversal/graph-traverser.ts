import type { CodeEntity } from "@repolens/shared";

export interface TraversalCandidate {
  entity: CodeEntity;
  isPrimarySeed: boolean;
  relation?: "CALLS" | "CALLED_BY" | "USES_MIDDLEWARE" | "REGISTERS_ROUTE" | "PARENT_SCOPE" | "CHILD_MEMBER";
  sourceSeedName?: string;
  hopDistance: number;
}

export interface GraphEdgeRecord {
  sourceId: string;
  targetId: string;
  kind: string;
}

export class GraphTraverser {
  /**
   * Traverses relationships from primary seed entities up to maxHops (default 1-2).
   * Supports both explicit graph edges and AST entity call / parent references.
   */
  public static traverseSupportingEntities(
    seedEntities: CodeEntity[],
    allEntities: Map<string, CodeEntity>,
    edges: GraphEdgeRecord[] = [],
    maxHops: number = 2,
    maxSupporting: number = 8
  ): TraversalCandidate[] {
    const results: TraversalCandidate[] = [];
    const visitedEntityIds = new Set<string>();

    // 1. Add primary seeds
    for (const seed of seedEntities) {
      visitedEntityIds.add(seed.entityId);
      results.push({
        entity: seed,
        isPrimarySeed: true,
        hopDistance: 0
      });
    }

    // Build lookup maps for fast edge resolution
    // entityId or entityName -> CodeEntity
    const nameToEntity = new Map<string, CodeEntity>();
    for (const entity of allEntities.values()) {
      nameToEntity.set(entity.entityName, entity);
      nameToEntity.set(`${entity.filePath}#${entity.entityName}`, entity);
    }

    // Outgoing & incoming edges: sourceId -> targets, targetId -> sources
    const outgoing = new Map<string, { targetId: string; kind: string }[]>();
    const incoming = new Map<string, { sourceId: string; kind: string }[]>();
    for (const edge of edges) {
      if (!outgoing.has(edge.sourceId)) outgoing.set(edge.sourceId, []);
      outgoing.get(edge.sourceId)!.push({ targetId: edge.targetId, kind: edge.kind });

      if (!incoming.has(edge.targetId)) incoming.set(edge.targetId, []);
      incoming.get(edge.targetId)!.push({ sourceId: edge.sourceId, kind: edge.kind });
    }

    let currentFrontier = [...seedEntities];
    let hop = 1;

    while (hop <= maxHops && currentFrontier.length > 0 && results.length < seedEntities.length + maxSupporting) {
      const nextFrontier: CodeEntity[] = [];

      for (const current of currentFrontier) {
        // A. Inspect calls (callees)
        for (const calleeName of current.calls || []) {
          // Check if we can find this callee
          const calleeEntity = nameToEntity.get(calleeName);
          if (calleeEntity && !visitedEntityIds.has(calleeEntity.entityId)) {
            visitedEntityIds.add(calleeEntity.entityId);
            results.push({
              entity: calleeEntity,
              isPrimarySeed: false,
              relation: "CALLS",
              sourceSeedName: current.entityName,
              hopDistance: hop
            });
            nextFrontier.push(calleeEntity);
            if (results.length >= seedEntities.length + maxSupporting) break;
          }
        }

        // B. Inspect callers from allEntities
        for (const candidate of allEntities.values()) {
          if (!visitedEntityIds.has(candidate.entityId)) {
            if (candidate.calls && candidate.calls.includes(current.entityName)) {
              visitedEntityIds.add(candidate.entityId);
              results.push({
                entity: candidate,
                isPrimarySeed: false,
                relation: "CALLED_BY",
                sourceSeedName: current.entityName,
                hopDistance: hop
              });
              nextFrontier.push(candidate);
              if (results.length >= seedEntities.length + maxSupporting) break;
            }
          }
        }

        // C. Check graph edges (e.g. USES_MIDDLEWARE, REGISTERS_ROUTE)
        const outEdges = outgoing.get(current.entityId) || [];
        for (const outEdge of outEdges) {
          const target = allEntities.get(outEdge.targetId);
          if (target && !visitedEntityIds.has(target.entityId)) {
            visitedEntityIds.add(target.entityId);
            results.push({
              entity: target,
              isPrimarySeed: false,
              relation: outEdge.kind as any,
              sourceSeedName: current.entityName,
              hopDistance: hop
            });
            nextFrontier.push(target);
            if (results.length >= seedEntities.length + maxSupporting) break;
          }
        }

        if (results.length >= seedEntities.length + maxSupporting) break;
      }

      currentFrontier = nextFrontier;
      hop++;
    }

    return results;
  }
}

