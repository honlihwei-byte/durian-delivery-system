/**
 * Smoke test: simple mode first-in → last-out (user example).
 * Run: node scripts/test-daily-hours.mjs
 */

function parseMalaysiaEventInstant(eventDate, eventTime) {
  const [y, m, d] = eventDate.split("-").map(Number);
  const [hh, mm] = eventTime.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

function sortByEventTime(rows) {
  return [...rows].sort(
    (a, b) => parseMalaysiaEventInstant(a.event_date, a.event_time) - parseMalaysiaEventInstant(b.event_date, b.event_time),
  );
}

function firstClockIn(rows) {
  return sortByEventTime(rows).filter((p) => p.action_type === "clock_in")[0];
}

function lastClockOut(rows) {
  const outs = sortByEventTime(rows).filter((p) => p.action_type === "clock_out");
  return outs.length ? outs[outs.length - 1] : undefined;
}

function totalWorkedMsSimple(rows) {
  const fi = firstClockIn(rows);
  const lo = lastClockOut(rows);
  if (!fi || !lo) return 0;
  const inMs = parseMalaysiaEventInstant(fi.event_date, fi.event_time);
  const outMs = parseMalaysiaEventInstant(lo.event_date, lo.event_time);
  if (outMs <= inMs) return 0;
  return outMs - inMs;
}

function totalWorkedMsStrict(rows) {
  const sorted = sortByEventTime(rows);
  let openInMs = null;
  let total = 0;
  for (const p of sorted) {
    if (p.action_type === "clock_in") openInMs = parseMalaysiaEventInstant(p.event_date, p.event_time);
    else if (openInMs !== null) {
      const outMs = parseMalaysiaEventInstant(p.event_date, p.event_time);
      if (outMs > openInMs) total += outMs - openInMs;
      openInMs = null;
    }
  }
  return total;
}

const date = "2026-05-21";
const rows = [
  { action_type: "clock_in", event_date: date, event_time: "12:33" },
  { action_type: "clock_in", event_date: date, event_time: "19:23" },
  { action_type: "clock_out", event_date: date, event_time: "19:23" },
  { action_type: "clock_in", event_date: date, event_time: "20:10" },
  { action_type: "clock_out", event_date: date, event_time: "21:04" },
];

const simple = totalWorkedMsSimple(rows);
const strict = totalWorkedMsStrict(rows);
const expectedMs = (8 * 60 + 31) * 60 * 1000;

let failed = 0;
if (simple !== expectedMs) {
  console.error(`FAIL simple: got ${simple} expected ${expectedMs}`);
  failed++;
} else {
  console.log("OK simple mode:", `${Math.floor(simple / 3600000)}h ${Math.floor((simple % 3600000) / 60000)}m`);
}

if (strict === 54 * 60 * 1000) {
  console.log("OK strict mode still pairs last segment (~0h54m):", strict);
} else {
  console.error(`FAIL strict baseline: got ${strict}`);
  failed++;
}

// consecutive in-in
let dup = false;
const sorted = sortByEventTime(rows);
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i - 1].action_type === sorted[i].action_type) dup = true;
}
if (!dup) {
  console.error("FAIL duplicate detection");
  failed++;
} else {
  console.log("OK duplicate punch detected");
}

process.exit(failed ? 1 : 0);
