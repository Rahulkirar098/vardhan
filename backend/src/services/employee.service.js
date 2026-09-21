const crypto = require("crypto");
const Employee = require("../models/employee.model");
const Invitation = require("../models/invitation.model");
const Hospital = require("../models/hospital.model");
const { sendEmail } = require("../utils/mail");
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
    page = 1,
    limit = 20,
}) => {
    const filter = { hospitalId };

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
    designation,
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

    const employee = await Employee.create({
        employeeId: resolvedEmployeeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        designation: designation ? String(designation).trim() : null,
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
    designation,
    employeeId: providedEmployeeId,
}) => {
    const normalizedEmail = String(email).trim().toLowerCase();

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
        type: "EMPLOYEE",
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

    const invitation = await Invitation.create({
        hospitalId: hospital._id,
        type: "EMPLOYEE",
        employeeId: resolvedEmployeeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        designation: designation ? String(designation).trim() : null,
        tokenHash,
        expiresAt,
        status: "pending",
        invitedBy,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/employee/invite/${rawToken}`;
    const fullName = `${invitation.firstName} ${invitation.lastName}`;

    const { text, html } = buildInvitationEmailTemplate({
        hospitalName: hospital.name,
        recipientName: fullName,
        inviterName: "", // The template handles "by your HR" natively if no inviterName and role is Employee
        role: "EMPLOYEE",
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
        type: "EMPLOYEE",
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

const acceptInvitation = async (rawToken) => {
    const tokenHash = hashTokenValue(rawToken);

    const invitation = await Invitation.findOne({
        tokenHash,
        type: "EMPLOYEE",
        status: "pending",
    }).populate("hospitalId", "name");

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
        designation: invitation.designation,
        employmentStatus: "ACTIVE",
        hospitalId: invitation.hospitalId._id,
        createdBy: invitation.invitedBy,
        userId: null,
    });

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
        "designation",
    ];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            if (field === "email") {
                employee.email = String(updates.email).trim().toLowerCase();
            } else if (field === "dateOfJoining") {
                employee.dateOfJoining = updates.dateOfJoining
                    ? new Date(updates.dateOfJoining)
                    : null;
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
    employee.updatedBy = updatedBy;
    await employee.save();

    return employee;
};

// ─── List Invitations ─────────────────────────────────────────────────────────

const listInvitations = async (hospitalId) => {
    const now = new Date();
    // Auto-expire pending invitations
    await Invitation.updateMany(
        {
            hospitalId,
            type: "EMPLOYEE",
            status: "pending",
            expiresAt: { $lt: now },
        },
        { status: "expired" }
    );

    return Invitation.find({ hospitalId, type: "EMPLOYEE" })
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
        type: "EMPLOYEE",
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

// ─── Employee Stats ───────────────────────────────────────────────────────────

const getEmployeeStats = async (hospitalId) => {
    const [total, active, inactive, pendingInvitations] = await Promise.all([
        Employee.countDocuments({ hospitalId }),
        Employee.countDocuments({ hospitalId, employmentStatus: "ACTIVE" }),
        Employee.countDocuments({ hospitalId, employmentStatus: "INACTIVE" }),
        Invitation.countDocuments({ hospitalId, type: "EMPLOYEE", status: "pending" }),
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
    getEmployeeStats,
};
