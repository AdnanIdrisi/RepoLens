export function GraphLegend() {
  return (
    <div className="absolute bottom-5 left-5 z-10 rounded-xl border border-slate-800 bg-slate-950/80 p-3 shadow-xl backdrop-blur-md text-xs space-y-2 max-w-xs">
      <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
        Graph Legend
      </div>
      
      {/* Node Kinds */}
      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
        <span className="px-1.5 py-0.5 rounded border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
          file
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          function
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
          class
        </span>
        <span className="px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/30">
          route
        </span>
      </div>

      {/* Edge Directions */}
      <div className="pt-1.5 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[10px] text-slate-400">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-0.5 bg-indigo-400 inline-block" />
          <span>imports</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
          <span>defines</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-0.5 bg-purple-400 inline-block" />
          <span>routes_to</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
          <span>calls</span>
        </div>
      </div>
    </div>
  );
}
