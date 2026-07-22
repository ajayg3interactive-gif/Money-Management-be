const { COOKIE_NAME, verifyToken } = require("../utils/jwt");
const { fail } = require("../utils/response");

const requireAuth = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return fail(res, 401, "SESSION_EXPIRED", "Session expired, please log in again");
  }
};

module.exports = { requireAuth };
