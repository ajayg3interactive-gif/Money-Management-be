const Session = require("../models/Session");
const { newSid, signToken, decodeToken } = require("./jwt");

/** Signs a JWT for the user and records a matching Session row so it can be revoked later. */
const createSession = async (user) => {
  const sid = newSid();
  const token = signToken({ sub: user._id.toString(), email: user.email, sid });
  const { exp } = decodeToken(token);
  await Session.create({ userId: user._id, sid, expiresAt: new Date(exp * 1000) });
  return token;
};

const revokeSession = (sid) => Session.updateOne({ sid }, { revoked: true });

/** Invalidates every active session for a user, e.g. after a password or email change. */
const revokeAllSessions = (userId) => Session.updateMany({ userId, revoked: false }, { revoked: true });

module.exports = { createSession, revokeSession, revokeAllSessions };
