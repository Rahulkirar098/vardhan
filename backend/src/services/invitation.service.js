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

/**
 * Builds the text and HTML payload for an invitation email.
 * This avoids duplicate raw HTML strings in the services.
 */
const buildInvitationEmailTemplate = ({ hospitalName, recipientName, inviterName, invitationUrl }) => {
    const inviterString = inviterName ? `by ${inviterName} ` : "";

    const text = `Hello ${recipientName},\n\nYou have been invited ${inviterString}to join ${hospitalName} as an employee.\n\nClick the link below to complete your onboarding:\n${invitationUrl}\n\nThis invitation expires in 48 hours.\n\nIf you did not expect this, you can ignore this email.`;

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2>You've been invited to join ${hospitalName}</h2>
            <p>Hello ${recipientName},</p>
            <p>You have been invited ${inviterString}to join <strong>${hospitalName}</strong> as an employee.</p>
            <p>Click the button below to complete your onboarding and confirm your employee record.</p>
            <p>
                <a href="${invitationUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    Accept Invitation
                </a>
            </p>
            <p>This invitation expires in 48 hours.</p>
            <p>If you did not expect this invitation, you can ignore this email.</p>
            <p>Regards,<br />Vardhan</p>
        </div>
    `;

    return { text, html };
};

module.exports = {
    generateInvitationToken,
    hashTokenValue,
    getStandardExpiry,
    buildInvitationEmailTemplate,
};
