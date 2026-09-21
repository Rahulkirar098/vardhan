const crypto = require("crypto");
const Hospital = require("../models/hospital.model");
const User = require("../models/user.model");
const HrInvitation = require("../models/hrInvitation.model");
const { hashPassword } = require("../utils/password");
const { sendEmail } = require("../utils/mail");
const { isValidObjectId } = require("../utils/validate");

const hashTokenValue = (value) => {
    return crypto.createHash("sha256").update(value).digest("hex");
};

const getAdminHospital = async (adminId) => {
    return Hospital.findOne({ createdBy: adminId });
};

const getHRHospital = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "hr") {
            return res.status(403).json({
                success: false,
                message: "Only HR users can access their hospital",
            });
        }

        const hospital = await Hospital.findById(req.user.hospitalId).populate(
            "createdBy",
            "name email phone role status"
        );

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Hospital retrieved successfully",
            data: hospital,
        });
    } catch (error) {
        console.error("Get HR Hospital Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getMyHR = async (req, res) => {
    try {
        if (req.user.role === "hr") {
            const hr = await User.findById(req.user.id)
                .select("-password")
                .populate("hospitalId", "name code address status createdBy");

            if (!hr) {
                return res.status(404).json({
                    success: false,
                    message: "HR profile not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "HR profile retrieved successfully",
                data: hr,
            });
        }

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can view their hospital HR",
            });
        }

        const hospital = await Hospital.findOne({ createdBy: req.user.id });

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const filters = {
            hospitalId: hospital._id,
            role: "hr",
        };

        const hr = await User.find(filters)
            .select("-password")
            .populate("hospitalId", "name code address status createdBy")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "HR profile retrieved successfully",
            data: hr,
        });
    } catch (error) {
        console.error("Get My HR Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getHRById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid HR profile id",
            });
        }

        const hr = await User.findById(id)
            .select("-password")
            .populate("hospitalId", "name code city state status");

        if (!hr) {
            return res.status(404).json({
                success: false,
                message: "HR profile not found",
            });
        }

        if (req.user.role === "hr" && hr._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only access your own profile",
            });
        }

        if (req.user.role !== "hr" && hr.createdBy && hr.createdBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You can only access your own hospital HR",
            });
        }

        return res.status(200).json({
            success: true,
            message: "HR profile retrieved successfully",
            data: hr,
        });
    } catch (error) {
        console.error("Get HR By Id Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const createHR = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can create HR profiles",
            });
        }

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

        const hospital = await Hospital.findOne({ createdBy: req.user.id });

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail,
            hospitalId: hospital._id,
            role: "hr",
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An HR account with this email already exists for this hospital",
            });
        }

        const existingUserByEmail = await User.findOne({ email: normalizedEmail });

        if (existingUserByEmail) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        const hashedPasswordValue = await hashPassword(password);

        const hrUser = await User.create({
            name: normalizedName,
            email: normalizedEmail,
            phone: phone ? String(phone).trim() : null,
            password: hashedPasswordValue,
            role: "hr",
            status: "active",
            createdBy: req.user.id,
            hospitalId: hospital._id,
        });

        return res.status(201).json({
            success: true,
            message: "HR profile created successfully",
            data: {
                id: hrUser._id,
                name: hrUser.name,
                email: hrUser.email,
                phone: hrUser.phone,
                role: hrUser.role,
                status: hrUser.status,
                hospitalId: hrUser.hospitalId,
            },
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered",
            });
        }

        console.error("Create HR Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const createInvitation = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can invite HRs",
            });
        }

        const { name, email, phone } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "HR name and email are required",
            });
        }

        const normalizedName = String(name).trim();
        const normalizedEmail = String(email).trim().toLowerCase();

        if (!normalizedName || !normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: "HR name and email are required",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create a hospital first",
            });
        }

        const activeHR = await User.findOne({
            email: normalizedEmail,
            hospitalId: hospital._id,
            role: "hr",
            status: "active",
        });

        if (activeHR) {
            return res.status(409).json({
                success: false,
                message: "An HR account with this email already exists for this hospital",
            });
        }

        const existingInvitation = await HrInvitation.findOne({
            hospitalId: hospital._id,
            email: normalizedEmail,
            status: "pending",
        });

        if (existingInvitation) {
            return res.status(409).json({
                success: false,
                message: "An HR invitation is already pending for this email",
            });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashTokenValue(rawToken);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        const invitation = await HrInvitation.create({
            name: normalizedName,
            email: normalizedEmail,
            phone: phone ? String(phone).trim() : null,
            hospitalId: hospital._id,
            invitedBy: req.user.id,
            tokenHash,
            expiresAt,
            status: "pending",
        });

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const invitationUrl = `${frontendUrl}/hr/invite/${rawToken}`;

        try {
            await sendEmail({
                to: normalizedEmail,
                subject: `You're invited to join ${hospital.name}`,
                text: `Hello ${normalizedName},\n\nYou have been invited by ${req.user.name || "your admin"} to join ${hospital.name}.\n\nRole: HR\n\nClick here to accept the invitation and create your account: ${invitationUrl}\n\nThis invitation expires in 48 hours.`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                        <h2>You're invited to join ${hospital.name}</h2>
                        <p>Hello ${normalizedName},</p>
                        <p>You have been invited by ${req.user.name || "your admin"} to join <strong>${hospital.name}</strong>.</p>
                        <p><strong>Role:</strong> HR</p>
                        <p>Click the button below to accept the invitation and create your account.</p>
                        <p>
                            <a href="${invitationUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invitation</a>
                        </p>
                        <p>Invitation expires in 48 hours.</p>
                        <p>If you did not expect this invitation, you can ignore this email.</p>
                        <p>Regards,<br />Krince.in</p>
                    </div>
                `,
            });

            return res.status(201).json({
                success: true,
                message: "Invitation sent successfully",
                data: {
                    id: invitation._id,
                    name: invitation.name,
                    email: invitation.email,
                    phone: invitation.phone,
                    status: invitation.status,
                    expiresAt: invitation.expiresAt,
                },
            });
        } catch (emailError) {
            console.error("Send HR Invitation Email Error:", emailError);

            await HrInvitation.findByIdAndDelete(invitation._id);

            const emailMessage = String(emailError?.message || "");

            if (
                emailMessage.includes("SMTP configuration is missing") ||
                emailMessage.includes("SMTP configuration is invalid") ||
                emailMessage.includes("placeholder values") ||
                emailMessage.includes("ENOTFOUND")
            ) {
                return res.status(503).json({
                    success: false,
                    message: "Email service is not configured correctly. Please update backend/.env with valid SMTP credentials.",
                });
            }

            return res.status(500).json({
                success: false,
                message: "Unable to send invitation email. Please try again.",
            });
        }
    } catch (error) {
        console.error("Create HR Invitation Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getInvitationByToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Invitation token is required",
            });
        }

        const tokenHash = hashTokenValue(token);
        const invitation = await HrInvitation.findOne({
            tokenHash,
            status: "pending",
        }).populate("hospitalId", "name");

        if (!invitation) {
            return res.status(400).json({
                success: false,
                message: "Invitation is invalid or has expired.",
            });
        }

        if (new Date(invitation.expiresAt) < new Date()) {
            invitation.status = "expired";
            await invitation.save();

            return res.status(400).json({
                success: false,
                message: "Invitation is invalid or has expired.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Invitation retrieved successfully",
            data: {
                name: invitation.name,
                email: invitation.email,
                phone: invitation.phone,
                hospitalName: invitation.hospitalId?.name || "Hospital",
                expiresAt: invitation.expiresAt,
            },
        });
    } catch (error) {
        console.error("Get Invitation By Token Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const acceptInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || String(password).trim().length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        const tokenHash = hashTokenValue(token);
        const invitation = await HrInvitation.findOne({
            tokenHash,
            status: "pending",
        }).populate("hospitalId", "name");

        if (!invitation) {
            return res.status(400).json({
                success: false,
                message: "Invitation is invalid or has expired.",
            });
        }

        if (new Date(invitation.expiresAt) < new Date()) {
            invitation.status = "expired";
            await invitation.save();

            return res.status(400).json({
                success: false,
                message: "Invitation is invalid or has expired.",
            });
        }

        const existingUser = await User.findOne({ email: invitation.email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists",
            });
        }

        const hashedPassword = await hashPassword(password);

        const hrUser = await User.create({
            name: invitation.name,
            email: invitation.email,
            phone: invitation.phone,
            password: hashedPassword,
            role: "hr",
            hospitalId: invitation.hospitalId,
            createdBy: invitation.invitedBy,
            status: "active",
        });

        invitation.status = "accepted";
        invitation.acceptedAt = new Date();
        await invitation.save();

        return res.status(201).json({
            success: true,
            message: "HR account created successfully",
            data: {
                id: hrUser._id,
                name: hrUser.name,
                email: hrUser.email,
                phone: hrUser.phone,
                role: hrUser.role,
                hospitalId: hrUser.hospitalId,
                status: hrUser.status,
            },
        });
    } catch (error) {
        console.error("Accept Invitation Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const resendInvitation = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can resend invitations",
            });
        }

        const { invitationId } = req.params;

        if (!isValidObjectId(invitationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid invitation id",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create a hospital first",
            });
        }

        const invitation = await HrInvitation.findOne({
            _id: invitationId,
            hospitalId: hospital._id,
            invitedBy: req.user.id,
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found",
            });
        }

        if (invitation.status === "accepted" || invitation.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "This invitation cannot be resent",
            });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashTokenValue(rawToken);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const invitationUrl = `${frontendUrl}/hr/invite/${rawToken}`;

        try {
            await sendEmail({
                to: invitation.email,
                subject: `You're invited to join ${hospital.name} as HR`,
                text: `Hello ${invitation.name},\n\nYou have been invited by ${req.user.name || "your admin"} to join ${hospital.name} as an HR.\n\nClick here to accept the invitation: ${invitationUrl}\n\nThis invitation expires in 48 hours.`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                        <h2>You're invited to join ${hospital.name} as HR</h2>
                        <p>Hello ${invitation.name},</p>
                        <p>You have been invited by ${req.user.name || "your admin"} to join <strong>${hospital.name}</strong> as an HR.</p>
                        <p><a href="${invitationUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invitation</a></p>
                        <p>This invitation expires in 48 hours.</p>
                    </div>
                `,
            });

            invitation.tokenHash = tokenHash;
            invitation.expiresAt = expiresAt;
            invitation.status = "pending";
            invitation.acceptedAt = null;
            await invitation.save();

            return res.status(200).json({
                success: true,
                message: "Invitation resent successfully",
            });
        } catch (emailError) {
            console.error("Resend HR Invitation Email Error:", emailError);

            if (String(emailError?.message || "").includes("SMTP configuration is missing")) {
                return res.status(503).json({
                    success: false,
                    message: "Email service is not configured. Please add SMTP credentials in backend/.env.",
                });
            }

            return res.status(500).json({
                success: false,
                message: "Unable to send invitation email. Please try again.",
            });
        }
    } catch (error) {
        console.error("Resend Invitation Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const cancelInvitation = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can cancel invitations",
            });
        }

        const { invitationId } = req.params;

        if (!isValidObjectId(invitationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid invitation id",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create a hospital first",
            });
        }

        const invitation = await HrInvitation.findOne({
            _id: invitationId,
            hospitalId: hospital._id,
            invitedBy: req.user.id,
        });

        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: "Invitation not found",
            });
        }

        invitation.status = "cancelled";
        await invitation.save();

        return res.status(200).json({
            success: true,
            message: "Invitation cancelled successfully",
        });
    } catch (error) {
        console.error("Cancel Invitation Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    createHR,
    getMyHR,
    getHRById,
    getHRHospital,
    createInvitation,
    getInvitationByToken,
    acceptInvitation,
    resendInvitation,
    cancelInvitation,
};
