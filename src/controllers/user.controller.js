const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/jwt");
const { ok, fail } = require("../utils/response");
const { AVATAR_DIR } = require("../middleware/upload.middleware");
const { CURRENCIES } = require("../data/currencies");

const SYMBOL_BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c.symbol]));

const format = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone ?? null,
  avatarUrl: u.avatarUrl ?? null,
  currency: u.currency ?? "USD",
  currencySymbol: SYMBOL_BY_CODE.get(u.currency) ?? "$",
});

const deleteAvatarFile = (avatarUrl) => {
  if (!avatarUrl) return;
  const filePath = path.join(AVATAR_DIR, path.basename(avatarUrl));
  fs.unlink(filePath, () => {});
};

const issueSession = (res, user) => {
  const token = signToken({ sub: user._id.toString(), email: user.email });
  setAuthCookie(res, token);
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

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return fail(res, 409, "EMAIL_IN_USE", "An account with this email already exists");
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
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

module.exports = { register, login, logout, me, updateProfile, uploadAvatar, deleteAvatar };
