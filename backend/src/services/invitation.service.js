const crypto = require("crypto");

/**
 * Generate a secure 32-byte hex token.
 */
const generateInvitationToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

/**
 * Hash a raw token value using sha256.
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

const { renderEmailTemplate } = require("../utils/emailTemplate.util");

/**
 * Builds the text and HTML payload for an invitation email using the central template system.
 */
const buildInvitationEmailTemplate = ({ hospitalName, recipientName, inviterName, invitationUrl, expiresAt }) => {
    const inviterString = inviterName ? `by ${inviterName} ` : "";
    const formattedExpiry = expiresAt || "48 hours";

    const html = renderEmailTemplate("invitation", {
        employeeName: recipientName || "Employee",
        hospitalName: hospitalName || "Hospital",
        inviterName: inviterName || "",
        invitationUrl,
        expiresAt: formattedExpiry,
    });

    const text = `Hello ${recipientName},\n\nYou have been invited ${inviterString}to join ${hospitalName} as an employee.\n\nClick the link below to complete your onboarding:\n${invitationUrl}\n\nThis invitation expires in ${formattedExpiry}.\n\nIf you did not expect this, you can ignore this email.`;

    return { text, html };
};

module.exports = {
    generateInvitationToken,
    hashTokenValue,
    getStandardExpiry,
    buildInvitationEmailTemplate,
};
