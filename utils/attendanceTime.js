// Business calendar: Asia/Kolkata (fixed UTC+05:30). Stored instants stay UTC.
const OFFSET = 330 * 60 * 1000;
const DAY = 86400000;
function businessDate(value = new Date()) {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) throw new Error('Invalid date');
  return new Date(d.getTime() + OFFSET).toISOString().slice(0, 10);
}
function dateKey(value) {
  // Date-only and timezone-less form values represent office calendar dates.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T\d{2}:\d{2}:\d{2}(?:\.\d+)?$)/.test(value)) {
    const key = value.slice(0, 10);
    if (new Date(key + 'T00:00:00Z').toISOString().slice(0, 10) !== key) throw new Error('Invalid calendar date');
    return key;
  }
  return businessDate(value);
}
function dateBucket(value = new Date()) { return new Date(dateKey(value) + 'T00:00:00Z'); }
function dayQuery(value = new Date()) {
  const d = dateBucket(value);
  // Existing servers wrote either UTC midnight or IST midnight. Read both,
  // without rewriting history or changing the unique index.
  return { $in: [d, new Date(d.getTime() - OFFSET)] };
}
function rangeQuery(start, end) {
  const a = dateBucket(start).getTime() - OFFSET;
  const b = dateBucket(end).getTime() - OFFSET + DAY;
  if (b <= a || b - a > 366 * DAY) throw new Error('Choose a valid range of at most 366 days');
  return { $gte: new Date(a), $lt: new Date(b) };
}
function monthRange(month, year) {
  const now = new Date(Date.now() + OFFSET);
  const m = Number(month || now.getUTCMonth() + 1), y = Number(year || now.getUTCFullYear());
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2200) throw new Error('Invalid month or year');
  return { start: `${y}-${String(m).padStart(2,'0')}-01`, end: new Date(Date.UTC(y,m,0)).toISOString().slice(0,10) };
}
function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const n = (new Date(end) - new Date(start)) / 3600000;
  if (!Number.isFinite(n) || n < 0) throw new Error('Check-out must be after check-in');
  return n;
}
function formatHours(value) {
  const n = Number(value);
  const minutes = Number.isFinite(n) ? Math.max(0, Math.round(n * 60)) : 0;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2,'0')}m`;
}
function dailyRows(records, start, end) {
  rangeQuery(start,end);
  const map = new Map();
  for (const r of records) {
    const key = businessDate(r.date);
    // Keep all historical records visible if old buckets contain duplicates.
    map.set(key, [...(map.get(key) || []), r]);
  }
  const rows = [];
  const today = businessDate();
  for (let d = dateBucket(start); d <= dateBucket(end); d = new Date(+d + DAY)) {
    const key = d.toISOString().slice(0,10);
    const found = map.get(key);
    if (found) rows.push(...found.map(r => ({ date: key, status: r.status, check_in: r.check_in, check_out: r.check_out, total_hours: r.total_hours || 0, record_id: r._id, reason: r.reason || r.leave_request?.reason || '' })));
    else rows.push({ date: key, status: key > today ? 'upcoming' : 'no-record', total_hours: 0 });
  }
  return rows;
}
module.exports = { businessDate, dateKey, dateBucket, dayQuery, rangeQuery, monthRange, hoursBetween, formatHours, dailyRows };

function workingDayCount(records) {
  return new Set(records.filter(r => r.check_in?.time).map(r => businessDate(r.date))).size;
}
module.exports.workingDayCount = workingDayCount;

// The report average uses distinct dates explicitly marked present.
// Late/half-day/leave/absence remain separate statuses, even if times exist.
function presentDayCount(records) {
  return new Set(records.filter(r => r.status === 'present').map(r => businessDate(r.date))).size;
}
function reportSummary(records) {
  const totalHours = records.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);
  const presentDays = presentDayCount(records);
  return { totalHours, presentDays, averageHours: presentDays ? totalHours / presentDays : 0 };
}
module.exports.presentDayCount = presentDayCount;
module.exports.reportSummary = reportSummary;
