const authService = require("../services/auth.service");
const Employee = require("../models/employee.model");
const Hospital = require("../models/hospital.model");
const Position = require("../models/position.model");

const getCurrentUser = async (req, res) => {
    try {
        const user = await authService.getCurrentUser(req.user.id);

        let userUpdated = false;
        let hospitalId = user.hospitalId;
        let employeeId = user.employeeId;
        let employeeRecord = null;

        if (user.role === "employee") {
            employeeRecord = employeeId ? await Employee.findById(employeeId).populate("positionId", "name").lean() : null;
            if (!employeeRecord) {
                employeeRecord = await Employee.findOne({ userId: user._id }).populate("positionId", "name").lean();
                if (employeeRecord) {
                    employeeId = employeeRecord._id;
                    user.employeeId = employeeRecord._id;
                    userUpdated = true;
                }
            }
            if (employeeRecord && employeeRecord.hospitalId) {
                hospitalId = employeeRecord.hospitalId;
                if (!user.hospitalId) {
                    user.hospitalId = employeeRecord.hospitalId;
                    userUpdated = true;
                }
            }
        }

        if (!hospitalId && (user.role === "admin" || user.role === "super_admin")) {
            const hosp = await Hospital.findOne({ createdBy: user._id }).select("_id name code").lean();
            if (hosp) {
                hospitalId = hosp._id;
            }
        }

        if (userUpdated) {
            await user.save();
        }

        let hospitalName = null;
        if (hospitalId) {
            const hosp = await Hospital.findById(hospitalId).select("name code").lean();
            if (hosp) hospitalName = hosp.name;
        }

        const positionName = employeeRecord?.positionId?.name || null;

        return res.status(200).json({
            success: true,
            message: "Current user retrieved successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                hospitalId: hospitalId,
                hospitalName: hospitalName,
                employeeId: employeeId,
                positionName: positionName,
                status: user.status,
                permissions: user.permissions || [],
                modules: user.modules || ["core"],
            },
        });
    } catch (error) {
        if (error.code === "NOT_FOUND" || error.code === "UNAUTHORIZED") {
            return res.status(401).json({ success: false, message: error.message });
        }
        if (error.code === "INACTIVE") {
            return res.status(403).json({ success: false, message: error.message });
        }
        console.error("Get Current User Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password || !String(name).trim() || !String(email).trim() || !String(password).trim()) {
            return res.status(400).json({ success: false, message: "Name, email and password are required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(email).trim().toLowerCase())) {
            return res.status(400).json({ success: false, message: "Please enter a valid email address" });
        }

        if (String(password).length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        const user = await authService.registerUser({ name, email, phone, password });

        return res.status(201).json({
            success: true,
            message: "Admin registered successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        if (error.code === "DUPLICATE_EMAIL" || (error && error.code === 11000)) {
            return res.status(409).json({ success: false, message: "Email already registered" });
        }
        console.error("Register User Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || !String(email).trim() || !String(password).trim()) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const { token, user } = await authService.loginUser({ email, password });

        let userUpdated = false;
        let hospitalId = user.hospitalId;
        let employeeId = user.employeeId;

        if (user.role === "employee") {
            let employee = employeeId ? await Employee.findById(employeeId).lean() : null;
            if (!employee) {
                employee = await Employee.findOne({ userId: user._id }).lean();
                if (employee) {
                    employeeId = employee._id;
                    user.employeeId = employee._id;
                    userUpdated = true;
                }
            }
            if (employee && employee.hospitalId) {
                hospitalId = employee.hospitalId;
                if (!user.hospitalId) {
                    user.hospitalId = employee.hospitalId;
                    userUpdated = true;
                }
            }
        }

        if (userUpdated) {
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    hospitalId: hospitalId,
                    employeeId: employeeId,
                    status: user.status,
                    permissions: user.permissions || [],
                    modules: user.modules || ["core"],
                },
            },
        });
    } catch (error) {
        if (error.code === "UNAUTHORIZED") {
            return res.status(401).json({ success: false, message: error.message });
        }
        if (error.code === "INACTIVE") {
            return res.status(403).json({ success: false, message: error.message });
        }
        console.error("Login User Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const logoutUser = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, message: "Authorization header is required" });
        }
        const [bearer, token] = authHeader.split(" ");
        if (bearer !== "Bearer" || !token) {
            return res.status(401).json({ success: false, message: "Invalid token format" });
        }

        await authService.logoutUser(token);
        return res.status(200).json({ success: true, message: "Logout successful" });
    } catch (error) {
        console.error("Logout User Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !String(email).trim()) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const result = await authService.forgotPassword(email);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ success: false, message: "Token and new password are required" });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        await authService.resetPassword(token, password);
        return res.status(200).json({ success: true, message: "Password reset successfully. You can now login with your new password." });
    } catch (error) {
        if (error.code === "INVALID_TOKEN") {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("Reset Password Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current password and new password are required" });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
        }

        await authService.changePassword(req.user.id, currentPassword, newPassword);
        return res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        if (error.code === "NOT_FOUND" || error.code === "PASSWORD_MISMATCH") {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("Change Password Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;

        const user = await authService.updateProfile(req.user.id, name, phone);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                status: user.status,
                hospitalId: user.hospitalId,
                permissions: user.permissions || [],
            },
        });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.code === "INVALID_INPUT") {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("Update Profile Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
};