const mongoose = require("mongoose");

const recurringOccurrenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rule: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringTransaction", required: true, index: true },
  // Original scheduled date for this occurrence (used for calendar placement).
  date: { type: Date, required: true },
  status: { type: String, enum: ["held", "posted"], required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
});

recurringOccurrenceSchema.index({ rule: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("RecurringOccurrence", recurringOccurrenceSchema);
