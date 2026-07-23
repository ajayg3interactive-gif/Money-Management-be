const mongoose = require("mongoose");

const recurringTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  description: { type: String, default: "" },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["Income", "Expense"], required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, default: null },
  frequency: { type: String, enum: ["monthly-same-day", "every-n-days"], required: true },
  interval: { type: Number, default: null },
  active: { type: Boolean, default: true },
  // Anchor date used to compute due dates for "every-n-days" rules.
  // Starts at startDate, and gets rebased to the unhold date when an overdue occurrence is unheld.
  scheduleAnchor: { type: String, required: true },
});

module.exports = mongoose.model("RecurringTransaction", recurringTransactionSchema);
