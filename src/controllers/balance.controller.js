const Transaction = require("../models/Transactions");
const User = require("../models/User");
const { CURRENCIES } = require("../data/currencies");
const { ok, fail } = require("../utils/response");
const { parseDateStr, formatDateStr } = require("../utils/dateUtc");

const getBalanceEntry = (userId) =>
  Transaction.findOne({ user: userId, type: "Balance" });

const getCurrencies = async (_req, res) => {
  return ok(res, CURRENCIES);
};

const getBalance = async (req, res) => {
  try {
    const [entry, user] = await Promise.all([
      getBalanceEntry(req.user.id),
      User.findById(req.user.id),
    ]);

    return ok(res, {
      amount: entry?.amount ?? 0,
      date: entry?.date ? formatDateStr(entry.date) : null,
      currency: user?.currency ?? "USD",
    });
  } catch (err) {
    return fail(res, 500, "BALANCE_FETCH_FAILED", err.message);
  }
};

const saveBalance = async (req, res) => {
  try {
    const { amount, date, currency } = req.body;

    if (amount === undefined || amount === null || Number.isNaN(Number(amount)) || Number(amount) < 0) {
      return fail(res, 400, "VALIDATION_ERROR", "A valid, non-negative amount is required");
    }
    if (!date) {
      return fail(res, 400, "VALIDATION_ERROR", "Balance date is required");
    }
    const parsedDate = parseDateStr(date);
    if (!parsedDate) {
      return fail(res, 400, "VALIDATION_ERROR", "Balance date must be in YYYY-MM-DD format");
    }
    if (!currency || !CURRENCIES.some((c) => c.code === currency)) {
      return fail(res, 400, "VALIDATION_ERROR", "A valid currency is required");
    }

    const [entry] = await Promise.all([
      Transaction.findOneAndUpdate(
        { user: req.user.id, type: "Balance" },
        { user: req.user.id, type: "Balance", amount: Number(amount), date: parsedDate },
        { new: true, upsert: true, runValidators: true }
      ),
      User.findByIdAndUpdate(req.user.id, { currency }),
    ]);

    return ok(res, { amount: entry.amount, date: formatDateStr(entry.date), currency });
  } catch (err) {
    console.error("save balance failed:", err);
    return fail(res, 400, "BALANCE_SAVE_FAILED", "Could not save balance. Please try again.");
  }
};

const getTotal = async (req, res) => {
  try {
    const [balanceEntry, transactions] = await Promise.all([
      getBalanceEntry(req.user.id),
      Transaction.find({ user: req.user.id, type: { $in: ["Income", "Expense"] } }),
    ]);
    const income = transactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = balanceEntry?.amount ?? 0;

    return ok(res, {
      total: currentBalance + income - expense,
      currentBalance,
      income,
      expense,
    });
  } catch (err) {
    return fail(res, 500, "BALANCE_TOTAL_FAILED", err.message);
  }
};

module.exports = { getBalance, saveBalance, getCurrencies, getTotal };
