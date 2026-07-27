const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const OtpVerification = require("../models/OtpVerification");
const { COOKIE_NAME, verifyToken, setAuthCookie, clearAuthCookie } = require("../utils/jwt");
const { createSession, revokeSession, revokeAllSessions } = require("../utils/sessions");
const { ok, fail } = require("../utils/response");
const { AVATAR_DIR } = require("../middleware/upload.middleware");
const { CURRENCIES } = require("../data/currencies");
const { sendOtpEmail, sendChangeEmailLink, sendResetPasswordLink } = require("../utils/mailer");
const { generateOtp, otpExpiryDate, MAX_ATTEMPTS } = require("../utils/otp");
const { generateActionToken, hashActionToken, actionExpiryDate } = require("../utils/accountAction");
const PendingAccountAction = require("../models/PendingAccountAction");

const SYMBOL_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c.symbol]));

const format = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone ?? null,
  avatarUrl: u.avatarUrl ?? null,
  currency: u.currency ?? "USD",
  currencySymbol: SYMBOL_BY_CODE.get(u.currency) ?? "$",
  dashboardTourSeen: u.dashboardTourSeen ?? false,
  planTourSeen: u.planTourSeen ?? false,
});

const TOUR_FIELDS = { "dashboard-onboarding": "dashboardTourSeen", "plan-onboarding": "planTourSeen" };

const deleteAvatarFile = (avatarUrl) => {
  if (!avatarUrl) return;
  const filePath = path.join(AVATAR_DIR, path.basename(avatarUrl));
  fs.unlink(filePath, () => {});
};

const issueSession = async (res, user) => {
  const token = await createSession(user);
  setAuthCookie(res, token);
};

const sendOtp = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return fail(res, 400, "VALIDATION_ERROR", "Name and email are required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return fail(res, 409, "EMAIL_IN_USE", "An account with this email already exists");
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await OtpVerification.findOneAndUpdate(
      { email: normalizedEmail },
      { email: normalizedEmail, name, otpHash, expiresAt: otpExpiryDate(), verified: false, attempts: 0 },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await sendOtpEmail(normalizedEmail, name, otp);

    return ok(res, { email: normalizedEmail }, 200);
  } catch (err) {
    console.error("sendOtp failed:", err);
    return fail(res, 400, "OTP_SEND_FAILED", "Could not send verification code. Please try again.");
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return fail(res, 400, "VALIDATION_ERROR", "Email and OTP are required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = await OtpVerification.findOne({ email: normalizedEmail });
    if (!record) {
      return fail(res, 400, "OTP_NOT_FOUND", "No verification code found for this email. Please request a new one.");
    }

    if (record.expiresAt < new Date()) {
      return fail(res, 400, "OTP_EXPIRED", "This code has expired. Please request a new one.");
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return fail(res, 429, "OTP_ATTEMPTS_EXCEEDED", "Too many incorrect attempts. Please request a new code.");
    }

    const match = await bcrypt.compare(otp, record.otpHash);
    if (!match) {
      record.attempts += 1;
      await record.save();
      return fail(res, 400, "OTP_INVALID", "Incorrect code. Please try again.");
    }

    record.verified = true;
    await record.save();

    return ok(res, { email: normalizedEmail, verified: true }, 200);
  } catch (err) {
    console.error("verifyOtp failed:", err);
    return fail(res, 400, "OTP_VERIFY_FAILED", "Could not verify code. Please try again.");
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return fail(res, 400, "VALIDATION_ERROR", "Name, email and password are required");
    }
    if (password.length < 6) {
      return fail(res, 400, "VALIDATION_ERROR", "Password must be at least 6 characters");
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return fail(res, 409, "EMAIL_IN_USE", "An account with this email already exists");
    }

    const otpRecord = await OtpVerification.findOne({ email: normalizedEmail });
    if (!otpRecord || !otpRecord.verified) {
      return fail(res, 400, "EMAIL_NOT_VERIFIED", "Please verify your email before creating an account");
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalizedEmail, password: hashed });
    await OtpVerification.deleteOne({ email: normalizedEmail });
    await issueSession(res, user);
    return ok(res, format(user), 201);
  } catch (err) {
    console.error("register failed:", err);
    return fail(res, 400, "REGISTRATION_FAILED", "Could not create account. Please try again.");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, 401, "INVALID_CREDENTIALS", "Invalid email or password");

    await issueSession(res, user);
    return ok(res, format(user));
  } catch (err) {
    console.error("login failed:", err);
    return fail(res, 400, "LOGIN_FAILED", "Could not log in. Please try again.");
  }
};

const logout = async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const { sid } = verifyToken(token);
      await revokeSession(sid);
    } catch {
      // token already invalid/expired - nothing to revoke
    }
  }
  clearAuthCookie(res);
  return ok(res, null, 200);
};

const me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");
  return ok(res, format(user));
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name) {
      return fail(res, 400, "VALIDATION_ERROR", "Name is required");
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone: phone || null },
      { new: true, runValidators: true }
    );
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

    return ok(res, format(user));
  } catch (err) {
    console.error("updateProfile failed:", err);
    return fail(res, 400, "UPDATE_FAILED", "Could not update profile. Please try again.");
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 400, "VALIDATION_ERROR", "No image file provided");
    }

    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

    deleteAvatarFile(user.avatarUrl);
    user.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    return ok(res, format(user));
  } catch (err) {
    console.error("uploadAvatar failed:", err);
    return fail(res, 400, "UPLOAD_FAILED", "Could not upload image. Please try again.");
  }
};

const deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

    deleteAvatarFile(user.avatarUrl);
    user.avatarUrl = null;
    await user.save();

    return ok(res, format(user));
  } catch (err) {
    console.error("deleteAvatar failed:", err);
    return fail(res, 400, "DELETE_FAILED", "Could not remove image. Please try again.");
  }
};

const markTourSeen = async (req, res) => {
  try {
    const { tourId, seen } = req.body;
    const field = TOUR_FIELDS[tourId];
    if (!field) {
      return fail(res, 400, "VALIDATION_ERROR", "Unknown tourId");
    }

    const user = await User.findByIdAndUpdate(req.user.id, { [field]: seen !== false }, { new: true });
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

    return ok(res, format(user));
  } catch (err) {
    console.error("markTourSeen failed:", err);
    return fail(res, 400, "UPDATE_FAILED", "Could not update tour status. Please try again.");
  }
};

const createPendingAction = async (userId, purpose, newEmail = null) => {
  const rawToken = generateActionToken();
  await PendingAccountAction.create({
    userId,
    purpose,
    tokenHash: hashActionToken(rawToken),
    newEmail,
    expiresAt: actionExpiryDate(),
  });
  return rawToken;
};

const findValidPendingAction = (token, purpose) =>
  PendingAccountAction.findOne({
    purpose,
    tokenHash: hashActionToken(token),
    used: false,
    expiresAt: { $gt: new Date() },
  });

const requestChangeEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

    const rawToken = await createPendingAction(user._id, "change-email");
    const link = `${process.env.CLIENT_URL}/change-email/confirm?token=${rawToken}`;
    await sendChangeEmailLink(user.email, user.name, link);

    return ok(res, { email: user.email }, 200);
  } catch (err) {
    console.error("requestChangeEmail failed:", err);
    return fail(res, 400, "REQUEST_FAILED", "Could not send confirmation email. Please try again.");
  }
};

const confirmChangeEmail = async (req, res) => {
  try {
    const { token, newEmail, confirmEmail } = req.body;
    if (!token || !newEmail || !confirmEmail) {
      return fail(res, 400, "VALIDATION_ERROR", "New email and confirmation are required");
    }
    if (newEmail.toLowerCase().trim() !== confirmEmail.toLowerCase().trim()) {
      return fail(res, 400, "VALIDATION_ERROR", "Emails do not match");
    }

    const normalizedEmail = newEmail.toLowerCase().trim();

    const pending = await findValidPendingAction(token, "change-email");
    if (!pending) {
      return fail(res, 400, "TOKEN_INVALID", "This link is invalid or has expired. Please request a new one.");
    }

    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: pending.userId } });
    if (existing) {
      return fail(res, 409, "EMAIL_IN_USE", "An account with this email already exists");
    }

    const user = await User.findByIdAndUpdate(pending.userId, { email: normalizedEmail }, { new: true });
    if (!user) return fail(res, 400, "TOKEN_INVALID", "This link is invalid or has expired. Please request a new one.");

    pending.used = true;
    await pending.save();
    await revokeAllSessions(user._id);
    clearAuthCookie(res);

    return ok(res, { email: user.email }, 200);
  } catch (err) {
    console.error("confirmChangeEmail failed:", err);
    return fail(res, 400, "CONFIRM_FAILED", "Could not update email. Please try again.");
  }
};

const requestChangePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

    const rawToken = await createPendingAction(user._id, "reset-password");
    const link = `${process.env.CLIENT_URL}/reset-password/confirm?token=${rawToken}`;
    await sendResetPasswordLink(user.email, user.name, link);

    return ok(res, { email: user.email }, 200);
  } catch (err) {
    console.error("requestChangePassword failed:", err);
    return fail(res, 400, "REQUEST_FAILED", "Could not send confirmation email. Please try again.");
  }
};

const confirmResetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) {
      return fail(res, 400, "VALIDATION_ERROR", "New password and confirmation are required");
    }
    if (newPassword !== confirmPassword) {
      return fail(res, 400, "VALIDATION_ERROR", "Passwords do not match");
    }
    if (newPassword.length < 6) {
      return fail(res, 400, "VALIDATION_ERROR", "Password must be at least 6 characters");
    }

    const pending = await findValidPendingAction(token, "reset-password");
    if (!pending) {
      return fail(res, 400, "TOKEN_INVALID", "This link is invalid or has expired. Please request a new one.");
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(pending.userId, { password: hashed }, { new: true });
    if (!user) return fail(res, 400, "TOKEN_INVALID", "This link is invalid or has expired. Please request a new one.");

    pending.used = true;
    await pending.save();
    await revokeAllSessions(user._id);
    clearAuthCookie(res);

    return ok(res, null, 200);
  } catch (err) {
    console.error("confirmResetPassword failed:", err);
    return fail(res, 400, "CONFIRM_FAILED", "Could not update password. Please try again.");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  register,
  login,
  logout,
  me,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  markTourSeen,
  requestChangeEmail,
  confirmChangeEmail,
  requestChangePassword,
  confirmResetPassword,
};
