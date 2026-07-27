const mongoose = require("mongoose");

const pendingAccountActionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, enum: ["change-email", "reset-password"], required: true },
    tokenHash: { type: String, required: true },
    newEmail: { type: String, lowercase: true, trim: true, default: null },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PendingAccountAction", pendingAccountActionSchema);
