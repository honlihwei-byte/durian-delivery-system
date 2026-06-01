"use client";

export type ShopDetailTabId = "general" | "qr" | "gps" | "schedule" | "security";

const TABS: { id: ShopDetailTabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "qr", label: "QR" },
  { id: "gps", label: "GPS" },
  { id: "schedule", label: "Schedule" },
  { id: "security", label: "Security" },
];

type Props = {
  active: ShopDetailTabId;
  onChange: (tab: ShopDetailTabId) => void;
};

export function ShopDetailTabBar({ active, onChange }: Props) {
  return (
    <div
      className="mb-5 flex flex-wrap gap-1 border-b border-[#E2E8F0] pb-0"
      role="tablist"
      aria-label="Shop settings"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
            active === tab.id
              ? "border border-b-0 border-[#E2E8F0] bg-white text-[#2563EB]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
