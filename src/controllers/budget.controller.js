const Budget = require("../models/Budget");
const { ok, fail } = require("../utils/response");

const format = (b) => ({
  id: b._id,
  category: b.category,
  maximum: b.maximum,
});

const getAll = async (req, res) => {
  try {
    const budgets = await Budget.find({ user: req.user.id });
    return ok(res, budgets.map(format));
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
