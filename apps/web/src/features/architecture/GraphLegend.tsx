export function GraphLegend() {
  return (
    <div className="absolute bottom-5 left-5 z-10 rounded border border-[#25334d] bg-[#131b2e] p-3 text-xs space-y-2 max-w-xs shadow-none select-none">
      <div className="font-semibold text-[#f8fafc] text-[10px] font-mono uppercase tracking-wider">
        Graph Legend
      </div>

      {/* Node Kinds */}
      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
        <span className="px-1.5 py-0.5 rounded border bg-[#1a243b] text-[#818cf8] border-[#4f46e5]/40">
          file
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-[#1a243b] text-[#34d399] border-[#059669]/40">
          function
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-[#1a243b] text-[#22d3ee] border-[#0891b2]/40">
          class
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-[#1a243b] text-[#c084fc] border-[#9333ea]/40">
          route
        </span>
      </div>

      {/* Edge Directions */}
      <div className="pt-2 border-t border-[#25334d] grid grid-cols-2 gap-1.5 text-[10px] font-mono text-[#94a3b8]">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-[#818cf8] inline-block" />
          <span>imports</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-[#34d399] inline-block" />
          <span>defines</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-[#c084fc] inline-block" />
          <span>routes_to</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-[#fbbf24] inline-block" />
          <span>calls</span>
        </div>
      </div>
    </div>
  );
}
