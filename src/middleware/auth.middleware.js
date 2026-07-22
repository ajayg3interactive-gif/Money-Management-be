const { COOKIE_NAME, verifyToken } = require("../utils/jwt");

const requireAuth = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please log in again" });
  }
};

module.exports = { requireAuth };
