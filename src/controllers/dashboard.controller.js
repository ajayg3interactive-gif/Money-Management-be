const Transaction = require("../models/Transactions");
const { ok, fail } = require("../utils/response");
const { dateFor } = require("../utils/recurrence");

const monthRange = (month, year) => ({
  start: dateFor(year, month, 1),
  // Exclusive upper bound: midnight UTC of the 1st of the following month.
  end: month === 12 ? dateFor(year + 1, 1, 1) : dateFor(year, month + 1, 1),
});

const sumForMonth = async (userId, month, year) => {
  const { start, end } = monthRange(month, year);
  const transactions = await Transaction.find({
    user: userId,
    type: { $in: ["Income", "Expense"] },
    date: { $gte: start, $lt: end },
  });

  return {
    income: transactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0),
    expense: transactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0),
  };
};

const percentChange = (curr, prev) => {
  if (prev === null || prev === 0) return null;
  return Number((((curr - prev) / Math.abs(prev)) * 100).toFixed(1));
};

const getSummary = async (req, res) => {
  try {
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const [current, balanceEntry] = await Promise.all([
      sumForMonth(req.user.id, month, year),
      Transaction.findOne({ user: req.user.id, type: "Balance" }),
    ]);
    const currentBalance = balanceEntry?.amount ?? 0;

    const previous = month > 1 ? await sumForMonth(req.user.id, month - 1, year) : null;

    const totalBalance = current.income - current.expense;
    const monthlyIncome = current.income;
    const monthlyExpense = current.expense;
    const totalSavings = currentBalance + current.income - current.expense;

    const prevTotalBalance = previous ? previous.income - previous.expense : null;
    const prevTotalSavings = previous ? currentBalance + previous.income - previous.expense : null;

    return ok(res, {
      month,
      year,
      currentBalance,
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      totalSavings,
      trends: {
        totalBalance: percentChange(totalBalance, prevTotalBalance),
        monthlyIncome: percentChange(monthlyIncome, previous?.income ?? null),
        monthlyExpense: percentChange(monthlyExpense, previous?.expense ?? null),
        totalSavings: percentChange(totalSavings, prevTotalSavings),
      },
    });
  } catch (err) {
    return fail(res, 500, "DASHBOARD_SUMMARY_FAILED", err.message);
  }
};

module.exports = { getSummary };
