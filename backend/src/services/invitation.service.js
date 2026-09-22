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

/**
 * Builds the text and HTML payload for an invitation email.
 * This avoids duplicate raw HTML strings in the services.
 */
const buildInvitationEmailTemplate = ({ hospitalName, recipientName, inviterName, role, invitationUrl }) => {
    const roleString = role === "HR" ? "HR" : "an employee";
    const inviterString = inviterName ? `by ${inviterName} ` : (role === "HR" ? "by your admin " : "by your HR ");

    const text = `Hello ${recipientName},\n\nYou have been invited ${inviterString}to join ${hospitalName}${role === "HR" ? ".\n\nRole: HR" : " as an employee"}.\n\nClick the link below to complete your onboarding:\n${invitationUrl}\n\nThis invitation expires in 48 hours.\n\nIf you did not expect this, you can ignore this email.`;

    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2>You've been invited to join ${hospitalName}</h2>
            <p>Hello ${recipientName},</p>
            <p>You have been invited ${inviterString}to join <strong>${hospitalName}</strong>${role === "HR" ? "." : " as an employee."}</p>
            ${role === "HR" ? "<p><strong>Role:</strong> HR</p>" : ""}
            <p>Click the button below to ${role === "HR" ? "accept the invitation and create your account." : "complete your onboarding and confirm your employee record."}</p>
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
