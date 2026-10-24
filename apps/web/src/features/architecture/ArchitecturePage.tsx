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
    <div className="relative h-[calc(100vh-140px)] w-full rounded-2xl border border-slate-800 bg-[#0b0f19] shadow-2xl overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center space-x-1.5 text-white font-bold text-sm">
            <Network className="h-4 w-4 text-indigo-400" />
            <span>P1.1 Code Relationship Graph</span>
          </div>

          {/* Depth Selector */}
          <div className="flex items-center space-x-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
            <Layers className="h-3.5 w-3.5 text-slate-500 mr-1" />
            <span className="text-slate-400">Depth:</span>
            {([1, 2, 3] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-2 py-0.5 rounded text-xs transition-colors ${
                  depth === d
                    ? "bg-indigo-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                title={`Show nodes within ${d} hop${d > 1 ? "s" : ""} from root`}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setDepth("all")}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                depth === "all"
                  ? "bg-indigo-600 text-white font-bold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Show all files in the repository"
            >
              All Files
            </button>
          </div>

          {/* Focus Root Indicator */}
          {activeRootNode && depth !== "all" && (
            <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs">
              <Crosshair className="h-3 w-3 text-amber-400" />
              <span className="text-amber-300/80">Focus:</span>
              <span className="text-amber-200 font-mono font-semibold max-w-[140px] truncate" title={activeRootNode.data.label as string}>
                {activeRootNode.data.label as string}
              </span>
              {focusNodeId && (
                <button
                  onClick={handleResetToEntry}
                  className="ml-1 text-[10px] text-amber-400 hover:text-white underline flex items-center"
                  title="Reset to primary application entry point"
                >
                  <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Node Count Badge */}
          <div className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
            {nodes.length} nodes · {edges.length} edges
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleReindex}
            disabled={indexing}
            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
          >
            {indexing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin text-indigo-400" />
                <span>Indexing Graph...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                <span>Build / Re-Index Graph</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
            <span>Rendering structural code graph...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
            <Network className="h-10 w-10 text-slate-600 mb-3" />
            <h4 className="text-base font-semibold text-white">No Graph Generated Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Click &quot;Build / Re-Index Graph&quot; above to parse eligible repository files, resolve dependencies, and generate interactive nodes.
            </p>
            <button
              onClick={handleReindex}
              disabled={indexing}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30"
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
            <Background color="#1f2937" gap={16} />
            <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300 [&>button]:!border-slate-800 [&>button]:!bg-slate-900 [&>button:hover]:!bg-slate-800" />
            <MiniMap
              nodeColor={(node) => {
                switch (node.data?.kind) {
                  case "file":
                    return "#6366f1";
                  case "function":
                    return "#10b981";
                  case "class":
                    return "#06b6d4";
                  case "route":
                    return "#a855f7";
                  default:
                    return "#64748b";
                }
              }}
              className="!bg-slate-950/80 !border-slate-800 rounded-xl"
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
