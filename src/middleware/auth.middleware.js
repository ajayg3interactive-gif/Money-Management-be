const { COOKIE_NAME, verifyToken } = require("../utils/jwt");
const { fail } = require("../utils/response");
const Session = require("../models/Session");

const requireAuth = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return fail(res, 401, "UNAUTHENTICATED", "Not authenticated");

  try {
    const payload = verifyToken(token);

    const session = await Session.findOne({ sid: payload.sid });
    if (!session || session.revoked) {
      return fail(res, 401, "SESSION_EXPIRED", "Session expired, please log in again");
    }

    req.user = { id: payload.sub, email: payload.email, sid: payload.sid };
    next();
  } catch {
    return fail(res, 401, "SESSION_EXPIRED", "Session expired, please log in again");
  }
};

module.exports = { requireAuth };
