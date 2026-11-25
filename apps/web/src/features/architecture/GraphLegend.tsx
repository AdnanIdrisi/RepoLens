export function GraphLegend() {
  return (
    <div className="absolute bottom-5 left-5 z-10 rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 text-xs space-y-2 max-w-xs shadow-xs select-none">
      <div className="font-bold text-slate-100 text-[10px] font-mono uppercase tracking-wider">
        Graph Legend
      </div>

      {/* Node Kinds */}
      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
        <span className="px-1.5 py-0.5 rounded border bg-[#1e293b] text-slate-300 border-[#334155] font-medium">
          file
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-medium">
          function
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 font-medium">
          class
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20 font-medium">
          route
        </span>
      </div>

      {/* Edge Directions */}
      <div className="pt-2 border-t border-[#1e293b] grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-400">
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-indigo-400 inline-block" />
          <span>imports</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
          <span>defines</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-purple-400 inline-block" />
          <span>routes_to</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3 h-0.5 bg-amber-400 inline-block" />
          <span>calls</span>
        </div>
      </div>
    </div>
  );
}
