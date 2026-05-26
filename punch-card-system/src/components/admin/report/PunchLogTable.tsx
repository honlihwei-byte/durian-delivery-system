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

export function PunchLogTable({
  rows,
  showDate,
}: {
  rows: AttendanceRecord[];
  showDate?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">No punch records.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="text-left text-zinc-500">
            {showDate ? <th className="py-1 pr-2">Date</th> : null}
            <th className="py-1 pr-2">Time</th>
            <th className="py-1 pr-2">Shop</th>
            <th className="py-1 pr-2">Action</th>
            <th className="py-1 pr-2">GPS distance</th>
            <th className="py-1 pr-2">GPS status</th>
            <th className="py-1 pr-2">Proof</th>
            <th className="py-1 pr-2">Risk</th>
            <th className="py-1">Recorded</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => {
            const gpsStatus = gpsStatusLabel(h);
            return (
              <tr key={h.id} className="border-t border-zinc-100 dark:border-zinc-800">
                {showDate ? <td className="py-1 pr-2">{recordEventDate(h)}</td> : null}
                <td className="py-1 pr-2">{recordEventTime(h)}</td>
                <td className="py-1 pr-2">{h.shop_name}</td>
                <td className="py-1 pr-2">{h.action_type === "clock_in" ? "In" : "Out"}</td>
                <td className="py-1 pr-2">{formatGpsDistanceMeters(h.distance_from_shop_meters)}</td>
                <td className={`py-1 pr-2 ${gpsStatusClassName(gpsStatus)}`}>
                  {gpsStatus}
                  {h.review_required || h.photo_proof_used ? (
                    <span className="ml-1 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                      Review
                    </span>
                  ) : null}
                </td>
                <td className="py-1 pr-2">
                  {h.photo_proof_used ? <PhotoProofLink attendanceId={h.id} /> : "—"}
                </td>
                <td className="py-1 pr-2">
                  <RiskBadges badges={riskBadgesForRecord(h)} compact />
                  {(h.risk_score ?? 0) > 0 ? (
                    <span className="mt-0.5 block text-[10px] text-zinc-500">
                      Score {h.risk_score} ({h.risk_level ?? "low"})
                    </span>
                  ) : null}
                </td>
                <td className="py-1 text-zinc-500">{formatMalaysiaRecordedAt(h.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
