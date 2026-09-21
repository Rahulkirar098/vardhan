const User = require("../models/user.model");
const { isValidObjectId } = require("../utils/validate");
const { VALID_MODULE_KEYS } = require("../config/modules.config");
const hrService = require("../services/hr.service");

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

        const VALID_HR_PERMISSIONS = ["structure.view", "structure.create", "structure.update", "structure.delete"];
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
    getHRPermissions,
    updateHRPermissions,
    getHRModules,
    updateHRModules,
};
