const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  category: { type: String, required: true },
  maximum: { type: Number, required: true },
});

module.exports = mongoose.model("Budget", budgetSchema);
