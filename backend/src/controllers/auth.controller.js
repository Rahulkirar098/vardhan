const crypto = require("crypto");
const User = require("../models/user.model");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken, revokeToken } = require("../utils/jwt");
const { sendEmail } = require("../utils/mail");

const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "Account is inactive",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Current user retrieved successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                hospitalId: user.hospitalId,
                status: user.status,
            },
        });
    } catch (error) {
        console.error("Get Current User Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        const normalizedName = String(name).trim();
        const normalizedEmail = String(email).trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !String(password).trim()) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
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

        return res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        console.error("Register User Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        if (!normalizedEmail || !String(password).trim()) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (user.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "Account is inactive",
            });
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = generateToken({
            id: user._id,
            role: user.role,
            hospitalId: user.hospitalId,
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    hospitalId: user.hospitalId,
                    status: user.status,
                },
            },
        });
    } catch (error) {
        console.error("Login User Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header is required",
            });
        }

        const [bearer, token] = authHeader.split(" ");

        if (bearer !== "Bearer" || !token) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format",
            });
        }

        await revokeToken(token);

        return res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    } catch (error) {
        console.error("Logout User Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const user = await User.findOne({ email: normalizedEmail });

        const genericMessage = "If an account exists for this email, a password reset link has been sent.";

        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage,
            });
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
                subject: "Reset your Krince.in password",
                text: `Hello ${user.name},\n\nYou requested a password reset for your Krince.in account.\n\nClick the link below to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                        <h2>Reset your password</h2>
                        <p>Hello ${user.name},</p>
                        <p>You requested a password reset for your Krince.in account.</p>
                        <p>
                            <a href="${resetUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
                        </p>
                        <p>This link is valid for 1 hour.</p>
                        <p>If you did not request this, you can safely ignore this email.</p>
                        <p>Regards,<br />Krince.in</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error("Send Password Reset Email Error:", emailError);

            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();

            return res.status(500).json({
                success: false,
                message: "Unable to send the password reset email. Please try again.",
            });
        }

        return res.status(200).json({
            success: true,
            message: genericMessage,
        });
    } catch (error) {
        console.error("Forgot Password Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: "Token and new password are required",
            });
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");

        const user = await User.findOne({
            resetPasswordToken: tokenHash,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Reset token is invalid or has expired",
            });
        }

        user.password = await hashPassword(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now login with your new password.",
        });
    } catch (error) {
        console.error("Reset Password Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    forgotPassword,
    resetPassword,
};