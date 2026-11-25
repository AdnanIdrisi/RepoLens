export function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-hairline-light dark:border-hairline-dark bg-surface-light dark:bg-surface-dark px-3 py-2 text-[11px] font-mono shadow-xs select-none flex flex-wrap items-center gap-3 text-[#6B7280] dark:text-[#94A3B8]">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-indigo-400" /> imports
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400" /> defines
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-purple-400" /> routes
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400" /> calls
      </span>
    </div>
  );
}
