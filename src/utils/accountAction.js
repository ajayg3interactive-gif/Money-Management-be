const crypto = require("crypto");

const ACTION_EXPIRY_MINUTES = Number(process.env.ACCOUNT_ACTION_EXPIRY_MINUTES) || 30;

const generateActionToken = () => crypto.randomBytes(32).toString("hex");

const hashActionToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const actionExpiryDate = () => new Date(Date.now() + ACTION_EXPIRY_MINUTES * 60 * 1000);

module.exports = { generateActionToken, hashActionToken, actionExpiryDate, ACTION_EXPIRY_MINUTES };
