const User = require("../models/user.model");
const Invitation = require("../models/invitation.model");
const Hospital = require("../models/hospital.model");
const { isValidObjectId } = require("../utils/validate");
const { VALID_MODULE_KEYS } = require("../config/modules.config");
const hrService = require("../services/hr.service");

const getHRHospital = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "hr") {
            return res.status(403).json({
                success: false,
                message: "Only HR users can access their hospital",
            });
        }

        const hospital = await Hospital.findById(req.user.hospitalId);

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        // To match original behavior which populates createdBy
        await hospital.populate("createdBy", "name email phone role status");

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

        const hospital = await hrService.getAdminHospital(req.user.id);

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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(email).trim().toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        try {
            const hrUser = await hrService.createHR({
                name,
                email,
                phone,
                password,
                adminId: req.user.id
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
        } catch (serviceErr) {
            if (serviceErr.code === "NO_HOSPITAL" || serviceErr.code === "DUPLICATE_HR" || serviceErr.code === "DUPLICATE_EMAIL") {
                return res.status(serviceErr.code === "NO_HOSPITAL" ? 400 : 409).json({
                    success: false,
                    message: serviceErr.message,
                });
            }
            throw serviceErr;
        }
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

        const { name, email, phone, modules, permissions } = req.body;

        if (!name || !email || !String(name).trim() || !String(email).trim()) {
            return res.status(400).json({
                success: false,
                message: "HR name and email are required",
            });
        }

        if (modules !== undefined) {
            if (!Array.isArray(modules)) {
                return res.status(400).json({
                    success: false,
                    message: "modules must be an array of module keys",
                });
            }
            const invalidMods = modules.filter((m) => !VALID_MODULE_KEYS.includes(m));
            if (invalidMods.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid modules: ${invalidMods.join(", ")}. Valid modules are: ${VALID_MODULE_KEYS.join(", ")}`,
                });
            }
        }

        if (permissions !== undefined) {
            if (!Array.isArray(permissions)) {
                return res.status(400).json({
                    success: false,
                    message: "permissions must be an array",
                });
            }
            const invalidPerms = permissions.filter((p) => !hrService.VALID_HR_PERMISSIONS.includes(p));
            if (invalidPerms.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid permissions: ${invalidPerms.join(", ")}. Valid permissions are: ${hrService.VALID_HR_PERMISSIONS.join(", ")}`,
                });
            }
        }

        try {
            const invitation = await hrService.inviteHR({
                name,
                email,
                phone,
                modules,
                permissions,
                adminId: req.user.id,
                adminName: req.user.name
            });

            return res.status(201).json({
                success: true,
                message: "Invitation sent successfully",
                data: {
                    id: invitation._id,
                    name: `${invitation.firstName} ${invitation.lastName || ""}`.trim(),
                    email: invitation.email,
                    phone: invitation.phone,
                    status: invitation.status,
                    modules: invitation.modules,
                    permissions: invitation.permissions,
                    expiresAt: invitation.expiresAt,
                },
            });
        } catch (serviceErr) {
            if (serviceErr.code === "NO_HOSPITAL") {
                return res.status(400).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "DUPLICATE_HR" || serviceErr.code === "DUPLICATE_INVITATION") {
                return res.status(409).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "EMAIL_FAILED") {
                if (serviceErr.message.includes("SMTP configuration is missing") || serviceErr.message.includes("ENOTFOUND")) {
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
            throw serviceErr;
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

        const invitation = await hrService.getInvitationByToken(token);

        if (!invitation) {
            return res.status(400).json({
                success: false,
                message: "Invitation is invalid or has expired.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Invitation retrieved successfully",
            data: {
                name: `${invitation.firstName} ${invitation.lastName || ""}`.trim(),
                email: invitation.email,
                phone: invitation.phone,
                hospitalName: invitation.hospitalId?.name || "Hospital",
                modules: invitation.modules || [],
                permissions: invitation.permissions || [],
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

        try {
            const hrUser = await hrService.acceptInvitation(token, password);

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
                    modules: hrUser.modules,
                    permissions: hrUser.permissions,
                },
            });
        } catch (serviceErr) {
            if (serviceErr.code === "INVALID_INVITATION" || serviceErr.code === "EXPIRED_INVITATION") {
                return res.status(400).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "DUPLICATE_EMAIL") {
                return res.status(409).json({ success: false, message: serviceErr.message });
            }
            throw serviceErr;
        }
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

        try {
            await hrService.resendInvitation(invitationId, req.user.id, req.user.name);
            return res.status(200).json({
                success: true,
                message: "Invitation resent successfully",
            });
        } catch (serviceErr) {
            if (serviceErr.code === "NO_HOSPITAL") {
                return res.status(400).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "NOT_FOUND") {
                return res.status(404).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "INVALID_STATUS") {
                return res.status(400).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "EMAIL_FAILED") {
                if (serviceErr.message.includes("SMTP configuration is missing")) {
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
            throw serviceErr;
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

        try {
            await hrService.cancelInvitation(invitationId, req.user.id);
            return res.status(200).json({
                success: true,
                message: "Invitation cancelled successfully",
            });
        } catch (serviceErr) {
            if (serviceErr.code === "NO_HOSPITAL") {
                return res.status(400).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "NOT_FOUND") {
                return res.status(404).json({ success: false, message: serviceErr.message });
            }
            throw serviceErr;
        }
    } catch (error) {
        console.error("Cancel Invitation Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getInvitations = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                message: "Only admins can view invitations",
            });
        }

        const hospital = await hrService.getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create a hospital first",
            });
        }

        const now = new Date();
        await Invitation.updateMany(
            { hospitalId: hospital._id, type: "HR", status: "pending", expiresAt: { $lt: now } },
            { status: "expired" }
        );

        const invitations = await Invitation.find({
            hospitalId: hospital._id,
            type: "HR"
        })
            .select("-tokenHash")
            .populate("invitedBy", "name email")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Invitations retrieved successfully",
            data: invitations,
        });
    } catch (error) {
        console.error("Get Invitations Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getHRPermissions = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                message: "Only admins can view HR permissions",
            });
        }

        const { hrId } = req.params;

        if (!isValidObjectId(hrId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid HR profile id",
            });
        }

        const hrUser = await User.findById(hrId);

        if (!hrUser || hrUser.role !== "hr") {
            return res.status(404).json({
                success: false,
                message: "HR profile not found",
            });
        }

        if (req.user.role === "admin") {
            const hospital = await hrService.getAdminHospital(req.user.id);
            if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "You can only view permissions for HR in your hospital",
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "HR permissions retrieved successfully",
            data: {
                hrId: hrUser._id,
                name: hrUser.name,
                email: hrUser.email,
                permissions: hrUser.permissions || [],
            },
        });
    } catch (error) {
        console.error("Get HR Permissions Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const updateHRPermissions = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                message: "Only admins can modify HR permissions",
            });
        }

        const { hrId } = req.params;

        if (!isValidObjectId(hrId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid HR profile id",
            });
        }

        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({
                success: false,
                message: "Permissions must be an array of strings",
            });
        }

        const invalidPermissions = permissions.filter(
            (p) => !hrService.VALID_HR_PERMISSIONS.includes(p)
        );

        if (invalidPermissions.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid permissions: ${invalidPermissions.join(", ")}. Valid permissions are: ${hrService.VALID_HR_PERMISSIONS.join(", ")}`,
            });
        }

        try {
            const hrUser = await hrService.updateHRPermissions(hrId, permissions, req.user.id);
            return res.status(200).json({
                success: true,
                message: "HR permissions updated successfully",
                data: {
                    hrId: hrUser._id,
                    name: hrUser.name,
                    email: hrUser.email,
                    permissions: hrUser.permissions,
                },
            });
        } catch (serviceErr) {
            if (serviceErr.code === "NOT_FOUND") {
                return res.status(404).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "FORBIDDEN") {
                return res.status(403).json({ success: false, message: serviceErr.message });
            }
            throw serviceErr;
        }
    } catch (error) {
        console.error("Update HR Permissions Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getHRModules = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                message: "Only admins can view HR modules",
            });
        }

        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid HR profile id",
            });
        }

        const hrUser = await User.findById(id);

        if (!hrUser || hrUser.role !== "hr") {
            return res.status(404).json({
                success: false,
                message: "HR profile not found",
            });
        }

        if (req.user.role === "admin") {
            const hospital = await hrService.getAdminHospital(req.user.id);
            if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "You can only view modules for HR in your hospital",
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "HR modules retrieved successfully",
            data: {
                hrId: hrUser._id,
                name: hrUser.name,
                email: hrUser.email,
                modules: hrUser.modules || ["core"],
            },
        });
    } catch (error) {
        console.error("Get HR Modules Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const updateHRModules = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                message: "Only admins can modify HR modules",
            });
        }

        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid HR profile id",
            });
        }

        const { modules } = req.body;

        if (!Array.isArray(modules)) {
            return res.status(400).json({
                success: false,
                message: "modules must be an array of module keys",
            });
        }

        const invalidModules = modules.filter((m) => !VALID_MODULE_KEYS.includes(m));
        if (invalidModules.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Invalid modules: ${invalidModules.join(", ")}. Valid modules are: ${VALID_MODULE_KEYS.join(", ")}`,
            });
        }

        try {
            const hrUser = await hrService.updateHRModules(id, modules, req.user.id);
            return res.status(200).json({
                success: true,
                message: "HR modules updated successfully",
                data: {
                    hrId: hrUser._id,
                    name: hrUser.name,
                    email: hrUser.email,
                    modules: hrUser.modules,
                },
            });
        } catch (serviceErr) {
            if (serviceErr.code === "NOT_FOUND") {
                return res.status(404).json({ success: false, message: serviceErr.message });
            }
            if (serviceErr.code === "FORBIDDEN") {
                return res.status(403).json({ success: false, message: serviceErr.message });
            }
            throw serviceErr;
        }
    } catch (error) {
        console.error("Update HR Modules Error:", error);
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
    getInvitations,
    getHRPermissions,
    updateHRPermissions,
    getHRModules,
    updateHRModules,
};
