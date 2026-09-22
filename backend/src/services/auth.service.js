const crypto = require("crypto");
const User = require("../models/user.model");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken, revokeToken } = require("../utils/jwt");
const { sendEmail } = require("../utils/mail");

const getCurrentUser = async (userId) => {
    const user = await User.findById(userId).select("-password");
    if (!user) {
        const err = new Error("User not found");
        err.code = "NOT_FOUND";
        throw err;
    }
    if (user.status === "inactive") {
        const err = new Error("Account is inactive");
        err.code = "INACTIVE";
        throw err;
    }
    return user;
};

const registerUser = async ({ name, email, phone, password }) => {
    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        const err = new Error("Email already registered");
        err.code = "DUPLICATE_EMAIL";
        throw err;
    }

    const hashedPasswordValue = await hashPassword(password);

    const user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        password: hashedPasswordValue,
        role: "admin",
        status: "active",
        createdBy: null,
        hospitalId: null,
    });

    return user;
};

const loginUser = async ({ email, password }) => {
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        const err = new Error("Invalid email or password");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    if (user.status === "inactive") {
        const err = new Error("Account is inactive");
        err.code = "INACTIVE";
        throw err;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        const err = new Error("Invalid email or password");
        err.code = "UNAUTHORIZED";
        throw err;
    }

    const token = generateToken({
        id: user._id,
        role: user.role,
        hospitalId: user.hospitalId,
    });

    return { token, user };
};

const logoutUser = async (token) => {
    await revokeToken(token);
    return true;
};

const forgotPassword = async (email) => {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    
    if (!user) {
        return { message: "If an account exists for this email, a password reset link has been sent." };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    try {
        await sendEmail({
            to: normalizedEmail,
            subject: "Reset your Vardhan password",
            text: `Hello ${user.name},\n\nYou requested a password reset for your Vardhan account.\n\nClick the link below to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                    <h2>Reset your password</h2>
                    <p>Hello ${user.name},</p>
                    <p>You requested a password reset for your Vardhan account.</p>
                    <p>
                        <a href="${resetUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
                    </p>
                    <p>This link is valid for 1 hour.</p>
                    <p>If you did not request this, you can safely ignore this email.</p>
                    <p>Regards,<br />Vardhan</p>
                </div>
            `,
        });
    } catch (emailError) {
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        const err = new Error("Unable to send the password reset email. Please try again.");
        err.code = "EMAIL_FAILED";
        throw err;
    }

    return { message: "If an account exists for this email, a password reset link has been sent." };
};

const resetPassword = async (token, password) => {
    const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");

    const user = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
        const err = new Error("Reset token is invalid or has expired");
        err.code = "INVALID_TOKEN";
        throw err;
    }

    user.password = await hashPassword(password);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return true;
};

const changePassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId);

    if (!user) {
        const err = new Error("User not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    const isCurrentMatch = await comparePassword(currentPassword, user.password);

    if (!isCurrentMatch) {
        const err = new Error("Current password does not match");
        err.code = "PASSWORD_MISMATCH";
        throw err;
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return true;
};

const updateProfile = async (userId, name, phone) => {
    const user = await User.findById(userId);

    if (!user) {
        const err = new Error("User not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (name !== undefined) {
        const trimmedName = String(name).trim();
        if (!trimmedName) {
            const err = new Error("Name cannot be empty");
            err.code = "INVALID_INPUT";
            throw err;
        }
        user.name = trimmedName;
    }

    if (phone !== undefined) {
        user.phone = phone ? String(phone).trim() : null;
    }

    await user.save();

    return user;
};

module.exports = {
    getCurrentUser,
    registerUser,
    loginUser,
    logoutUser,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
};
