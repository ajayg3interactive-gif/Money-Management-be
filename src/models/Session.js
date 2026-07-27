const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sid: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
