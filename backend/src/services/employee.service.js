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
    const employees = await Employee.find({ hospitalId })
        .select("employeeId")
        .lean();

    let maxNum = 0;
    for (const emp of employees) {
        if (!emp.employeeId) continue;
        const match = String(emp.employeeId).match(/^EMP(\d+)$/i);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    }

    let nextNum = maxNum + 1;
    let candidate = `EMP${String(nextNum).padStart(3, "0")}`;

    while (await Employee.findOne({ hospitalId, employeeId: candidate })) {
        nextNum++;
        candidate = `EMP${String(nextNum).padStart(3, "0")}`;
    }

    return candidate;
};

/**
 * Get the hospital for a user (HR or Admin).
 * For HR: derived from user.hospitalId.
 * For Admin: from Hospital.createdBy.
 */
const getHospitalForUser = async (user) => {
    if (!user) return null;

    if (user.role === "employee") {
        let hospitalId = user.hospitalId;
        if (!hospitalId && user.employeeId) {
            const emp = await Employee.findById(user.employeeId).select("hospitalId").lean();
            if (emp) hospitalId = emp.hospitalId;
        }
        if (!hospitalId) {
            const emp = await Employee.findOne({ userId: user.id || user._id }).select("hospitalId").lean();
            if (emp) hospitalId = emp.hospitalId;
        }
        if (!hospitalId) return null;
        return Hospital.findById(hospitalId).lean();
    }
    if (user.role === "admin" || user.role === "super_admin") {
        let hospital = await Hospital.findOne({ createdBy: user.id || user._id }).lean();
        if (!hospital && user.hospitalId) {
            hospital = await Hospital.findById(user.hospitalId).lean();
        }
        return hospital;
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
        const usersWithRole = await User.find({ role }).select("_id").lean();
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
            .populate("userId", "role status permissions modules")
            .populate("positionId", "name rosterEligible status")
            .populate("createdBy", "name email role")
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
        .populate("positionId", "name rosterEligible status")
        .populate("createdBy", "name email role")
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
    lastWorkingDay,
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

    let parsedLwd = null;
    if (lastWorkingDay) {
        parsedLwd = new Date(lastWorkingDay);
        if (isNaN(parsedLwd.getTime())) {
            const err = new Error("Invalid last working day date format.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
        if (dateOfJoining) {
            const dojDate = new Date(dateOfJoining);
            const dojMid = new Date(dojDate.getFullYear(), dojDate.getMonth(), dojDate.getDate()).getTime();
            const lwdMid = new Date(parsedLwd.getFullYear(), parsedLwd.getMonth(), parsedLwd.getDate()).getTime();
            if (lwdMid < dojMid) {
                const err = new Error("Last Working Day cannot be earlier than Date of Joining.");
                err.code = "VALIDATION_ERROR";
                throw err;
            }
        }
    }

    const employee = await Employee.create({
        employeeId: resolvedEmployeeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        lastWorkingDay: parsedLwd,
        positionId,
        employmentStatus: "ACTIVE",
        hospitalId,
        createdBy,
        userId: null,
    });

    return getEmployeeById({ employeeMongoId: employee._id, hospitalId });
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
    employeeId: providedEmployeeId,
}) => {
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!positionId) {
        const err = new Error("Position is required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    if (role && role !== "employee") {
        const err = new Error("Valid role is required (employee).");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

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

    // Validate position is active and belongs to this hospital
    const pos = await Position.findOne({ _id: positionId, hospitalId: hospital._id, status: 'active' });
    if (!pos) {
        const err = new Error("Selected position is invalid, inactive, or belongs to another hospital.");
        err.code = "INVALID_POSITION";
        throw err;
    }

    const invitation = await Invitation.create({
        hospitalId: hospital._id,
        employeeId: resolvedEmployeeId,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
        positionId,
        role: "employee",
        tokenHash,
        expiresAt,
        status: "pending",
        invitedBy,
        createdBy: invitedBy,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/invite/${rawToken}`;
    const fullName = `${invitation.firstName} ${invitation.lastName}`;

    const { text, html } = buildInvitationEmailTemplate({
        hospitalName: hospital.name,
        recipientName: fullName,
        inviterName: "",
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
        .populate("positionId", "name defaultModules");

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

    if (!password || String(password).length < 6) {
        const err = new Error("Password is required and must be at least 6 characters.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const email = String(invitation.email).trim().toLowerCase();
    const emailRegex = new RegExp(`^\\s*${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, "i");
    const hashedPassword = await hashPassword(password);

    // Derive modules from Position defaults
    const positionDefaultModules = invitation.positionId?.defaultModules || [];
    const moduleSet = new Set(["core", ...positionDefaultModules.filter(m => m !== "core")]);
    const userModules = Array.from(moduleSet);

    // 1. Get or Create User account (every employee gets a login)
    let user = await User.findOne({ email: emailRegex });

    if (user) {
        user.name = `${invitation.firstName} ${invitation.lastName}`.trim();
        user.email = email;
        if (invitation.phone) user.phone = invitation.phone;
        user.password = hashedPassword;
        user.role = invitation.role || user.role || "employee";
        user.hospitalId = invitation.hospitalId._id;
        user.status = "active";
        user.modules = userModules;
        await user.save();
    } else {
        try {
            user = await User.create({
                name: `${invitation.firstName} ${invitation.lastName}`.trim(),
                email,
                phone: invitation.phone,
                password: hashedPassword,
                role: invitation.role || "employee",
                hospitalId: invitation.hospitalId._id,
                status: "active",
                createdBy: invitation.invitedBy,
                modules: userModules,
                permissions: [],
            });
        } catch (createErr) {
            const isDup =
                createErr.code === 11000 ||
                createErr.name === "MongoServerError" ||
                createErr.errorResponse?.code === 11000 ||
                String(createErr.message || "").includes("E11000");

            if (isDup) {
                user = await User.findOne({ email: emailRegex });
                if (!user) {
                    const err = new Error("A user account with this email address already exists.");
                    err.code = "DUPLICATE_USER";
                    throw err;
                }
                user.name = `${invitation.firstName} ${invitation.lastName}`.trim();
                user.email = email;
                if (invitation.phone) user.phone = invitation.phone;
                user.password = hashedPassword;
                user.role = invitation.role || user.role || "employee";
                user.hospitalId = invitation.hospitalId._id;
                user.status = "active";
                user.modules = userModules;
                await user.save();
            } else {
                throw createErr;
            }
        }
    }

    // 2. Get or Create Employee record
    let employee = await Employee.findOne({
        hospitalId: invitation.hospitalId._id,
        email: emailRegex,
    });

    if (!employee && user.employeeId) {
        employee = await Employee.findById(user.employeeId);
    }

    if (employee) {
        employee.firstName = invitation.firstName;
        employee.lastName = invitation.lastName;
        employee.email = email;
        if (invitation.phone) employee.phone = invitation.phone;
        if (invitation.positionId) {
            employee.positionId = invitation.positionId._id || invitation.positionId;
        }
        employee.employmentStatus = "ACTIVE";
        employee.userId = user._id;
        await employee.save();
    } else {
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

        employee = await Employee.create({
            employeeId: resolvedEmployeeId,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            email,
            phone: invitation.phone,
            dateOfJoining: invitation.dateOfJoining,
            positionId: invitation.positionId?._id || invitation.positionId,
            employmentStatus: "ACTIVE",
            hospitalId: invitation.hospitalId._id,
            createdBy: invitation.invitedBy,
            userId: user._id,
        });
    }

    // Back-link Employee to User
    user.employeeId = employee._id;
    await user.save();

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
    currentUser,
    user,
    updates,
}) => {
    const employee = await Employee.findOne({
        _id: employeeMongoId,
        hospitalId,
    });

    if (!employee) return null;

    // Self-edit protection
    const authUser = currentUser || user;
    const currentUserId = (authUser?.id || authUser?._id || updatedBy)?.toString();
    const currentUserEmployeeId = authUser?.employeeId?.toString();
    const targetEmployeeId = employee._id.toString();
    const targetUserId = employee.userId ? employee.userId.toString() : null;

    if (
        (currentUserEmployeeId && currentUserEmployeeId === targetEmployeeId) ||
        (targetUserId && currentUserId && targetUserId === currentUserId) ||
        (currentUserId && targetEmployeeId === currentUserId)
    ) {
        const err = new Error("You cannot edit your own employee record.");
        err.code = "SELF_EDIT_FORBIDDEN";
        throw err;
    }

    const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "dateOfJoining",
        "lastWorkingDay",
        "positionId",
    ];

    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            if (field === "email") {
                const newEmail = String(updates.email).trim().toLowerCase();
                if (!EMAIL_REGEX.test(newEmail)) {
                    const err = new Error("Please enter a valid email address.");
                    err.code = "VALIDATION_ERROR";
                    throw err;
                }
                if (newEmail !== employee.email) {
                    const existingActiveEmp = await Employee.findOne({
                        hospitalId,
                        email: newEmail,
                        employmentStatus: "ACTIVE",
                        _id: { $ne: employee._id },
                    });
                    if (existingActiveEmp) {
                        const err = new Error("An active employee with this email already exists in this hospital.");
                        err.code = "DUPLICATE_EMAIL";
                        throw err;
                    }
                    if (employee.userId) {
                        const emailRegex = new RegExp(`^\\s*${newEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, "i");
                        const existingUser = await User.findOne({
                            email: emailRegex,
                            _id: { $ne: employee.userId },
                        });
                        if (existingUser) {
                            const err = new Error("A user account with this email address already exists.");
                            err.code = "DUPLICATE_USER";
                            throw err;
                        }
                    }
                    employee.email = newEmail;
                }
            } else if (field === "dateOfJoining") {
                employee.dateOfJoining = updates.dateOfJoining
                    ? new Date(updates.dateOfJoining)
                    : null;
            } else if (field === "lastWorkingDay") {
                if (updates.lastWorkingDay === null || updates.lastWorkingDay === "" || updates.lastWorkingDay === "null") {
                    employee.lastWorkingDay = null;
                } else {
                    const lwd = new Date(updates.lastWorkingDay);
                    if (isNaN(lwd.getTime())) {
                        const err = new Error("Invalid last working day date format.");
                        err.code = "VALIDATION_ERROR";
                        throw err;
                    }
                    const effectiveDoj = updates.dateOfJoining !== undefined
                        ? (updates.dateOfJoining ? new Date(updates.dateOfJoining) : null)
                        : employee.dateOfJoining;
                    if (effectiveDoj) {
                        const dojDate = new Date(effectiveDoj);
                        const dojMid = new Date(dojDate.getFullYear(), dojDate.getMonth(), dojDate.getDate()).getTime();
                        const lwdMid = new Date(lwd.getFullYear(), lwd.getMonth(), lwd.getDate()).getTime();
                        if (lwdMid < dojMid) {
                            const err = new Error("Last Working Day cannot be earlier than Date of Joining.");
                            err.code = "VALIDATION_ERROR";
                            throw err;
                        }
                    }
                    employee.lastWorkingDay = lwd;
                }
            } else if (field === "positionId") {
                const { hasPermission } = require("../config/rolePermissions");
                const { PERMISSIONS } = require("../config/permissions");
                
                if (!hasPermission(user, PERMISSIONS.EMPLOYEE_POSITION_UPDATE)) {
                    const err = new Error("You do not have permission to change employee positions.");
                    err.code = "UNAUTHORIZED_POSITION_UPDATE";
                    throw err;
                }

                if (String(employee.positionId || '') !== String(updates.positionId)) {
                    const pos = await Position.findOne({ _id: updates.positionId, hospitalId, status: 'active' });
                    if (!pos) {
                        const err = new Error("Selected position is invalid, inactive, or belongs to another hospital.");
                        err.code = "INVALID_POSITION";
                        throw err;
                    }
                    employee.positionId = updates.positionId;
                }
            } else {
                employee[field] = updates[field];
            }
        }
    }

    employee.updatedBy = updatedBy;
    await employee.save();

    if (employee.userId && employee.email) {
        await User.updateOne(
            { _id: employee.userId },
            { email: employee.email, name: `${employee.firstName} ${employee.lastName}`.trim() }
        );
    }

    return getEmployeeById({ employeeMongoId: employee._id, hospitalId });
};

// ─── Update Employee Status ───────────────────────────────────────────────────

const updateEmployeeStatus = async ({
    employeeMongoId,
    hospitalId,
    updatedBy,
    currentUser,
    status,
}) => {
    const employee = await Employee.findOne({
        _id: employeeMongoId,
        hospitalId,
    });

    if (!employee) return null;

    // Self-status protection
    const currentUserId = (currentUser?.id || currentUser?._id || updatedBy)?.toString();
    const currentUserEmployeeId = currentUser?.employeeId?.toString();
    const targetEmployeeId = employee._id.toString();
    const targetUserId = employee.userId ? employee.userId.toString() : null;

    if (
        (currentUserEmployeeId && currentUserEmployeeId === targetEmployeeId) ||
        (targetUserId && currentUserId && targetUserId === currentUserId) ||
        (currentUserId && targetEmployeeId === currentUserId)
    ) {
        const err = new Error("You cannot change your own employment status.");
        err.code = "SELF_STATUS_CHANGE_FORBIDDEN";
        throw err;
    }

    employee.employmentStatus = status;
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
        .populate("invitedBy", "name email role")
        .populate("createdBy", "name email role")
        .populate("positionId", "name")
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
