const Budget = require("../models/Budget");
const Transaction = require("../models/Transactions");
const { ok, fail } = require("../utils/response");
const { dateFor } = require("../utils/recurrence");

const format = (b) => ({
  id: b._id,
  category: b.category,
  maximum: b.maximum,
});

const currentMonthRange = (month, year) => {
  const now = new Date();
  const targetYear = year ? Number(year) : now.getUTCFullYear();
  const targetMonth = month ? Number(month) : now.getUTCMonth() + 1;
  return {
    start: dateFor(targetYear, targetMonth, 1),
    // Exclusive upper bound: midnight UTC of the 1st of the following month.
    end: targetMonth === 12 ? dateFor(targetYear + 1, 1, 1) : dateFor(targetYear, targetMonth + 1, 1),
  };
};

const getAll = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id });

    const { start, end } = currentMonthRange(req.query.month, req.query.year);
    const expenses = await Transaction.find({
      user: req.user.id,
      type: "Expense",
      date: { $gte: start, $lt: end },
    });
    const spentByCategory = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

    return ok(res, budgets.map((b) => ({ ...format(b), spent: spentByCategory[b.category] || 0 })));
  } catch (err) {
    return fail(res, 500, "BUDGET_FETCH_FAILED", err.message);
  }
};

const create = async (req, res) => {
  try {
    const { category, maximum } = req.body;
    if (!category || maximum === undefined || maximum === null) {
      return fail(res, 400, "VALIDATION_ERROR", "Category and maximum amount are required");
    }

    const budget = new Budget({
      user: req.user.id,
      category,
      maximum,
    });
    const saved = await budget.save();
    return ok(res, format(saved), 201);
  } catch (err) {
    console.error("create budget failed:", err);
    return fail(res, 400, "BUDGET_CREATE_FAILED", "Could not save budget. Please try again.");
  }
};

const update = async (req, res) => {
  try {
    const { category, maximum } = req.body;
    if (!category || maximum === undefined || maximum === null) {
      return fail(res, 400, "VALIDATION_ERROR", "Category and maximum amount are required");
    }

    const updated = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { category, maximum },
      { new: true, runValidators: true }
    );
    if (!updated) return fail(res, 404, "BUDGET_NOT_FOUND", "Budget not found");
    return ok(res, format(updated));
  } catch (err) {
    console.error("update budget failed:", err);
    return fail(res, 400, "BUDGET_UPDATE_FAILED", "Could not update budget. Please try again.");
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return fail(res, 404, "BUDGET_NOT_FOUND", "Budget not found");
    return res.status(204).send();
  } catch (err) {
    console.error("delete budget failed:", err);
    return fail(res, 400, "BUDGET_DELETE_FAILED", "Could not delete budget. Please try again.");
  }
};

module.exports = { getAll, create, update, remove };
