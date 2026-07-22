const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/jwt");

const format = (u) => ({ id: u._id, name: u.name, email: u.email });

const issueSession = (res, user) => {
  const token = signToken({ sub: user._id.toString(), email: user.email });
  setAuthCookie(res, token);
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    issueSession(res, user);
    res.status(201).json(format(user));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid email or password" });

    issueSession(res, user);
    res.json(format(user));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const logout = (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
};

const me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json(format(user));
};

module.exports = { register, login, logout, me };
