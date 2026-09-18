const crypto = require("crypto");
const Hospital = require("../models/hospital.model");
const User = require("../models/user.model");
const Department = require("../models/department.model");
const HrInvitation = require("../models/hrInvitation.model");
const { sendEmail } = require("../utils/mail");
const { isValidObjectId } = require("../utils/validate");

const hashTokenValue = (value) => {
    return crypto.createHash("sha256").update(value).digest("hex");
};

const getAdminHospital = async (adminId) => {
    return Hospital.findOne({ createdBy: adminId });
};

const createDepartment = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can create departments",
            });
        }

        const { name, code, description } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: "Department name and code are required",
            });
        }

        const normalizedName = String(name).trim();
        const normalizedCode = String(code).trim().toUpperCase();

        if (!normalizedName || !normalizedCode) {
            return res.status(400).json({
                success: false,
                message: "Department name and code are required",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const existingDepartment = await Department.findOne({
            hospitalId: hospital._id,
            $or: [{ name: normalizedName }, { code: normalizedCode }],
        });

        if (existingDepartment) {
            return res.status(409).json({
                success: false,
                message: "A department with this name or code already exists for your hospital",
            });
        }

        const department = await Department.create({
            name: normalizedName,
            code: normalizedCode,
            description: description ? String(description).trim() : null,
            hospitalId: hospital._id,
            createdBy: req.user.id,
            status: "active",
        });

        return res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: department,
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A department with this name or code already exists for your hospital",
            });
        }

        console.error("Create Department Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getDepartments = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access departments",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const departments = await Department.aggregate([
            { $match: { hospitalId: hospital._id } },
            {
                $lookup: {
                    from: "users",
                    let: { departmentId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$departmentId", "$$departmentId"] },
                                        { $eq: ["$role", "hr"] },
                                    ],
                                },
                            },
                        },
                        { $project: { _id: 1 } },
                    ],
                    as: "hrRecords",
                },
            },
            { $addFields: { hrCount: { $size: "$hrRecords" } } },
            { $sort: { createdAt: -1 } },
        ]);

        return res.status(200).json({
            success: true,
            message: "Departments retrieved successfully",
            data: departments,
        });
    } catch (error) {
        console.error("Get Departments Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getDepartmentById = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department id",
            });
        }

        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access departments",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const department = await Department.findOne({
            _id: req.params.departmentId,
            hospitalId: hospital._id,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Department retrieved successfully",
            data: department,
        });
    } catch (error) {
        console.error("Get Department By Id Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const updateDepartment = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department id",
            });
        }

        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can update departments",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const department = await Department.findOne({
            _id: req.params.departmentId,
            hospitalId: hospital._id,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        const { name, code, description, status } = req.body;
        const updates = {};

        if (name !== undefined) {
            const normalizedName = String(name).trim();
            if (!normalizedName) {
                return res.status(400).json({
                    success: false,
                    message: "Department name is required",
                });
            }
            updates.name = normalizedName;
        }

        if (code !== undefined) {
            const normalizedCode = String(code).trim().toUpperCase();
            if (!normalizedCode) {
                return res.status(400).json({
                    success: false,
                    message: "Department code is required",
                });
            }
            updates.code = normalizedCode;
        }

        if (description !== undefined) {
            updates.description = description ? String(description).trim() : null;
        }

        if (status !== undefined) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Status must be active or inactive",
                });
            }
            updates.status = status;
        }

        const duplicateDepartment = await Department.findOne({
            hospitalId: hospital._id,
            _id: { $ne: department._id },
            $or: [
                ...(updates.name ? [{ name: updates.name }] : []),
                ...(updates.code ? [{ code: updates.code }] : []),
            ],
        });

        if (duplicateDepartment) {
            return res.status(409).json({
                success: false,
                message: "A department with this name or code already exists for your hospital",
            });
        }

        Object.assign(department, updates);
        await department.save();

        return res.status(200).json({
            success: true,
            message: "Department updated successfully",
            data: department,
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A department with this name or code already exists for your hospital",
            });
        }

        console.error("Update Department Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const updateDepartmentStatus = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department id",
            });
        }

        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can update department status",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const department = await Department.findOne({
            _id: req.params.departmentId,
            hospitalId: hospital._id,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        const { status } = req.body;

        if (!status || !["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be active or inactive",
            });
        }

        if (status === "inactive") {
            const activeHrUsers = await User.findOne({
                hospitalId: hospital._id,
                departmentId: department._id,
                role: "hr",
                status: "active",
            });

            const pendingInvitations = await HrInvitation.findOne({
                hospitalId: hospital._id,
                departmentId: department._id,
                status: "pending",
            });

            if (activeHrUsers || pendingInvitations) {
                return res.status(409).json({
                    success: false,
                    message: "Cannot deactivate this department while HRs or pending invitations are assigned to it",
                });
            }
        }

        department.status = status;
        await department.save();

        return res.status(200).json({
            success: true,
            message: "Department status updated successfully",
            data: department,
        });
    } catch (error) {
        console.error("Update Department Status Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getDepartmentDetails = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department id",
            });
        }

        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access department details",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const department = await Department.findOne({
            _id: req.params.departmentId,
            hospitalId: hospital._id,
        }).lean();

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        const [totalHRs, pendingInvitations, hrs, pendingInvitationRecords] = await Promise.all([
            User.countDocuments({
                hospitalId: hospital._id,
                departmentId: department._id,
                role: "hr",
            }),
            HrInvitation.countDocuments({
                hospitalId: hospital._id,
                departmentId: department._id,
                status: "pending",
            }),
            User.find({
                hospitalId: hospital._id,
                departmentId: department._id,
                role: "hr",
            })
                .select("-password")
                .sort({ createdAt: -1 })
                .lean(),
            HrInvitation.find({
                hospitalId: hospital._id,
                departmentId: department._id,
                status: "pending",
            })
                .select("name email phone status expiresAt createdAt")
                .sort({ createdAt: -1 })
                .lean(),
        ]);

        return res.status(200).json({
            success: true,
            message: "Department details retrieved successfully",
            data: {
                department,
                stats: {
                    totalHRs,
                    pendingInvitations,
                },
                hrs,
                pendingInvitationRecords,
            },
        });
    } catch (error) {
        console.error("Get Department Details Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getDepartmentHRs = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department id",
            });
        }

        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access department HRs",
            });
        }

        const hospital = await getAdminHospital(req.user.id);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "Please create your hospital first",
            });
        }

        const department = await Department.findOne({
            _id: req.params.departmentId,
            hospitalId: hospital._id,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found",
            });
        }

        const hrs = await User.find({
            hospitalId: hospital._id,
            departmentId: department._id,
            role: "hr",
        })
            .select("-password")
            .populate("hospitalId", "name code")
            .populate("departmentId", "name code")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Department HRs retrieved successfully",
            data: hrs,
        });
    } catch (error) {
        console.error("Get Department HRs Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const inviteDepartmentHR = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department id",
            });
        }

        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can invite HRs",
            });
        }

        const { departmentId } = req.params;
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
                message: "Please create your hospital first",
            });
        }

        const department = await Department.findOne({
            _id: departmentId,
            hospitalId: hospital._id,
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found for your hospital",
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
            departmentId: department._id,
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
            departmentId: department._id,
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
                text: `Hello ${normalizedName},\n\nYou have been invited by ${req.user.name || "your admin"} to join ${hospital.name}.\n\nDepartment: ${department.name}\nRole: HR\n\nClick here to accept the invitation and create your account: ${invitationUrl}\n\nThis invitation expires in 48 hours.`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                        <h2>You're invited to join ${hospital.name}</h2>
                        <p>Hello ${normalizedName},</p>
                        <p>You have been invited by ${req.user.name || "your admin"} to join <strong>${hospital.name}</strong>.</p>
                        <p><strong>Department:</strong> ${department.name}</p>
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
                    departmentId: invitation.departmentId,
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
        console.error("Invite Department HR Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    createDepartment,
    getDepartments,
    getDepartmentById,
    getDepartmentDetails,
    getDepartmentHRs,
    inviteDepartmentHR,
    updateDepartment,
    updateDepartmentStatus,
};
