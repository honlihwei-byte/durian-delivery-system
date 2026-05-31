import {
  formatGpsDistanceMeters,
  gpsStatusClassName,
  gpsStatusLabel,
  type AttendanceRecord,
} from "@/lib/attendance";
import { PhotoProofLink } from "@/components/admin/report/PhotoProofLink";
import { RiskBadges } from "@/components/admin/report/RiskBadges";
import { riskBadgesForRecord } from "@/lib/attendance-risk-badges";
import { recordEventDate, recordEventTime } from "@/lib/attendance-db";
import { formatMalaysiaRecordedAt } from "@/lib/malaysia-time";
import {
  dashboardTableHead,
  dashboardTableRow,
  dashboardTableWrap,
} from "./dashboard-ui";

export function PunchLogTable({
  rows,
  showDate,
}: {
  rows: AttendanceRecord[];
  showDate?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No punch records.</p>;
  }

  return (
    <div className={dashboardTableWrap}>
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr>
            {showDate ? <th className={`${dashboardTableHead} px-3 py-2.5`}>Date</th> : null}
            <th className={`${dashboardTableHead} px-3 py-2.5`}>Time</th>
            <th className={`${dashboardTableHead} px-3 py-2.5`}>Shop</th>
            <th className={`${dashboardTableHead} px-3 py-2.5`}>Action</th>
            <th className={`${dashboardTableHead} px-3 py-2.5`}>GPS distance</th>
            <th className={`${dashboardTableHead} px-3 py-2.5`}>GPS status</th>
            <th className={`${dashboardTableHead} px-3 py-2.5`}>Proof</th>
            <th className={`${dashboardTableHead} px-3 py-2.5`}>Risk</th>
            <th className={`${dashboardTableHead} px-3 py-2.5`}>Recorded</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, idx) => {
            const gpsStatus = gpsStatusLabel(h);
            return (
              <tr
                key={h.id}
                className={`${dashboardTableRow} ${idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"}`}
              >
                {showDate ? <td className="px-3 py-2.5 text-slate-600">{recordEventDate(h)}</td> : null}
                <td className="px-3 py-2.5 font-medium text-slate-800">{recordEventTime(h)}</td>
                <td className="px-3 py-2.5 text-slate-600">{h.shop_name}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      h.action_type === "clock_in"
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                    }`}
                  >
                    {h.action_type === "clock_in" ? "In" : "Out"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{formatGpsDistanceMeters(h.distance_from_shop_meters)}</td>
                <td className={`px-3 py-2.5 ${gpsStatusClassName(gpsStatus)}`}>
                  {gpsStatus}
                  {h.review_required || h.photo_proof_used ? (
                    <span className="ml-1 inline-flex rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-200">
                      Review
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5">
                  {h.photo_proof_used ? <PhotoProofLink attendanceId={h.id} /> : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <RiskBadges
                    badges={riskBadgesForRecord(h)}
                    compact
                    riskScore={h.risk_score != null && h.risk_score > 0 ? h.risk_score : undefined}
                  />
                </td>
                <td className="px-3 py-2.5 text-slate-500">{formatMalaysiaRecordedAt(h.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
