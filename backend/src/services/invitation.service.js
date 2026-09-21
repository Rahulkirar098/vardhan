const crypto = require("crypto");

/**
 * Generate a secure 32-byte hex token.
 */
const generateInvitationToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

/**
 * Hash a raw token value using sha256.
 * This is exactly equivalent to the existing logic in hr.controller.js
 * to ensure old tokens remain valid.
 */
const hashTokenValue = (value) => {
    return crypto.createHash("sha256").update(value).digest("hex");
};

/**
 * Calculate standard expiry time (48 hours).
 */
const getStandardExpiry = () => {
    return new Date(Date.now() + 48 * 60 * 60 * 1000);
};

module.exports = {
    generateInvitationToken,
    hashTokenValue,
    getStandardExpiry,
};
