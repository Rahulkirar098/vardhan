const crypto = require("crypto");
const Employee = require("../models/employee.model");
const Invitation = require("../models/invitation.model");
const Hospital = require("../models/hospital.model");
const Position = require("../models/position.model");
const User = require("../models/user.model");
const { sendEmail } = require("../utils/mail");
const { hashPassword } = require("../utils/password");
const { hashTokenValue, generateInvitationToken, getStandardExpiry, buildInvitationEmailTemplate } = require("./invitation.service");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Generate a sequential employee ID for the hospital.
 * Format: EMP001, EMP002, …
 */
const generateEmployeeId = async (hospitalId) => {
    const lastEmployee = await Employee.findOne({ hospitalId })
        .sort({ createdAt: -1 })
        .select("employeeId")
        .lean();

    if (!lastEmployee || !lastEmployee.employeeId) {
        return "EMP001";
    }

    const match = String(lastEmployee.employeeId).match(/^EMP(\d+)$/);
    if (!match) return "EMP001";

    const nextNum = parseInt(match[1], 10) + 1;
    return `EMP${String(nextNum).padStart(3, "0")}`;
};

/**
 * Get the hospital for a user (HR or Admin).
 * For HR: derived from user.hospitalId.
 * For Admin: from Hospital.createdBy.
 */
const getHospitalForUser = async (user) => {
    if (user.role === "hr") {
        if (!user.hospitalId) return null;
        return Hospital.findById(user.hospitalId).lean();
    }
    if (user.role === "admin" || user.role === "super_admin") {
        return Hospital.findOne({ createdBy: user.id }).lean();
    }
    return null;
};

// ─── List Employees ──────────────────────────────────────────────────────────

const listEmployees = async ({
    hospitalId,
    search,
    status,
    role,
    page = 1,
    limit = 20,
}) => {
    const filter = { hospitalId };

    if (role) {
        const usersWithRole = await User.find({ hospitalId, role }).select("_id").lean();
        const userIds = usersWithRole.map(u => u._id);
        filter.userId = { $in: userIds };
    }

    if (status && ["ACTIVE", "INACTIVE"].includes(String(status).toUpperCase())) {
        filter.employmentStatus = String(status).toUpperCase();
    }

    if (search && String(search).trim()) {
        const q = String(search).trim();
        filter.$or = [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { employeeId: { $regex: q, $options: "i" } },
        ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));
    const take = Math.min(100, Number(limit));

    const [employees, total] = await Promise.all([
        Employee.find(filter)
            .select("-__v")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(take)
            .populate("userId", "role status")
            .populate("positionId", "name")
            .lean(),
        Employee.countDocuments(filter),
    ]);

    return {
        employees,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / take),
    };
};

// ─── Get Employee by ID ──────────────────────────────────────────────────────

const getEmployeeById = async ({ employeeMongoId, hospitalId }) => {
    const employee = await Employee.findOne({
        _id: employeeMongoId,
        hospitalId,
    })
        .select("-__v")
        .populate("userId", "role status")
        .populate("positionId", "name")
        .lean();

    return employee || null;
};

// ─── Create Employee (direct, no invitation) ─────────────────────────────────

const createEmployee = async ({
    hospitalId,
    createdBy,
    firstName,
    lastName,
    email,
    phone,
    dateOfJoining,
    positionId,
    employeeId: providedEmployeeId,
}) => {
    const normalizedEmail = String(email).trim().toLowerCase();

    const existingActive = await Employee.findOne({
        hospitalId,
        email: normalizedEmail,
        employmentStatus: "ACTIVE",
    });

    if (existingActive) {
        const err = new Error("An active employee with this email already exists in this hospital.");
        err.code = "DUPLICATE_EMAIL";
        throw err;
    }

    const resolvedEmployeeId = providedEmployeeId
        ? String(providedEmployeeId).trim().toUpperCase()
        : await generateEmployeeId(hospitalId);

    const existingId = await Employee.findOne({
        hospitalId,
        employeeId: resolvedEmployeeId,
    });

    if (existingId) {
        const err = new Error(`Employee ID ${resolvedEmployeeId} is already taken in this hospital.`);
        err.code = "DUPLICATE_EMPLOYEE_ID";
        throw err;
    }

    if (positionId) {
        const pos = await Position.findOne({ _id: positionId, hospitalId, status: 'active' });
        if (!pos) {
            const err = new Error("Selected position is invalid, inactive, or belongs to another hospital.");
            err.code = "INVALID_POSITION";
            throw err;
        }
    }

    const employee = await Employee.create({
        employeeId: resolvedEmployeeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        positionId,
        employmentStatus: "ACTIVE",
        hospitalId,
        createdBy,
        userId: null,
    });

    return employee;
};

// ─── Invite Employee ─────────────────────────────────────────────────────────

const inviteEmployee = async ({
    hospital,
    invitedBy,
    firstName,
    lastName,
    email,
    phone,
    dateOfJoining,
    positionId,
    role = "employee",
    createLogin = false,
    employeeId: providedEmployeeId,
    modules = [],
    permissions = [],
}) => {
    const normalizedEmail = String(email).trim().toLowerCase();
    const type = role === "hr" ? "HR" : "EMPLOYEE";

    // No duplicate active employee
    const existingEmployee = await Employee.findOne({
        hospitalId: hospital._id,
        email: normalizedEmail,
        employmentStatus: "ACTIVE",
    });

    if (existingEmployee) {
        const err = new Error("An active employee with this email already exists in this hospital.");
        err.code = "DUPLICATE_EMPLOYEE";
        throw err;
    }

    // No duplicate pending invitation
    const existingInvitation = await Invitation.findOne({
        hospitalId: hospital._id,
        email: normalizedEmail,
        status: "pending",
    });

    if (existingInvitation) {
        const err = new Error("A pending employee invitation already exists for this email.");
        err.code = "DUPLICATE_INVITATION";
        throw err;
    }

    const rawToken = generateInvitationToken();
    const tokenHash = hashTokenValue(rawToken);
    const expiresAt = getStandardExpiry(); // 48 hours

    const resolvedEmployeeId = providedEmployeeId
        ? String(providedEmployeeId).trim().toUpperCase()
        : await generateEmployeeId(hospital._id);

    if (positionId) {
        const pos = await Position.findOne({ _id: positionId, hospitalId: hospital._id, status: 'active' });
        if (!pos) {
            const err = new Error("Selected position is invalid, inactive, or belongs to another hospital.");
            err.code = "INVALID_POSITION";
            throw err;
        }
    }

    const invitation = await Invitation.create({
        hospitalId: hospital._id,
        type,
        employeeId: resolvedEmployeeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        positionId,
        role: createLogin ? role : null,
        createLogin,
        modules: createLogin && modules.length > 0 ? modules : undefined,
        permissions: createLogin && permissions.length > 0 ? permissions : undefined,
        tokenHash,
        expiresAt,
        status: "pending",
        invitedBy,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/invite/${rawToken}`;
    const fullName = `${invitation.firstName} ${invitation.lastName}`;

    const { text, html } = buildInvitationEmailTemplate({
        hospitalName: hospital.name,
        recipientName: fullName,
        inviterName: "",
        role: type,
        invitationUrl,
    });

    await sendEmail({
        to: normalizedEmail,
        subject: `You've been invited to join ${hospital.name}`,
        text,
        html,
    });

    return { invitation, rawToken };
};

// ─── Get Invitation by Token (public) ────────────────────────────────────────

const getInvitationByToken = async (rawToken) => {
    const tokenHash = hashTokenValue(rawToken);

    const invitation = await Invitation.findOne({
        tokenHash,
        status: "pending",
    })
        .populate("hospitalId", "name code")
        .lean();

    if (!invitation) return null;

    if (new Date(invitation.expiresAt) < new Date()) {
        await Invitation.findByIdAndUpdate(invitation._id, {
            status: "expired",
        });
        return null;
    }

    return invitation;
};

// ─── Accept Invitation (public) ───────────────────────────────────────────────

const acceptInvitation = async (rawToken, password) => {
    const tokenHash = hashTokenValue(rawToken);

    const invitation = await Invitation.findOne({
        tokenHash,
        status: "pending",
    })
        .populate("hospitalId", "name")
        .populate("positionId", "name");

    if (!invitation) {
        const err = new Error("Invitation is invalid or has already been used.");
        err.code = "INVALID_INVITATION";
        throw err;
    }

    if (new Date(invitation.expiresAt) < new Date()) {
        invitation.status = "expired";
        await invitation.save();
        const err = new Error("This invitation has expired.");
        err.code = "EXPIRED_INVITATION";
        throw err;
    }

    // Check if employee with this email already exists in this hospital
    const existingEmployee = await Employee.findOne({
        hospitalId: invitation.hospitalId._id,
        email: invitation.email,
    });

    if (existingEmployee) {
        // If somehow already created, just mark invitation accepted
        invitation.status = "accepted";
        invitation.acceptedAt = new Date();
        await invitation.save();
        return existingEmployee;
    }

    // Resolve employee ID — if taken, auto-generate a new one
    let resolvedEmployeeId = invitation.employeeId;
    if (resolvedEmployeeId) {
        const taken = await Employee.findOne({
            hospitalId: invitation.hospitalId._id,
            employeeId: resolvedEmployeeId,
        });
        if (taken) {
            resolvedEmployeeId = await generateEmployeeId(invitation.hospitalId._id);
        }
    } else {
        resolvedEmployeeId = await generateEmployeeId(invitation.hospitalId._id);
    }

    const employee = await Employee.create({
        employeeId: resolvedEmployeeId,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        email: invitation.email,
        phone: invitation.phone,
        dateOfJoining: invitation.dateOfJoining,
        positionId: invitation.positionId?._id || invitation.positionId,
        employmentStatus: "ACTIVE",
        hospitalId: invitation.hospitalId._id,
        createdBy: invitation.invitedBy,
        userId: null,
    });

    if (invitation.createLogin && invitation.role && password) {
        const hashedPassword = await hashPassword(password);
        const user = await User.create({
            name: `${employee.firstName} ${employee.lastName}`.trim(),
            email: employee.email,
            phone: employee.phone,
            password: hashedPassword,
            role: invitation.role,
            hospitalId: employee.hospitalId,
            employeeId: employee._id,
            status: "active",
            createdBy: invitation.invitedBy,
            modules: invitation.modules && invitation.modules.length > 0 ? invitation.modules : ["core"],
            permissions: invitation.permissions || [],
        });

        employee.userId = user._id;
        await employee.save();
    }

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    return employee;
};

// ─── Update Employee ─────────────────────────────────────────────────────────

const updateEmployee = async ({
    employeeMongoId,
    hospitalId,
    updatedBy,
    user,
    updates,
}) => {
    const employee = await Employee.findOne({
        _id: employeeMongoId,
        hospitalId,
    });

    if (!employee) return null;

    const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "dateOfJoining",
        "positionId",
    ];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            if (field === "email") {
                employee.email = String(updates.email).trim().toLowerCase();
            } else if (field === "dateOfJoining") {
                employee.dateOfJoining = updates.dateOfJoining
                    ? new Date(updates.dateOfJoining)
                    : null;
            } else if (field === "positionId") {
                const { hasPermission } = require("../config/rolePermissions");
                const { PERMISSIONS } = require("../config/permissions");
                
                if (!hasPermission(user, PERMISSIONS.EMPLOYEE_POSITION_UPDATE)) {
                    const err = new Error("You do not have permission to change employee positions.");
                    err.code = "UNAUTHORIZED_POSITION_UPDATE";
                    throw err;
                }

                const pos = await Position.findOne({ _id: updates.positionId, hospitalId, status: 'active' });
                if (!pos) {
                    const err = new Error("Selected position is invalid, inactive, or belongs to another hospital.");
                    err.code = "INVALID_POSITION";
                    throw err;
                }
                employee.positionId = updates.positionId;
            } else {
                employee[field] = updates[field];
            }
        }
    }

    employee.updatedBy = updatedBy;
    await employee.save();

    return employee;
};

// ─── Update Employee Status ───────────────────────────────────────────────────

const updateEmployeeStatus = async ({
    employeeMongoId,
    hospitalId,
    updatedBy,
    status,
}) => {
    const employee = await Employee.findOne({
        _id: employeeMongoId,
        hospitalId,
    });

    if (!employee) return null;

    employee.employmentStatus = status;
    if (status === "INACTIVE") {
        employee.leavingDate = new Date();
    } else {
        employee.leavingDate = null;
    }
    employee.updatedBy = updatedBy;
    await employee.save();

    if (employee.userId) {
        await User.updateOne(
            { _id: employee.userId },
            { status: status === "INACTIVE" ? "inactive" : "active" }
        );
    }

    return employee;
};

// ─── List Invitations ─────────────────────────────────────────────────────────

const listInvitations = async (hospitalId) => {
    const now = new Date();
    // Auto-expire pending invitations
    await Invitation.updateMany(
        {
            hospitalId,
            status: "pending",
            expiresAt: { $lt: now },
        },
        { status: "expired" }
    );

    return Invitation.find({ hospitalId })
        .select("-tokenHash")
        .populate("invitedBy", "name email")
        .sort({ createdAt: -1 })
        .lean();
};

// ─── Cancel Invitation ────────────────────────────────────────────────────────

const cancelInvitation = async ({ invitationId, hospitalId }) => {
    const invitation = await Invitation.findOne({
        _id: invitationId,
        hospitalId,
    });

    if (!invitation) return null;

    if (invitation.status !== "pending") {
        const err = new Error("Only pending invitations can be cancelled.");
        err.code = "NOT_CANCELLABLE";
        throw err;
    }

    invitation.status = "cancelled";
    await invitation.save();
    return invitation;
};

// ─── Resend Invitation ────────────────────────────────────────────────────────

const resendInvitation = async ({ invitationId, hospitalId }) => {
    const invitation = await Invitation.findOne({
        _id: invitationId,
        hospitalId,
    }).populate("hospitalId", "name");

    if (!invitation) throw new Error("Invitation not found");

    if (invitation.status !== "pending") {
        throw new Error("Only pending invitations can be resent.");
    }

    const rawToken = generateInvitationToken();
    invitation.tokenHash = hashTokenValue(rawToken);
    invitation.expiresAt = getStandardExpiry();
    await invitation.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/invite/${rawToken}`;
    const fullName = `${invitation.firstName} ${invitation.lastName || ""}`.trim();

    const { text, html } = buildInvitationEmailTemplate({
        hospitalName: invitation.hospitalId.name,
        recipientName: fullName,
        inviterName: "",
        role: invitation.type,
        invitationUrl,
    });

    await sendEmail({
        to: invitation.email,
        subject: `You've been invited to join ${invitation.hospitalId.name}`,
        text,
        html,
    });

    return invitation;
};

// ─── Employee Stats ───────────────────────────────────────────────────────────

const getEmployeeStats = async (hospitalId) => {
    const [total, active, inactive, pendingInvitations] = await Promise.all([
        Employee.countDocuments({ hospitalId }),
        Employee.countDocuments({ hospitalId, employmentStatus: "ACTIVE" }),
        Employee.countDocuments({ hospitalId, employmentStatus: "INACTIVE" }),
        Invitation.countDocuments({ hospitalId, status: "pending" }),
    ]);

    return { total, active, inactive, pendingInvitations };
};

module.exports = {
    EMAIL_REGEX,
    generateEmployeeId,
    getHospitalForUser,
    listEmployees,
    getEmployeeById,
    createEmployee,
    inviteEmployee,
    getInvitationByToken,
    acceptInvitation,
    updateEmployee,
    updateEmployeeStatus,
    listInvitations,
    cancelInvitation,
    resendInvitation,
    getEmployeeStats,
};
