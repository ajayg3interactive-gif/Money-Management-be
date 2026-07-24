const mongoose = require("mongoose");

const transactionSchemma = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  date: { type: String, required: true },
  description: { type: String, default: "" },
  category: {
    type: String,
    required: function () {
      return this.type !== "Balance";
    },
  },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["Income", "Expense", "Balance"], required: true },
});

module.exports = mongoose.model("Transaction", transactionSchemma);
