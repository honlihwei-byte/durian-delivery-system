/** CSS-only operations dashboard mockup for hero section. */
export function DashboardPreview() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-hidden
    >
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
        <span className="ml-3 text-xs font-medium text-slate-500">LW OpsFlow — Operations Dashboard</span>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Today&apos;s risks</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Late · 2", "Missing out · 1", "Location · 1"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-900"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { shop: "Main Branch", score: 88, tone: "text-emerald-700 bg-emerald-50" },
            { shop: "Mall Outlet", score: 61, tone: "text-amber-800 bg-amber-50" },
          ].map((s) => (
            <div key={s.shop} className={`rounded-xl border border-slate-200 p-2.5 ${s.tone}`}>
              <p className="text-[11px] font-semibold">{s.shop}</p>
              <p className="mt-1 text-lg font-bold">{s.score}</p>
              <p className="text-[10px] opacity-75">Health score</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold text-slate-900">Live attendance today</p>
          <div className="mt-2 space-y-1.5">
            {[
              { name: "Aina M.", shop: "Main", in: "09:02", status: "In shop" },
              { name: "Daniel T.", shop: "Mall", in: "10:15", status: "Late" },
            ].map((row) => (
              <div
                key={row.name}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]"
              >
                <span className="font-medium text-slate-800">{row.name}</span>
                <span className="text-slate-500">{row.shop}</span>
                <span className="font-mono text-slate-600">{row.in}</span>
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
    </div>
  );
}
