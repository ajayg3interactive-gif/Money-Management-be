const User = require("../models/User");
const { ok, fail } = require("../utils/response");
const { sendFeedbackEmail } = require("../utils/mailer");

const submitFeedback = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return fail(res, 400, "VALIDATION_ERROR", "Feedback message is required");
    }

    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

    await sendFeedbackEmail(user, message.trim(), req.files || []);

    return ok(res, { sent: true }, 200);
  } catch (err) {
    console.error("submitFeedback failed:", err);
    return fail(res, 400, "FEEDBACK_SEND_FAILED", "Could not send feedback. Please try again.");
  }
};

module.exports = { submitFeedback };
