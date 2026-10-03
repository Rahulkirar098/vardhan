const { sendEmail } = require('../utils/mail');
const { renderEmailTemplate } = require('../utils/emailTemplate.util');

/**
 * Format date values into human-readable strings if provided as Date objects or ISO strings.
 */
function formatDate(dateVal) {
    if (!dateVal) return 'N/A';
    try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return String(dateVal);
    }
}

/**
 * Send an employee onboarding invitation email
 */
const sendInvitationEmail = async ({
    to,
    recipientName,
    employeeName,
    hospitalName,
    inviterName,
    invitationUrl,
    expiresAt,
}) => {
    const targetName = recipientName || employeeName || 'Employee';
    const formattedExpiry = formatDate(expiresAt || new Date(Date.now() + 48 * 60 * 60 * 1000));

    const html = renderEmailTemplate('invitation', {
        employeeName: targetName,
        hospitalName: hospitalName || 'Hospital',
        inviterName: inviterName || '',
        invitationUrl,
        expiresAt: formattedExpiry,
    });

    const inviterString = inviterName ? `by ${inviterName} ` : '';
    const text = `Hello ${targetName},\n\nYou have been invited ${inviterString}to join ${hospitalName} as an employee.\n\nClick the link below to complete your onboarding:\n${invitationUrl}\n\nThis invitation expires on ${formattedExpiry}.\n\nIf you did not expect this, you can ignore this email.`;

    return sendEmail({
        to,
        subject: `You've been invited to join ${hospitalName}`,
        text,
        html,
    });
};

/**
 * Send a password reset email
 */
const sendPasswordResetEmail = async ({
    to,
    recipientName,
    resetUrl,
    expiresAt,
}) => {
    const targetName = recipientName || 'User';
    const formattedExpiry = formatDate(expiresAt || new Date(Date.now() + 60 * 60 * 1000));

    const html = renderEmailTemplate('password-reset', {
        recipientName: targetName,
        resetUrl,
        expiresAt: formattedExpiry,
    });

    const text = `Hello ${targetName},\n\nYou requested a password reset for your Nuvince account.\n\nClick the link below to reset your password (valid until ${formattedExpiry}):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`;

    return sendEmail({
        to,
        subject: 'Reset your Nuvince password',
        text,
        html,
    });
};

/**
 * Send a welcome onboarding email
 */
const sendWelcomeEmail = async ({
    to,
    recipientName,
    employeeName,
    hospitalName,
    loginUrl,
}) => {
    const targetName = recipientName || employeeName || 'Employee';
    const targetLoginUrl = loginUrl || 'https://nuvince.vercel.app/login';

    const html = renderEmailTemplate('welcome', {
        employeeName: targetName,
        hospitalName: hospitalName || 'Hospital',
        loginUrl: targetLoginUrl,
    });

    const text = `Welcome, ${targetName}!\n\nYour account for ${hospitalName} has been successfully activated on the Nuvince Hospital Workforce Management Platform.\n\nSign in to your dashboard to view your profile and work schedule:\n${targetLoginUrl}`;

    return sendEmail({
        to,
        subject: `Welcome to ${hospitalName} on Nuvince`,
        text,
        html,
    });
};

/**
 * Send a leave request notification email to managers/admins
 */
const sendLeaveRequestEmail = async ({
    to,
    recipientName,
    employeeName,
    hospitalName,
    leaveType,
    leaveStartDate,
    leaveEndDate,
    reason,
    actionUrl,
}) => {
    const targetActionUrl = actionUrl || 'https://nuvince.vercel.app/leaves';

    const html = renderEmailTemplate('leave-request', {
        recipientName: recipientName || 'Manager',
        employeeName: employeeName || 'Employee',
        hospitalName: hospitalName || 'Hospital',
        leaveType: leaveType || 'Leave',
        leaveStartDate: formatDate(leaveStartDate),
        leaveEndDate: formatDate(leaveEndDate),
        reason: reason || 'None provided',
        actionUrl: targetActionUrl,
    });

    const text = `Hello ${recipientName || 'Manager'},\n\n${employeeName} has submitted a new leave request (${leaveType}) for ${hospitalName} from ${formatDate(leaveStartDate)} to ${formatDate(leaveEndDate)}.\n\nReason: ${reason || 'None'}\n\nReview at: ${targetActionUrl}`;

    return sendEmail({
        to,
        subject: `New Leave Request: ${employeeName} (${leaveType})`,
        text,
        html,
    });
};

/**
 * Send a leave request decision (approval/rejection) notification email to an employee
 */
const sendLeaveDecisionEmail = async ({
    to,
    recipientName,
    employeeName,
    leaveType,
    leaveStartDate,
    leaveEndDate,
    leaveStatus,
    decisionComment,
    dashboardUrl,
}) => {
    const targetName = recipientName || employeeName || 'Employee';
    const targetDashboardUrl = dashboardUrl || 'https://nuvince.vercel.app/leaves';
    const statusText = String(leaveStatus || 'APPROVED').toUpperCase();

    const html = renderEmailTemplate('leave-decision', {
        employeeName: targetName,
        leaveType: leaveType || 'Leave',
        leaveStartDate: formatDate(leaveStartDate),
        leaveEndDate: formatDate(leaveEndDate),
        leaveStatus: statusText,
        decisionComment: decisionComment || 'No additional comment',
        dashboardUrl: targetDashboardUrl,
    });

    const text = `Hello ${targetName},\n\nYour leave request (${leaveType}) for the period ${formatDate(leaveStartDate)} to ${formatDate(leaveEndDate)} has been ${statusText}.\n\nComment: ${decisionComment || 'None'}\n\nView details at: ${targetDashboardUrl}`;

    return sendEmail({
        to,
        subject: `Leave Request ${statusText}: ${leaveType}`,
        text,
        html,
    });
};

module.exports = {
    sendInvitationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendLeaveRequestEmail,
    sendLeaveDecisionEmail,
};
