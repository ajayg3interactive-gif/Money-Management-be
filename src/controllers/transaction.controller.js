const Transactions = require("../models/Transactions");
const { ok, fail } = require("../utils/response");
const { parseDateStr, formatDateStr } = require("../utils/dateUtc");

const format = (t) => ({
  id: t._id,
  date: formatDateStr(t.date),
  description: t.description,
  category: t.category,
  amount: t.amount,
  type: t.type,
  fromRecurring: t.fromRecurring ?? false,
});

const getAll = async (req, res) => {
  try {
    const transactions = await Transactions.find({ user: req.user.id, type: { $ne: "Balance" } });
    res.json(transactions.map(format));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { date, description, category, amount, type } = req.body;
    if (!date || !category || amount === undefined || amount === null || !type) {
      return fail(res, 400, "VALIDATION_ERROR", "Date, category, amount and type are required");
    }

    const parsedDate = parseDateStr(date);
    if (!parsedDate) {
      return fail(res, 400, "VALIDATION_ERROR", "Date must be in YYYY-MM-DD format");
    }

    const transaction = new Transactions({
      user: req.user.id,
      date: parsedDate,
      description,
      category,
      amount,
      type,
    });
    const saved = await transaction.save();
    return ok(res, format(saved), 201);
  } catch (err) {
    console.error("create transaction failed:", err);
    return fail(res, 400, "TRANSACTION_CREATE_FAILED", "Could not save transaction. Please try again.");
  }
};

const update = async (req, res) => {
  try {
    const { date, description, category, amount, type } = req.body;
    const parsedDate = parseDateStr(date);
    if (date && !parsedDate) {
      return res.status(400).json({ error: "Date must be in YYYY-MM-DD format" });
    }

    const updated = await Transactions.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { date: parsedDate, description, category, amount, type },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: "Transaction not found" });
    res.json(format(updated));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await Transactions.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return res.status(404).json({ error: "Transaction not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const bulkCreate = async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return fail(res, 400, "VALIDATION_ERROR", "transactions must be a non-empty array");
    }

    const docs = [];
    for (let i = 0; i < transactions.length; i++) {
      const { date, description, category, amount, type } = transactions[i];

      if (!["Income", "Expense"].includes(type)) {
        return fail(res, 400, "VALIDATION_ERROR", `Row ${i + 1}: type must be Income or Expense`);
      }
      if (!category) {
        return fail(res, 400, "VALIDATION_ERROR", `Row ${i + 1}: category is required`);
      }
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return fail(res, 400, "VALIDATION_ERROR", `Row ${i + 1}: amount must be a positive number`);
      }
      const parsedDate = parseDateStr(date);
      if (!parsedDate) {
        return fail(res, 400, "VALIDATION_ERROR", `Row ${i + 1}: date must be in YYYY-MM-DD format`);
      }

      docs.push({
        user: req.user.id,
        date: parsedDate,
        description: description || "",
        category,
        amount,
        type,
      });
    }

    const saved = await Transactions.insertMany(docs);
    return ok(res, saved.map(format), 201);
  } catch (err) {
    console.error("bulk create transactions failed:", err);
    return fail(res, 400, "TRANSACTION_BULK_CREATE_FAILED", "Could not import transactions. Please try again.");
  }
};

module.exports = { getAll, create, update, remove, bulkCreate };
