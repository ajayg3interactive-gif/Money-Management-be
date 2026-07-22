const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/jwt");
const { ok, fail } = require("../utils/response");

const format = (u) => ({ id: u._id, name: u.name, email: u.email });

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

module.exports = { register, login, logout, me };
