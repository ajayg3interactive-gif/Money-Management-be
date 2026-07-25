const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const OtpVerification = require("../models/OtpVerification");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/jwt");
const { ok, fail } = require("../utils/response");
const { AVATAR_DIR } = require("../middleware/upload.middleware");
const { CURRENCIES } = require("../data/currencies");
const { sendOtpEmail } = require("../utils/mailer");
const { generateOtp, otpExpiryDate, MAX_ATTEMPTS } = require("../utils/otp");

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

const issueSession = (res, user) => {
  const token = signToken({ sub: user._id.toString(), email: user.email });
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
    issueSession(res, user);
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

    issueSession(res, user);
    return ok(res, format(user));
  } catch (err) {
    console.error("login failed:", err);
    return fail(res, 400, "LOGIN_FAILED", "Could not log in. Please try again.");
  }
};

const logout = (_req, res) => {
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
    const { name, email, phone } = req.body;
    if (!name || !email) {
      return fail(res, 400, "VALIDATION_ERROR", "Name and email are required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
    if (existing) {
      return fail(res, 409, "EMAIL_IN_USE", "An account with this email already exists");
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email: normalizedEmail, phone: phone || null },
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

module.exports = { sendOtp, verifyOtp, register, login, logout, me, updateProfile, uploadAvatar, deleteAvatar, markTourSeen };
