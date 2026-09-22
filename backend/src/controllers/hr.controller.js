const User = require("../models/user.model");
const Employee = require("../models/employee.model");
const Hospital = require("../models/hospital.model");
const { isValidObjectId } = require("../utils/validate");
const { VALID_MODULE_KEYS } = require("../config/modules.config");
const hrService = require("../services/hr.service");

const getMyProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Auto-heal HRMS module access for HR user if missing
        let userUpdated = false;
        if (user.role === "hr" && (!user.modules || !user.modules.includes("hrms"))) {
            user.modules = [...new Set([...(user.modules || ["core"]), "hrms"])];
            userUpdated = true;
        }

        // Resolve Employee record
        let employee = null;
        if (user.employeeId) {
            employee = await Employee.findById(user.employeeId)
                .populate("positionId", "name")
                .populate("hospitalId");
        }
        if (!employee) {
            employee = await Employee.findOne({ userId: user._id })
                .populate("positionId", "name")
                .populate("hospitalId");
            if (employee) {
                user.employeeId = employee._id;
                userUpdated = true;
            }
        }

        if (employee && (!employee.userId || employee.userId.toString() !== user._id.toString())) {
            employee.userId = user._id;
            await employee.save();
        }

        if (userUpdated) {
            await user.save();
        }

        if (!employee && user.role === "hr") {
            return res.status(404).json({
                success: false,
                message: "No employee profile is associated with this account.",
            });
        }

        // Resolve hospital from employee first, fallback to user.hospitalId
        let hospital = employee?.hospitalId || null;
        if (!hospital && user.hospitalId) {
            hospital = await Hospital.findById(user.hospitalId);
        }

        const fullName = employee
            ? `${employee.firstName} ${employee.lastName}`.trim()
            : user.name;

        return res.status(200).json({
            success: true,
            message: "HR profile retrieved successfully",
            data: {
                id: user._id,
                _id: user._id,
                name: fullName,
                firstName: employee?.firstName || user.name?.split(" ")[0] || "",
                lastName: employee?.lastName || user.name?.split(" ").slice(1).join(" ") || "",
                email: employee?.email || user.email,
                phone: employee?.phone || user.phone,
                role: user.role,
                employeeId: employee?.employeeId || null,
                employeeMongoId: employee?._id || user.employeeId || null,
                position: employee?.positionId?.name || null,
                positionId: employee?.positionId?._id || employee?.positionId || null,
                hospitalId: hospital,
                hospitalName: hospital?.name || null,
                status: employee?.employmentStatus?.toLowerCase() || user.status,
                employmentStatus: employee?.employmentStatus || "ACTIVE",
                dateOfJoining: employee?.dateOfJoining || null,
                modules: user.modules || ["core"],
                permissions: user.permissions || [],
                createdAt: employee?.createdAt || user.createdAt,
                updatedAt: employee?.updatedAt || user.updatedAt,
            },
        });
    } catch (error) {
        console.error("Get My Profile Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getHRHospital = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        let hospitalId = req.user.hospitalId;
        if (!hospitalId && req.user.employeeId) {
            const employee = await Employee.findById(req.user.employeeId).select("hospitalId");
            if (employee) hospitalId = employee.hospitalId;
        }
        if (!hospitalId) {
            const employee = await Employee.findOne({ userId: req.user.id }).select("hospitalId");
            if (employee) hospitalId = employee.hospitalId;
        }

        if (!hospitalId) {
            return res.status(404).json({
                success: false,
                message: "No hospital is assigned to this employee.",
            });
        }

        const hospital = await Hospital.findById(hospitalId).populate("createdBy", "name email phone role status");
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
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getHRById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid HR profile id" });
        }

        let hrUser = await User.findById(id);
        let employee = null;

        if (hrUser) {
            if (hrUser.employeeId) {
                employee = await Employee.findById(hrUser.employeeId)
                    .populate("positionId", "name")
                    .populate("hospitalId");
            } else {
                employee = await Employee.findOne({ userId: hrUser._id })
                    .populate("positionId", "name")
                    .populate("hospitalId");
            }
        } else {
            employee = await Employee.findById(id)
                .populate("positionId", "name")
                .populate("hospitalId");
            if (employee && employee.userId) {
                hrUser = await User.findById(employee.userId);
            }
        }

        if (!hrUser && !employee) {
            return res.status(404).json({ success: false, message: "HR profile not found" });
        }

        const hospital = employee?.hospitalId || (hrUser?.hospitalId ? await Hospital.findById(hrUser.hospitalId) : null);

        if (req.user.role === "admin") {
            const adminHospital = await hrService.getAdminHospital(req.user.id);
            const targetHospitalId = hospital?._id || employee?.hospitalId?._id || hrUser?.hospitalId;
            if (!adminHospital || !targetHospitalId || targetHospitalId.toString() !== adminHospital._id.toString()) {
                return res.status(403).json({ success: false, message: "You can only view HR profiles in your hospital" });
            }
        }

        const fullName = employee
            ? `${employee.firstName} ${employee.lastName}`.trim()
            : hrUser?.name;

        return res.status(200).json({
            success: true,
            message: "HR profile retrieved successfully",
            data: {
                id: hrUser?._id || employee?._id,
                _id: hrUser?._id || employee?._id,
                name: fullName,
                firstName: employee?.firstName,
                lastName: employee?.lastName,
                email: employee?.email || hrUser?.email,
                phone: employee?.phone || hrUser?.phone,
                role: hrUser?.role || "hr",
                employeeId: employee?.employeeId || null,
                employeeMongoId: employee?._id || null,
                position: employee?.positionId?.name || null,
                positionId: employee?.positionId?._id || employee?.positionId || null,
                hospitalId: hospital,
                hospitalName: hospital?.name || null,
                status: employee?.employmentStatus?.toLowerCase() || hrUser?.status || "active",
                employmentStatus: employee?.employmentStatus || "ACTIVE",
                dateOfJoining: employee?.dateOfJoining || null,
                modules: hrUser?.modules || ["core"],
                permissions: hrUser?.permissions || [],
                createdAt: employee?.createdAt || hrUser?.createdAt,
                updatedAt: employee?.updatedAt || hrUser?.updatedAt,
            },
        });
    } catch (error) {
        console.error("Get HR By ID Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getHRPermissions = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({ success: false, message: "Only admins can view HR permissions" });
        }

        const { hrId } = req.params;
        if (!isValidObjectId(hrId)) {
            return res.status(400).json({ success: false, message: "Invalid HR profile id" });
        }

        const hrUser = await User.findById(hrId);
        if (!hrUser || hrUser.role !== "hr") {
            return res.status(404).json({ success: false, message: "HR profile not found" });
        }

        if (req.user.role === "admin") {
            const hospital = await hrService.getAdminHospital(req.user.id);
            if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
                return res.status(403).json({ success: false, message: "You can only view permissions for HR in your hospital" });
            }
        }

        return res.status(200).json({ success: true, message: "Permissions retrieved successfully", data: { permissions: hrUser.permissions || [] } });
    } catch (error) {
        console.error("Get HR Permissions Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateHRPermissions = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can update HR permissions" });
        }

        const { hrId } = req.params;
        const { permissions } = req.body;

        if (!isValidObjectId(hrId)) {
            return res.status(400).json({ success: false, message: "Invalid HR profile id" });
        }

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, message: "Permissions must be an array" });
        }

        const hrUser = await User.findById(hrId);
        if (!hrUser || hrUser.role !== "hr") {
            return res.status(404).json({ success: false, message: "HR profile not found" });
        }

        const hospital = await hrService.getAdminHospital(req.user.id);
        if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
            return res.status(403).json({ success: false, message: "You can only update permissions for HR in your hospital" });
        }

        const { PERMISSIONS } = require("../config/permissions");
        const VALID_HR_PERMISSIONS = Object.values(PERMISSIONS);
        const invalidPermissions = permissions.filter((p) => !VALID_HR_PERMISSIONS.includes(p));
        if (invalidPermissions.length > 0) {
            return res.status(400).json({ success: false, message: `Invalid permissions provided: ${invalidPermissions.join(', ')}` });
        }

        hrUser.permissions = permissions;
        await hrUser.save();

        return res.status(200).json({ success: true, message: "HR permissions updated successfully", data: { permissions: hrUser.permissions } });
    } catch (error) {
        console.error("Update HR Permissions Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getHRModules = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({ success: false, message: "Only admins can view HR modules" });
        }

        const { id } = req.params;
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid HR profile id" });
        }

        const hrUser = await User.findById(id);
        if (!hrUser || hrUser.role !== "hr") {
            return res.status(404).json({ success: false, message: "HR profile not found" });
        }

        if (req.user.role === "admin") {
            const hospital = await hrService.getAdminHospital(req.user.id);
            if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
                return res.status(403).json({ success: false, message: "You can only view modules for HR in your hospital" });
            }
        }

        return res.status(200).json({ success: true, message: "Modules retrieved successfully", data: { modules: hrUser.modules || ["core"] } });
    } catch (error) {
        console.error("Get HR Modules Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateHRModules = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can update HR modules" });
        }

        const { id } = req.params;
        const { modules } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid HR profile id" });
        }

        if (!Array.isArray(modules)) {
            return res.status(400).json({ success: false, message: "Modules must be an array" });
        }

        const invalidModules = modules.filter(m => m !== 'core' && !VALID_MODULE_KEYS.includes(m));
        if (invalidModules.length > 0) {
            return res.status(400).json({ success: false, message: `Invalid modules provided: ${invalidModules.join(', ')}` });
        }

        const hrUser = await User.findById(id);
        if (!hrUser || hrUser.role !== "hr") {
            return res.status(404).json({ success: false, message: "HR profile not found" });
        }

        const hospital = await hrService.getAdminHospital(req.user.id);
        if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
            return res.status(403).json({ success: false, message: "You can only update modules for HR in your hospital" });
        }

        const finalModules = [...new Set(["core", ...modules])];
        hrUser.modules = finalModules;
        await hrUser.save();

        return res.status(200).json({ success: true, message: "HR modules updated successfully", data: { modules: hrUser.modules } });
    } catch (error) {
        console.error("Update HR Modules Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    getMyProfile,
    getHRHospital,
    getHRById,
    getHRPermissions,
    updateHRPermissions,
    getHRModules,
    updateHRModules,
};
