// Shared helpers for storing dates as real UTC-midnight Date objects while
// keeping the public API (request bodies, JSON responses) on plain
// "YYYY-MM-DD" strings, exactly as the frontend already expects.
//
// Internal storage uses Date so Mongo can do native date comparisons/ranges;
// every day boundary ("today", month ranges, due-date math) is anchored to
// UTC so behavior does not depend on the server's local timezone.

const DATE_STR_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a "YYYY-MM-DD" string into a UTC-midnight Date. Returns null for invalid/missing input. */
const parseDateStr = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string" || !DATE_STR_RE.test(dateStr)) return null;
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Format a Date (or anything Date-constructible) back to "YYYY-MM-DD" using its UTC calendar date. */
const formatDateStr = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/** Today's date as a UTC-midnight Date. */
const todayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

module.exports = { parseDateStr, formatDateStr, todayUtc, DATE_STR_RE };
