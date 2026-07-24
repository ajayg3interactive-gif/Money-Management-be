const Transactions = require("../models/Transactions");
const { ok, fail } = require("../utils/response");

const format = (t) => ({
  id: t._id,
  date: t.date,
  description: t.description,
  category: t.category,
  amount: t.amount,
  type: t.type,
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

    const transaction = new Transactions({
      user: req.user.id,
      date,
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
    const updated = await Transactions.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { date, description, category, amount, type },
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


module.exports = { getAll, create, update, remove };
