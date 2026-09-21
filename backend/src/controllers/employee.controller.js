const { isValidObjectId } = require("../utils/validate");
const employeeService = require("../services/employee.service");

// ─── List Employees ──────────────────────────────────────────────────────────

const listEmployees = async (req, res) => {
    try {
        const { search, status, page, limit, role } = req.query;

        const result = await employeeService.listEmployees({
            hospitalId: req.user.hospitalId,
            search,
            status,
            role,
            page: page || 1,
            limit: limit || 20,
        });

        return res.status(200).json({
            success: true,
            message: "Employees retrieved successfully",
            data: result,
        });
    } catch (error) {
        console.error("List Employees Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

// ─── Get Employee by ID ──────────────────────────────────────────────────────

const getEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        const employee = await employeeService.getEmployeeById({
            employeeMongoId: id,
            hospitalId: req.user.hospitalId,
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Employee retrieved successfully",
            data: employee,
        });
    } catch (error) {
        console.error("Get Employee Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Invite Employee ─────────────────────────────────────────────────────────

const inviteEmployee = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, dateOfJoining, positionId, employeeId, role, createLogin, modules, permissions } = req.body;

        if (!firstName || !String(firstName).trim()) {
            return res.status(400).json({ success: false, message: "First name is required" });
        }
        if (!lastName || !String(lastName).trim()) {
            return res.status(400).json({ success: false, message: "Last name is required" });
        }
        if (!email || !String(email).trim()) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        if (!employeeService.EMAIL_REGEX.test(String(email).trim())) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address" });
        }

        const hospital = await employeeService.getHospitalForUser(req.user);

        if (!hospital) {
            return res.status(400).json({
                success: false,
                message: "No hospital found for this user",
            });
        }

        try {
            const { invitation } = await employeeService.inviteEmployee({
                hospital,
                invitedBy: req.user.id,
                firstName,
                lastName,
                email,
                phone,
                dateOfJoining,
                positionId,
                role,
                createLogin,
                employeeId,
                modules,
                permissions,
            });

            return res.status(201).json({
                success: true,
                message: "Employee invitation sent successfully",
                data: {
                    id: invitation._id,
                    employeeId: invitation.employeeId,
                    firstName: invitation.firstName,
                    lastName: invitation.lastName,
                    email: invitation.email,
                    status: invitation.status,
                    expiresAt: invitation.expiresAt,
                },
            });
        } catch (serviceError) {
            if (serviceError.code === "DUPLICATE_EMPLOYEE") {
                return res.status(409).json({
                    success: false,
                    message: serviceError.message,
                });
            }
            if (serviceError.code === "DUPLICATE_INVITATION") {
                return res.status(409).json({
                    success: false,
                    message: serviceError.message,
                });
            }

            const msg = String(serviceError?.message || "");
            if (
                msg.includes("SMTP configuration is missing") ||
                msg.includes("SMTP configuration is invalid") ||
                msg.includes("placeholder values") ||
                msg.includes("ENOTFOUND")
            ) {
                return res.status(503).json({
                    success: false,
                    message: "Email service is not configured. Please update backend/.env with valid SMTP credentials.",
                });
            }

            throw serviceError;
        }
    } catch (error) {
        console.error("Invite Employee Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Get Invitation by Token (public) ────────────────────────────────────────

const getInvitationByToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required" });
        }

        const invitation = await employeeService.getInvitationByToken(token);

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
                firstName: invitation.firstName,
                lastName: invitation.lastName,
                email: invitation.email,
                phone: invitation.phone,
                position: invitation.positionId?.name || null,
                hospitalName: invitation.hospitalId?.name || "Hospital",
                createLogin: invitation.createLogin,
                expiresAt: invitation.expiresAt,
            },
        });
    } catch (error) {
        console.error("Get Invitation By Token Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Accept Invitation (public) ───────────────────────────────────────────────

const acceptInvitation = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required" });
        }

        const { password } = req.body;

        try {
            const employee = await employeeService.acceptInvitation(token, password);

            return res.status(200).json({
                success: true,
                message: "Employee onboarding completed successfully",
                data: {
                    id: employee._id,
                    employeeId: employee.employeeId,
                    firstName: employee.firstName,
                    lastName: employee.lastName,
                    email: employee.email,
                    position: employee.positionId?.name || null,
                    employmentStatus: employee.employmentStatus,
                },
            });
        } catch (serviceError) {
            if (
                serviceError.code === "INVALID_INVITATION" ||
                serviceError.code === "EXPIRED_INVITATION"
            ) {
                return res.status(400).json({
                    success: false,
                    message: serviceError.message,
                });
            }
            throw serviceError;
        }
    } catch (error) {
        console.error("Accept Employee Invitation Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Update Employee ─────────────────────────────────────────────────────────

const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid employee id" });
        }

        const { firstName, lastName, email, phone, dateOfJoining, positionId } = req.body;

        if (email && !employeeService.EMAIL_REGEX.test(String(email).trim())) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        const employee = await employeeService.updateEmployee({
            employeeMongoId: id,
            hospitalId: req.user.hospitalId,
            updatedBy: req.user.id,
            updates: { firstName, lastName, email, phone, dateOfJoining, positionId },
        });

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            data: employee,
        });
    } catch (error) {
        console.error("Update Employee Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Update Employee Status (Activate/Deactivate) ────────────────────────────

const updateEmployeeStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid employee id" });
        }

        const { status } = req.body;

        if (!status || !["ACTIVE", "INACTIVE"].includes(String(status).toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "status must be ACTIVE or INACTIVE",
            });
        }

        const employee = await employeeService.updateEmployeeStatus({
            employeeMongoId: id,
            hospitalId: req.user.hospitalId,
            updatedBy: req.user.id,
            status: String(status).toUpperCase(),
        });

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        const action = employee.employmentStatus === "ACTIVE" ? "activated" : "deactivated";

        return res.status(200).json({
            success: true,
            message: `Employee ${action} successfully`,
            data: {
                id: employee._id,
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                employmentStatus: employee.employmentStatus,
                leavingDate: employee.leavingDate,
            },
        });
    } catch (error) {
        console.error("Update Employee Status Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── List Invitations ─────────────────────────────────────────────────────────

const listInvitations = async (req, res) => {
    try {
        const invitations = await employeeService.listInvitations(req.user.hospitalId);

        return res.status(200).json({
            success: true,
            message: "Invitations retrieved successfully",
            data: invitations,
        });
    } catch (error) {
        console.error("List Employee Invitations Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Cancel Invitation ────────────────────────────────────────────────────────

const cancelInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;

        if (!isValidObjectId(invitationId)) {
            return res.status(400).json({ success: false, message: "Invalid invitation id" });
        }

        try {
            const invitation = await employeeService.cancelInvitation({
                invitationId,
                hospitalId: req.user.hospitalId,
            });

            if (!invitation) {
                return res.status(404).json({ success: false, message: "Invitation not found" });
            }

            return res.status(200).json({
                success: true,
                message: "Invitation cancelled successfully",
            });
        } catch (serviceError) {
            if (serviceError.code === "NOT_CANCELLABLE") {
                return res.status(400).json({ success: false, message: serviceError.message });
            }
            throw serviceError;
        }
    } catch (error) {
        console.error("Cancel Employee Invitation Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Resend Invitation ────────────────────────────────────────────────────────

const resendInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;

        if (!isValidObjectId(invitationId)) {
            return res.status(400).json({ success: false, message: "Invalid invitation id" });
        }

        try {
            await employeeService.resendInvitation({
                invitationId,
                hospitalId: req.user.hospitalId,
            });

            return res.status(200).json({
                success: true,
                message: "Invitation resent successfully",
            });
        } catch (serviceError) {
            return res.status(400).json({ success: false, message: serviceError.message });
        }
    } catch (error) {
        console.error("Resend Employee Invitation Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── Employee Stats ───────────────────────────────────────────────────────────

const getEmployeeStats = async (req, res) => {
    try {
        const stats = await employeeService.getEmployeeStats(req.user.hospitalId);

        return res.status(200).json({
            success: true,
            message: "Employee stats retrieved successfully",
            data: stats,
        });
    } catch (error) {
        console.error("Get Employee Stats Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    listEmployees,
    getEmployee,
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
