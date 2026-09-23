const mongoose = require("mongoose");
const User = require("../models/user.model");
const Employee = require("../models/employee.model");
const Hospital = require("../models/hospital.model");
const { PERMISSIONS } = require("../config/permissions");
const { VALID_MODULE_KEYS } = require("../config/modules.config");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getAdminHospitalId = async (user) => {
    if (user.hospitalId) return user.hospitalId;
    const userId = user.id || user._id;
    let hospital = await Hospital.findOne({ createdBy: userId }).select("_id").lean();
    if (!hospital) {
        hospital = await Hospital.findOne({ adminId: userId }).select("_id").lean();
    }
    return hospital ? hospital._id : null;
};

/**
 * GET /api/v1/access-management/users
 * Lists workforce users in the authenticated hospital for access control.
 */
const listWorkforceAccess = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({ success: false, message: "Only administrators can manage access" });
        }

        const hospitalId = await getAdminHospitalId(req.user);
        if (!hospitalId && req.user.role !== "super_admin") {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const query = {
            role: "employee",
        };
        
        let employeeMap = new Map();
        if (hospitalId) {
            const employeesInHospital = await Employee.find({ hospitalId })
                .populate("positionId", "name")
                .lean();
            
            const linkedUserIds = [];
            employeesInHospital.forEach((emp) => {
                if (emp.userId) {
                    linkedUserIds.push(emp.userId);
                    employeeMap.set(emp.userId.toString(), emp);
                }
                if (emp._id) {
                    employeeMap.set(emp._id.toString(), emp);
                }
            });

            query.$or = [
                { hospitalId: hospitalId },
                { _id: { $in: linkedUserIds } },
            ];
        }

        const users = await User.find(query)
            .select("name email phone role status permissions modules employeeId hospitalId createdAt")
            .populate({
                path: "employeeId",
                select: "employeeId positionId employmentStatus dateOfJoining",
                populate: {
                    path: "positionId",
                    select: "name",
                },
            })
            .sort({ createdAt: -1 })
            .lean();

        const formatted = users.map((u) => {
            const emp = (u.employeeId && u.employeeId._id) 
                ? u.employeeId 
                : (employeeMap.get(u._id.toString()) || null);

            return {
                id: u._id,
                name: u.name,
                email: u.email,
                phone: u.phone,
                role: u.role,
                status: u.status,
                modules: u.modules || ["core"],
                permissions: u.permissions || [],
                employeeRecordId: emp?._id || null,
                employeeCode: emp?.employeeId || null,
                positionName: emp?.positionId?.name || null,
                employmentStatus: emp?.employmentStatus || (u.status === "active" ? "ACTIVE" : "INACTIVE"),
                dateOfJoining: emp?.dateOfJoining || null,
            };
        });

        return res.status(200).json({
            success: true,
            message: "Workforce access list retrieved successfully",
            data: formatted,
        });
    } catch (error) {
        console.error("List Workforce Access Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * GET /api/v1/access-management/:userId
 * Retrieves module access and permissions for a specific user.
 */
const getUserAccess = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({ success: false, message: "Only administrators can view access settings" });
        }

        const { userId } = req.params;
        if (!isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        const targetUser = await User.findById(userId)
            .select("name email role status permissions modules hospitalId employeeId")
            .populate({
                path: "employeeId",
                select: "employeeId positionId",
                populate: { path: "positionId", select: "name" },
            })
            .lean();

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (req.user.role === "admin") {
            const hospitalId = await getAdminHospitalId(req.user);
            if (!hospitalId || !targetUser.hospitalId || targetUser.hospitalId.toString() !== hospitalId.toString()) {
                return res.status(403).json({ success: false, message: "You can only view access for users in your hospital" });
            }
        }

        return res.status(200).json({
            success: true,
            message: "User access retrieved successfully",
            data: {
                id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
                positionName: targetUser.employeeId?.positionId?.name || null,
                modules: targetUser.modules || ["core"],
                permissions: targetUser.permissions || [],
            },
        });
    } catch (error) {
        console.error("Get User Access Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

/**
 * PATCH /api/v1/access-management/:userId
 * Updates module access and permissions for any workforce user with privilege escalation protection.
 */
const updateUserAccess = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only administrators can update user access" });
        }

        const { userId } = req.params;
        const { permissions, modules } = req.body;

        if (!isValidObjectId(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        // Prevent self-modification
        if (req.user.id && req.user.id.toString() === userId.toString()) {
            return res.status(403).json({ success: false, message: "Administrators cannot modify their own permissions" });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Prevent modifying protected system roles
        if (targetUser.role === "admin" || targetUser.role === "super_admin") {
            return res.status(403).json({ success: false, message: "Cannot modify permissions for administrative accounts" });
        }

        const hospitalId = await getAdminHospitalId(req.user);
        if (!hospitalId || !targetUser.hospitalId || targetUser.hospitalId.toString() !== hospitalId.toString()) {
            return res.status(403).json({ success: false, message: "You can only update access for users in your hospital" });
        }

        if (permissions !== undefined) {
            if (!Array.isArray(permissions)) {
                return res.status(400).json({ success: false, message: "Permissions must be an array" });
            }
            const validPermissionValues = Object.values(PERMISSIONS);
            const invalidPermissions = permissions.filter((p) => !validPermissionValues.includes(p));
            if (invalidPermissions.length > 0) {
                return res.status(400).json({ success: false, message: `Invalid permissions provided: ${invalidPermissions.join(", ")}` });
            }
            targetUser.permissions = [...new Set(permissions)];
        }

        if (modules !== undefined) {
            if (!Array.isArray(modules)) {
                return res.status(400).json({ success: false, message: "Modules must be an array" });
            }
            const invalidModules = modules.filter((m) => m !== "core" && !VALID_MODULE_KEYS.includes(m));
            if (invalidModules.length > 0) {
                return res.status(400).json({ success: false, message: `Invalid modules provided: ${invalidModules.join(", ")}` });
            }
            targetUser.modules = [...new Set(["core", ...modules])];
        }

        await targetUser.save();

        return res.status(200).json({
            success: true,
            message: "User access updated successfully",
            data: {
                id: targetUser._id,
                permissions: targetUser.permissions,
                modules: targetUser.modules,
            },
        });
    } catch (error) {
        console.error("Update User Access Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    listWorkforceAccess,
    getUserAccess,
    updateUserAccess,
};
