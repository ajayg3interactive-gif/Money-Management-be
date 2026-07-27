const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const COOKIE_NAME = "mm_token";

const newSid = () => crypto.randomUUID();

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const decodeToken = (token) => jwt.decode(token);

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, cookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
};

module.exports = { COOKIE_NAME, newSid, signToken, verifyToken, decodeToken, setAuthCookie, clearAuthCookie };
