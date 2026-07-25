const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: { type: String, trim: true, default: null },
    avatarUrl: { type: String, default: null },
    currency: { type: String, default: "USD" },
    dashboardTourSeen: { type: Boolean, default: false },
    planTourSeen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
