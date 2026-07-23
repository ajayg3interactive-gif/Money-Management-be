const mongoose = require("mongoose");

const dropdownSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  label: { type: String, required: true },
  value: { type: String, required: true },
  position: { type: Number, default: 0 },
});

dropdownSchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model("Dropdown", dropdownSchema);
