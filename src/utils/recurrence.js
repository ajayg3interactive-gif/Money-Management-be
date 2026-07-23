const dayOfMonth = (dateStr) => Number(dateStr.slice(8, 10));

const diffInDays = (a, b) => {
  const ms = new Date(a + "T00:00:00Z") - new Date(b + "T00:00:00Z");
  return Math.round(ms / 86400000);
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const isDueOn = (rule, dateStr) => {
  if (!rule.active) return false;
  if (dateStr < rule.startDate) return false;
  if (rule.endDate && dateStr > rule.endDate) return false;

  if (rule.frequency === "monthly-same-day") {
    return dayOfMonth(dateStr) === dayOfMonth(rule.startDate);
  }

  if (rule.frequency === "every-n-days") {
    const anchor = rule.scheduleAnchor || rule.startDate;
    if (dateStr < anchor) return false;
    return diffInDays(dateStr, anchor) % rule.interval === 0;
  }

  return false;
};

const daysInMonth = (year, month) => new Date(year, month, 0).getDate();

const dateStrFor = (year, month, day) => {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

module.exports = { dayOfMonth, diffInDays, todayStr, isDueOn, daysInMonth, dateStrFor };
