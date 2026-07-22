const mongoose = require("mongoose");

const transactionSchemma = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["Income", "Expense"], required: true },
});

module.exports = mongoose.model("Transaction", transactionSchemma);
