/** CSS-only dashboard mockup for hero section — no external image required. */
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
        <span className="ml-3 text-xs font-medium text-slate-500">OpsFlow Attendance — Dashboard</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-[140px_1fr] sm:gap-4 sm:p-5">
        <div className="hidden space-y-2 sm:block">
          {["Attendance", "Shops", "Staff", "Reports", "Settings"].map((item, i) => (
            <div
              key={item}
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                i === 0 ? "bg-blue-50 text-blue-700" : "text-slate-500"
              }`}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Present today", value: "24", tone: "text-blue-600" },
              { label: "In shop", value: "8", tone: "text-teal-600" },
              { label: "Late", value: "2", tone: "text-amber-600" },
              { label: "Hours", value: "186h", tone: "text-slate-700" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className={`mt-0.5 text-lg font-bold ${s.tone}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-900">Today&apos;s attendance</p>
            <div className="mt-2 space-y-1.5">
              {[
                { name: "Aina M.", shop: "Main", in: "09:02", out: "—", status: "In shop" },
                { name: "Daniel T.", shop: "Outlet", in: "10:01", out: "18:05", status: "On time" },
                { name: "Mei L.", shop: "Main", in: "12:35", out: "—", status: "Shift" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]"
                >
                  <span className="font-medium text-slate-800">{row.name}</span>
                  <span className="hidden text-slate-500 sm:inline">{row.shop}</span>
                  <span className="font-mono text-slate-600">
                    {row.in}–{row.out}
                  </span>
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl" />
    </div>
  );
}
