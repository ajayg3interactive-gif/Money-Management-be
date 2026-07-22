const Transactions = require("../models/Transactions");

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
    const transactions = await Transactions.find();
    res.json(transactions.map(format));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { date, description, category, amount, type } = req.body;
    const transaction = new Transactions({
      date,
      description,
      category,
      amount,
      type,
    });
    const saved = await transaction.save();
    res.status(201).json(format(saved));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const update = async (req, res) => {
  try {
    const { date, description, category, amount, type } = req.body;
    const updated = await Transactions.findByIdAndUpdate(
      req.params.id,
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
    const deleted = await Transactions.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Transaction not found" });
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


module.exports = { getAll, create, update, remove };