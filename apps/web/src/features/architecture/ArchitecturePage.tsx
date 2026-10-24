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
import { RefreshCw, Layers, Network, Loader2 } from "lucide-react";
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
  const [depth, setDepth] = useState<number>(1);

  const loadGraph = useCallback(
    async (rootId?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          depth: depth.toString(),
          limit: "150"
        });
        if (rootId) {
          params.append("rootNodeId", rootId);
        }

        const res = await fetch(`/api/repositories/${repositoryId}/graph?${params.toString()}`);
        const data = await res.json();

        if (res.ok && data.success && data.data) {
          const rawNodes: GraphNode[] = data.data.nodes;
          const rawEdges: GraphEdge[] = data.data.edges;

          // Simple layout: arrange in organized columns
          const columnCount = Math.max(3, Math.ceil(Math.sqrt(rawNodes.length)));
          const xSpacing = 280;
          const ySpacing = 140;

          const flowNodes: Node[] = rawNodes.map((n, idx) => {
            const col = idx % columnCount;
            const row = Math.floor(idx / columnCount);

            return {
              id: n.id,
              type: "codeNode",
              position: { x: col * xSpacing + 40, y: row * ySpacing + 40 },
              data: {
                id: n.id,
                label: n.label,
                kind: n.kind,
                filePath: n.filePath,
                startLine: n.startLine,
                endLine: n.endLine,
                isSelected: selectedNode?.id === n.id
              }
            };
          });

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

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

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

  const handleReindex = async () => {
    setIndexing(true);
    try {
      const res = await fetch(`/api/repositories/${repositoryId}/index`, {
        method: "POST"
      });
      if (res.ok) {
        await loadGraph();
      }
    } catch (err) {
      console.error("Re-indexing failed:", err);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-2xl border border-slate-800 bg-[#0b0f19] shadow-2xl overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-white font-bold text-sm">
            <Network className="h-4 w-4 text-indigo-400" />
            <span>P1.1 Code Relationship Graph</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>Depth:</span>
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                  depth === d ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                {d}
              </button>
            ))}
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
        />
      </div>
    </div>
  );
}
