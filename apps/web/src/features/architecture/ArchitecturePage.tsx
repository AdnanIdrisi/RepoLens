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
    <div className="relative h-full w-full bg-[#090d16] overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="h-12 px-4 border-b border-[#25334d] bg-[#131b2e] flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-2 text-[#f8fafc] font-semibold text-xs font-mono">
            <Network className="h-4 w-4 text-[#4f46e5]" />
            <span>P1.1 Code Relationship Graph</span>
          </div>

          <span className="text-[#25334d]">|</span>

          {/* Depth Selector */}
          <div className="flex items-center space-x-1 bg-[#090d16] px-1.5 py-0.5 rounded border border-[#25334d] text-xs font-mono text-[#94a3b8]">
            <Layers className="h-3 w-3 text-[#94a3b8] mr-1" />
            <span className="text-[#94a3b8] text-[11px]">Depth:</span>
            {([1, 2, 3] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  depth === d
                    ? "bg-[#4f46e5] text-white font-bold"
                    : "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1a243b]"
                }`}
                title={`Show nodes within ${d} hop${d > 1 ? "s" : ""} from root`}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setDepth("all")}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                depth === "all"
                  ? "bg-[#4f46e5] text-white font-bold"
                  : "text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1a243b]"
              }`}
              title="Show all files in the repository"
            >
              All Files
            </button>
          </div>

          {/* Focus Root Indicator */}
          {activeRootNode && depth !== "all" && (
            <div className="flex items-center space-x-1.5 bg-[#090d16] border border-[#d97706]/40 px-2 py-0.5 rounded text-xs font-mono">
              <Crosshair className="h-3 w-3 text-[#d97706]" />
              <span className="text-[#d97706] text-[10px] uppercase font-bold">Focus:</span>
              <span className="text-[#f8fafc] font-semibold max-w-[150px] truncate" title={activeRootNode.data.label as string}>
                {activeRootNode.data.label as string}
              </span>
              {focusNodeId && (
                <button
                  onClick={handleResetToEntry}
                  className="ml-1 text-[10px] text-[#4f46e5] hover:text-[#818cf8] underline flex items-center"
                  title="Reset to primary application entry point"
                >
                  <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Node Count Badge */}
          <div className="text-[11px] font-mono text-[#94a3b8] bg-[#090d16] px-2 py-0.5 rounded border border-[#25334d]">
            {nodes.length} nodes · {edges.length} edges
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReindex}
            disabled={indexing}
            className="inline-flex items-center px-2.5 py-1 rounded border border-[#25334d] bg-[#1a243b] hover:bg-[#25334d] text-xs font-mono text-[#f8fafc] transition-colors disabled:opacity-50"
          >
            {indexing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin text-[#4f46e5]" />
                <span>Indexing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1.5 text-[#94a3b8]" />
                <span>Re-Index Graph</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative graph-grid-bg">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-[#94a3b8] text-xs font-mono">
            <Loader2 className="h-6 w-6 animate-spin text-[#4f46e5] mb-2" />
            <span>Rendering structural code graph...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#94a3b8] text-xs p-6 text-center">
            <Network className="h-10 w-10 text-[#25334d] mb-3" />
            <h4 className="text-sm font-semibold text-[#f8fafc]">No Graph Generated Yet</h4>
            <p className="text-xs text-[#94a3b8] max-w-sm mt-1">
              Click &quot;Re-Index Graph&quot; above to parse eligible repository files, resolve dependencies, and generate interactive nodes.
            </p>
            <button
              onClick={handleReindex}
              disabled={indexing}
              className="mt-4 px-4 py-2 rounded bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold transition-colors"
            >
              Build Repository Graph Now
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
            <Background color="#25334d" gap={20} size={1} />
            <Controls className="!bg-[#131b2e] !border-[#25334d] !text-[#f8fafc] [&>button]:!border-[#25334d] [&>button]:!bg-[#131b2e] [&>button:hover]:!bg-[#1a243b]" />
            <MiniMap
              nodeColor={(node) => {
                switch (node.data?.kind) {
                  case "file":
                    return "#4f46e5";
                  case "function":
                    return "#059669";
                  case "class":
                    return "#0891b2";
                  case "route":
                    return "#9333ea";
                  default:
                    return "#94a3b8";
                }
              }}
              className="!bg-[#131b2e] !border-[#25334d] rounded shadow-none"
            />
          </ReactFlow>
        )}

        {/* Legend */}
        <GraphLegend />

        {/* Source Viewer Drawer */}
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
