const nodemailer = require("nodemailer");

const isPlaceholderSmtpValue = (value) => {
    if (!value) return true;

    const normalized = String(value).trim().toLowerCase();
    return [
        "smtp.yourprovider.com",
        "yourprovider.com",
        "smtp.example.com",
        "example.com",
        "your-email@example.com",
        "your-password",
        "localhost",
        "127.0.0.1",
    ].includes(normalized);
};

const createTransporter = () => {
    const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        throw new Error("SMTP configuration is missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in backend/.env.");
    }

    if (isPlaceholderSmtpValue(SMTP_HOST) || isPlaceholderSmtpValue(SMTP_USER) || isPlaceholderSmtpValue(SMTP_PASS)) {
        throw new Error("SMTP configuration is invalid or still using placeholder values. Replace SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM_EMAIL with real credentials in backend/.env.");
    }

    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT || 587),
        secure: Number(SMTP_PORT || 587) === 465,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });
};

const sendEmail = async ({ to, subject, text, html }) => {
    const transporter = createTransporter();

    return transporter.sendMail({
        from: `${process.env.SMTP_FROM_NAME || "Vardhan"} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html,
    });
};

module.exports = {
    sendEmail,
};
