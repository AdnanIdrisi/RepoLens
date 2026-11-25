import { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CodeNode } from "./CodeNode";
import { GraphLegend } from "./GraphLegend";
import { SourceViewerPanel } from "./SourceViewerPanel";
import { RefreshCw, Layers, Network, Loader2, Crosshair, RotateCcw } from "lucide-react";
import type { GraphNode, GraphEdge } from "@repolens/shared";

interface ArchitecturePageProps {
  repositoryId: string;
}

const nodeTypes = {
  codeNode: CodeNode
};

export function ArchitecturePage({ repositoryId }: ArchitecturePageProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [activeRootId, setActiveRootId] = useState<string | null>(null);
  const [depth, setDepth] = useState<number | "all">(1);

  const loadGraph = useCallback(
    async (targetRootId?: string | null, targetDepth: number | "all" = depth) => {
      setLoading(true);
      try {
        const isAll = targetDepth === "all";
        const params = new URLSearchParams({
          scope: isAll ? "all" : "neighborhood",
          limit: isAll ? "250" : "150"
        });

        if (!isAll) {
          params.append("depth", targetDepth.toString());
        }

        if (targetRootId) {
          params.append("rootNodeId", targetRootId);
        }

        const res = await fetch(`/api/repositories/${repositoryId}/graph?${params.toString()}`);
        const data = await res.json();

        if (res.ok && data.success && data.data) {
          const rawNodes: GraphNode[] = data.data.nodes;
          const rawEdges: GraphEdge[] = data.data.edges;
          const currentRootId = data.data.rootId || targetRootId || rawNodes[0]?.id;

          setActiveRootId(currentRootId || null);

          // Compute clean directional layout
          let flowNodes: Node[] = [];

          if (isAll || !currentRootId) {
            // Multi-column grid for full repository overview
            const columnCount = Math.max(3, Math.ceil(Math.sqrt(rawNodes.length * 1.4)));
            const xSpacing = 300;
            const ySpacing = 130;

            flowNodes = rawNodes.map((n, idx) => {
              const col = idx % columnCount;
              const row = Math.floor(idx / columnCount);
              return {
                id: n.id,
                type: "codeNode",
                position: { x: col * xSpacing + 60, y: row * ySpacing + 60 },
                data: {
                  id: n.id,
                  label: n.label,
                  kind: n.kind,
                  filePath: n.filePath,
                  startLine: n.startLine,
                  endLine: n.endLine,
                  isRoot: n.id === currentRootId,
                  isSelected: selectedNode?.id === n.id
                }
              };
            });
          } else {
            // Directional neighborhood layout centered around root node
            const outAdj = new Map<string, string[]>();
            const inAdj = new Map<string, string[]>();

            for (const e of rawEdges) {
              if (!outAdj.has(e.sourceId)) outAdj.set(e.sourceId, []);
              outAdj.get(e.sourceId)!.push(e.targetId);

              if (!inAdj.has(e.targetId)) inAdj.set(e.targetId, []);
              inAdj.get(e.targetId)!.push(e.sourceId);
            }

            // Forward BFS from root (outgoing dependencies)
            const forwardDist = new Map<string, number>([[currentRootId, 0]]);
            const qF: Array<[string, number]> = [[currentRootId, 0]];
            while (qF.length > 0) {
              const [curr, d] = qF.shift()!;
              for (const nxt of outAdj.get(curr) || []) {
                if (!forwardDist.has(nxt)) {
                  forwardDist.set(nxt, d + 1);
                  qF.push([nxt, d + 1]);
                }
              }
            }

            // Reverse BFS from root (incoming callers)
            const reverseDist = new Map<string, number>([[currentRootId, 0]]);
            const qR: Array<[string, number]> = [[currentRootId, 0]];
            while (qR.length > 0) {
              const [curr, d] = qR.shift()!;
              for (const prv of inAdj.get(curr) || []) {
                if (!reverseDist.has(prv)) {
                  reverseDist.set(prv, d + 1);
                  qR.push([prv, d + 1]);
                }
              }
            }

            // Group nodes by relative column index
            const columnGroups = new Map<number, GraphNode[]>();

            for (const n of rawNodes) {
              let col = 0;
              if (n.id === currentRootId) {
                col = 0;
              } else if (forwardDist.has(n.id)) {
                col = forwardDist.get(n.id)!;
              } else if (reverseDist.has(n.id)) {
                col = -reverseDist.get(n.id)!;
              } else {
                col = 1;
              }

              if (!columnGroups.has(col)) columnGroups.set(col, []);
              columnGroups.get(col)!.push(n);
            }

            // Position columns with root around center
            const minCol = Math.min(...Array.from(columnGroups.keys()));
            const xOffset = Math.abs(Math.min(0, minCol)) * 360 + 60;

            for (const [col, groupNodes] of columnGroups.entries()) {
              const x = xOffset + col * 360;
              const totalHeight = groupNodes.length * 130;
              const startY = Math.max(60, 280 - totalHeight / 2);

              groupNodes.forEach((n, idx) => {
                flowNodes.push({
                  id: n.id,
                  type: "codeNode",
                  position: { x, y: startY + idx * 130 },
                  data: {
                    id: n.id,
                    label: n.label,
                    kind: n.kind,
                    filePath: n.filePath,
                    startLine: n.startLine,
                    endLine: n.endLine,
                    isRoot: n.id === currentRootId,
                    isSelected: selectedNode?.id === n.id
                  }
                });
              });
            }
          }

          const getEdgeColor = (kind: string) => {
            switch (kind) {
              case "imports":
                return "#818cf8"; // indigo
              case "defines":
                return "#34d399"; // emerald
              case "routes_to":
                return "#c084fc"; // purple
              case "calls":
                return "#fbbf24"; // amber
              default:
                return "#94a3b8"; // slate
            }
          };

          const flowEdges: Edge[] = rawEdges.map((e) => ({
            id: e.id,
            source: e.sourceId,
            target: e.targetId,
            animated: e.kind === "routes_to" || e.kind === "calls",
            style: { stroke: getEdgeColor(e.kind), strokeWidth: 1.5 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: getEdgeColor(e.kind),
              width: 14,
              height: 14
            }
          }));

          setNodes(flowNodes);
          setEdges(flowEdges);
        }
      } catch (err) {
        console.error("Failed to load graph:", err);
      } finally {
        setLoading(false);
      }
    },
    [repositoryId, depth, selectedNode, setNodes, setEdges]
  );

  // Re-fetch when depth or focusNodeId changes
  useEffect(() => {
    loadGraph(focusNodeId, depth);
  }, [depth, focusNodeId, loadGraph]);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode({
      id: node.id,
      repositoryId,
      commitSha: "",
      kind: node.data.kind as GraphNode["kind"],
      label: node.data.label as string,
      filePath: node.data.filePath as string,
      startLine: node.data.startLine as number | undefined,
      endLine: node.data.endLine as number | undefined
    });
  };

  const handleFocusNode = (nodeId: string) => {
    setFocusNodeId(nodeId);
    if (depth === "all") {
      setDepth(1);
    }
  };

  const handleResetToEntry = () => {
    setFocusNodeId(null);
  };

  const handleReindex = async () => {
    setIndexing(true);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/index`, {
        method: "POST"
      });
      if (res.ok) {
        await loadGraph(focusNodeId, depth);
      }
    } catch (err) {
      console.error("Re-indexing failed:", err);
    } finally {
      setIndexing(false);
    }
  };

  const activeRootNode = nodes.find((n) => n.id === activeRootId);

  return (
    <div className="relative h-full w-full bg-canvas-light dark:bg-canvas-dark overflow-hidden flex flex-col">
      {/* Minimal Floating Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="flex items-center space-x-1 bg-surface-light dark:bg-surface-dark px-1.5 py-1 rounded-xl border border-hairline-light dark:border-hairline-dark shadow-xs text-xs font-mono">
          <Layers className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#94A3B8] ml-1 mr-1" />
          {([1, 2, 3] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
                depth === d
                  ? "bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] font-semibold"
                  : "text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
              }`}
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setDepth("all")}
            className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
              depth === "all"
                ? "bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] font-semibold"
                : "text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9]"
            }`}
          >
            All
          </button>
        </div>

        {activeRootNode && depth !== "all" && (
          <div className="flex items-center space-x-1.5 bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark px-2.5 py-1.5 rounded-xl shadow-xs text-xs font-mono">
            <Crosshair className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-medium max-w-[140px] truncate" title={activeRootNode.data.label as string}>
              {activeRootNode.data.label as string}
            </span>
            {focusNodeId && (
              <button
                onClick={handleResetToEntry}
                className="ml-1 text-[11px] text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F1F5F9] flex items-center"
                title="Reset focus"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        <div className="px-2.5 py-1.5 rounded-xl bg-surface-light dark:bg-surface-dark border border-hairline-light dark:border-hairline-dark shadow-xs text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8]">
          {nodes.length} · {edges.length}
        </div>

        <button
          onClick={handleReindex}
          disabled={indexing}
          className="inline-flex items-center px-2.5 py-1.5 rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark hover:bg-subtle-light dark:hover:bg-[#1A272E] text-xs font-medium shadow-xs transition-colors disabled:opacity-50"
        >
          {indexing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-[#6B7280] dark:text-[#94A3B8]" />
          )}
          <span>{indexing ? "Indexing..." : "Re-Index"}</span>
        </button>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative graph-grid-bg">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-[#6B7280] dark:text-[#94A3B8] text-xs font-mono">
            <Loader2 className="h-5 w-5 animate-spin mb-2" />
            <span>Loading graph...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#6B7280] dark:text-[#94A3B8] text-xs p-6 text-center space-y-3">
            <Network className="h-8 w-8 opacity-40" />
            <p className="font-medium text-[#111827] dark:text-[#F1F5F9]">No graph indexed yet</p>
            <button
              onClick={handleReindex}
              disabled={indexing}
              className="px-4 py-2 rounded-lg bg-[#111827] dark:bg-[#F59E0B] text-white dark:text-[#0A1114] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Build Graph
            </button>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={(_e, node) => handleFocusNode(node.id)}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={2.0}
          >
            <Background color="var(--dot-color)" gap={20} size={1} />
            <Controls className="!bg-[var(--bg-surface)] !border-[var(--border-hairline)] !text-[var(--text-primary)] !rounded-xl !shadow-xs [&>button]:!border-[var(--border-hairline)] [&>button]:!bg-[var(--bg-surface)] [&>button:hover]:!bg-[var(--bg-subtle)] [&>button>svg]:!fill-current" />
            <MiniMap
              nodeColor={(node) => {
                switch (node.data?.kind) {
                  case "file":
                    return "#6366F1";
                  case "function":
                    return "#10B981";
                  case "class":
                    return "#0EA5E9";
                  case "route":
                    return "#A855F7";
                  default:
                    return "#94A3B8";
                }
              }}
              maskColor="rgba(0,0,0,0.08)"
              className="!bg-[var(--bg-surface)] !border-[var(--border-hairline)] !rounded-xl shadow-xs"
            />
          </ReactFlow>
        )}

        <GraphLegend />

        <SourceViewerPanel
          repositoryId={repositoryId}
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onFocusNode={handleFocusNode}
        />
      </div>
    </div>
  );
}
