const { todayUtc, formatDateStr } = require("./dateUtc");

// All functions here operate on UTC-midnight Date objects (see dateUtc.js).
// "today"/due-date comparisons use plain Date comparison, which is safe as
// long as every Date involved is truncated to UTC midnight.

const dayOfMonth = (date) => date.getUTCDate();

const diffInDays = (a, b) => Math.round((a.getTime() - b.getTime()) / 86400000);

const today = () => todayUtc();

const isDueOn = (rule, date) => {
  if (!rule.active) return false;
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;

  if (rule.frequency === "monthly-same-day") {
    return dayOfMonth(date) === dayOfMonth(rule.startDate);
  }

  if (rule.frequency === "every-n-days") {
    const anchor = rule.scheduleAnchor || rule.startDate;
    if (date < anchor) return false;
    return diffInDays(date, anchor) % rule.interval === 0;
  }

  return false;
};

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const dateFor = (year, month, day) => new Date(Date.UTC(year, month - 1, day));

module.exports = { dayOfMonth, diffInDays, today, isDueOn, daysInMonth, dateFor, formatDateStr };
